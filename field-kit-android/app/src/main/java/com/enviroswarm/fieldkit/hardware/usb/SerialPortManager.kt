package com.enviroswarm.fieldkit.hardware.usb

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import com.hoho.android.usbserial.driver.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import timber.log.Timber
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Sealed class representing the connection state of a USB serial port.
 */
sealed class SerialConnectionState {
    object Disconnected : SerialConnectionState()
    object Connecting : SerialConnectionState()
    data class Connected(val device: UsbDevice, val port: Int) : SerialConnectionState()
    data class Error(val message: String, val cause: Throwable? = null) : SerialConnectionState()
}

/**
 * Data class representing a serial read event with raw bytes and metadata.
 *
 * @property data Raw bytes read from the serial port
 * @property timestamp Unix timestamp (ms) of the read
 * @property deviceId USB device ID
 */
data class SerialReadEvent(
    val data: ByteArray,
    val timestamp: Long = System.currentTimeMillis(),
    val deviceId: Int = -1
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as SerialReadEvent
        return timestamp == other.timestamp &&
                deviceId == other.deviceId &&
                data.contentEquals(other.data)
    }

    override fun hashCode(): Int {
        var result = data.contentHashCode()
        result = 31 * result + timestamp.hashCode()
        result = 31 * result + deviceId
        return result
    }
}

/**
 * Configuration for a serial port connection.
 *
 * @property baudRate Serial baud rate (default 9600)
 * @property dataBits Number of data bits (5-8, default 8)
 * @property stopBits Number of stop bits (1-2, default 1)
 * @property parity Parity setting (default NONE)
 */
data class SerialConfig(
    val baudRate: Int = 9600,
    val dataBits: Int = 8,
    val stopBits: Int = 1,
    val parity: Int = UsbSerialPort.PARITY_NONE
)

/**
 * Manager for USB serial port communication with pollution sensors.
 *
 * Handles USB device enumeration, permission requests, port opening/closing,
 * background reading, and error recovery. Supports multiple common USB-to-UART
 * bridge chips (FTDI, CP2102, CH340, Prolific, CDC ACM).
 *
 * Usage:
 * ```kotlin
 * val manager = SerialPortManager(context)
 * manager.connectionState.collect { state -> /* observe state */ }
 * manager.dataFlow.collect { event -> /* process bytes */ }
 * manager.connect(device, SerialConfig(baudRate = 9600))
 * manager.write(commandBytes)
 * manager.disconnect()
 * ```
 */
class SerialPortManager(private val context: Context) {

    companion object {
        private const val ACTION_USB_PERMISSION = "com.enviroswarm.fieldkit.USB_PERMISSION"
        private const val READ_TIMEOUT_MS = 2000
        private const val READ_BUFFER_SIZE = 4096
        private const val RECONNECT_DELAY_MS = 3000L
    }

    private val usbManager: UsbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private val driverManager: UsbSerialProber = UsbSerialProber.getDefaultProber()

    private var currentDriver: UsbSerialDriver? = null
    private var currentPort: UsbSerialPort? = null
    private var readJob: Job? = null
    private val isReading = AtomicBoolean(false)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _connectionState = MutableStateFlow<SerialConnectionState>(SerialConnectionState.Disconnected)
    val connectionState: StateFlow<SerialConnectionState> = _connectionState.asStateFlow()

    private val _dataFlow = MutableSharedFlow<SerialReadEvent>(extraBufferCapacity = 64)
    val dataFlow: SharedFlow<SerialReadEvent> = _dataFlow.asSharedFlow()

    private val permissionFlow = MutableSharedFlow<Boolean>(extraBufferCapacity = 1)

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                    Timber.d("USB permission for %s: %b", device?.deviceName, granted)
                    permissionFlow.tryEmit(granted)
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    Timber.d("USB device attached: %s", device?.deviceName)
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    if (device?.deviceId == currentDriver?.device?.deviceId) {
                        Timber.w("Current USB device detached: %s", device.deviceName)
                        disconnect()
                    }
                }
            }
        }
    }

    init {
        val filter = IntentFilter().apply {
            addAction(ACTION_USB_PERMISSION)
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        context.registerReceiver(usbReceiver, filter)
    }

    /**
     * Enumerates all connected USB devices that have a recognized serial driver.
     *
     * @return List of [UsbSerialDriver] instances for compatible devices
     */
    fun enumerateDevices(): List<UsbSerialDriver> {
        return try {
            driverManager.findAllDrivers(usbManager).also {
                Timber.d("Found %d USB serial devices", it.size)
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to enumerate USB devices")
            emptyList()
        }
    }

    /**
     * Requests permission to access the specified USB device.
     *
     * @param device USB device to request permission for
     * @return true if permission was already granted, false if a request was sent
     */
    fun requestPermission(device: UsbDevice): Boolean {
        if (usbManager.hasPermission(device)) {
            Timber.d("USB permission already granted for %s", device.deviceName)
            return true
        }

        val permissionIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(ACTION_USB_PERMISSION),
            PendingIntent.FLAG_IMMUTABLE
        )
        usbManager.requestPermission(device, permissionIntent)
        Timber.d("Requested USB permission for %s", device.deviceName)
        return false
    }

    /**
     * Suspends until permission is granted or denied for the current request.
     *
     * @return true if permission was granted
     */
    suspend fun awaitPermission(): Boolean {
        return permissionFlow.first()
    }

    /**
     * Connects to the first available USB serial device with the given configuration.
     *
     * @param config Serial port configuration (baud rate, etc.)
     * @return [Result] indicating success or failure
     */
    suspend fun connectToFirstAvailable(config: SerialConfig = SerialConfig()): Result<Unit> {
        val drivers = enumerateDevices()
        if (drivers.isEmpty()) {
            return Result.failure(IOException("No USB serial devices found"))
        }
        return connect(drivers.first().device, config)
    }

    /**
     * Connects to a specific USB device with the given serial configuration.
     *
     * @param device USB device to connect to
     * @param config Serial port configuration
     * @return [Result] indicating success or failure
     */
    suspend fun connect(device: UsbDevice, config: SerialConfig = SerialConfig()): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                disconnect()
                _connectionState.value = SerialConnectionState.Connecting

                if (!usbManager.hasPermission(device)) {
                    requestPermission(device)
                    val granted = awaitPermission()
                    if (!granted) {
                        throw SecurityException("USB permission denied for ${device.deviceName}")
                    }
                }

                val driver = driverManager.findDriver(usbManager, device)
                    ?: throw IOException("No driver for device ${device.deviceName}")

                val connection = usbManager.openDevice(device)
                    ?: throw IOException("Failed to open USB connection")

                val port = driver.ports.firstOrNull()
                    ?: throw IOException("No serial ports on device")

                port.open(connection)
                port.setParameters(
                    config.baudRate,
                    config.dataBits,
                    config.stopBits,
                    config.parity
                )

                currentDriver = driver
                currentPort = port
                _connectionState.value = SerialConnectionState.Connected(device, 0)

                startReading()

                Timber.i("Connected to %s at %d baud", device.deviceName, config.baudRate)
                Result.success(Unit)
            } catch (e: Exception) {
                Timber.e(e, "Failed to connect to USB device")
                _connectionState.value = SerialConnectionState.Error(e.message ?: "Connection failed", e)
                Result.failure(e)
            }
        }
    }

    /**
     * Writes a byte array to the currently open serial port.
     *
     * @param data Bytes to write
     * @param timeoutMs Write timeout in milliseconds (default 1000)
     * @return [Result] with number of bytes written, or an error
     */
    fun write(data: ByteArray, timeoutMs: Int = 1000): Result<Int> {
        return try {
            val port = currentPort ?: throw IOException("No serial port open")
            val written = port.write(data, timeoutMs)
            Timber.d("Wrote %d bytes to serial port", written)
            Result.success(written)
        } catch (e: Exception) {
            Timber.e(e, "Serial write failed")
            Result.failure(e)
        }
    }

    /**
     * Disconnects the current serial port and stops the background read loop.
     */
    fun disconnect() {
        isReading.set(false)
        readJob?.cancel()
        readJob = null

        try {
            currentPort?.close()
        } catch (e: Exception) {
            Timber.w(e, "Error closing serial port")
        }
        currentPort = null
        currentDriver = null

        _connectionState.value = SerialConnectionState.Disconnected
        Timber.i("Disconnected from serial port")
    }

    /**
     * Releases all resources. Call when the manager is no longer needed.
     */
    fun release() {
        disconnect()
        try {
            context.unregisterReceiver(usbReceiver)
        } catch (e: Exception) {
            Timber.w(e, "Receiver already unregistered")
        }
        scope.cancel()
        Timber.i("SerialPortManager released")
    }

    private fun startReading() {
        isReading.set(true)
        readJob = scope.launch {
            val port = currentPort ?: return@launch
            val buffer = ByteArray(READ_BUFFER_SIZE)

            while (isReading.get() && isActive) {
                try {
                    val len = port.read(buffer, READ_TIMEOUT_MS)
                    if (len > 0) {
                        val data = buffer.copyOf(len)
                        _dataFlow.tryEmit(
                            SerialReadEvent(
                                data = data,
                                deviceId = currentDriver?.device?.deviceId ?: -1
                            )
                        )
                    }
                } catch (e: IOException) {
                    if (e.message?.contains("Detached") == true) {
                        Timber.w("USB device detached during read")
                        disconnect()
                    } else {
                        Timber.e(e, "Serial read error")
                        _connectionState.value = SerialConnectionState.Error(
                            "Read error: ${e.message}",
                            e
                        )
                    }
                } catch (e: Exception) {
                    Timber.e(e, "Unexpected serial read error")
                    delay(RECONNECT_DELAY_MS)
                }
            }
        }
    }
}
