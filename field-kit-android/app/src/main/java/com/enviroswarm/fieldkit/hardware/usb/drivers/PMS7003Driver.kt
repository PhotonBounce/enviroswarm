package com.enviroswarm.fieldkit.hardware.usb.drivers

import android.hardware.usb.UsbDevice
import com.hoho.android.usbserial.driver.UsbSerialDriver
import timber.log.Timber
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Data class representing a complete PMS7003 particulate matter sensor reading.
 *
 * @property pm1_0Standard PM1.0 concentration under standard atmospheric conditions (μg/m³)
 * @property pm2_5Standard PM2.5 concentration under standard atmospheric conditions (μg/m³)
 * @property pm10Standard PM10 concentration under standard atmospheric conditions (μg/m³)
 * @property pm1_0Atmospheric PM1.0 concentration under atmospheric conditions (μg/m³)
 * @property pm2_5Atmospheric PM2.5 concentration under atmospheric conditions (μg/m³)
 * @property pm10Atmospheric PM10 concentration under atmospheric conditions (μg/m³)
 * @property particles0_3um Number of particles >0.3μm per 0.1L of air
 * @property particles0_5um Number of particles >0.5μm per 0.1L of air
 * @property particles1_0um Number of particles >1.0μm per 0.1L of air
 * @property particles2_5um Number of particles >2.5μm per 0.1L of air
 * @property particles5_0um Number of particles >5.0μm per 0.1L of air
 * @property particles10um Number of particles >10μm per 0.1L of air
 * @property timestamp Unix timestamp (ms) when reading was taken
 */
data class PMS7003Reading(
    val pm1_0Standard: Int,
    val pm2_5Standard: Int,
    val pm10Standard: Int,
    val pm1_0Atmospheric: Int,
    val pm2_5Atmospheric: Int,
    val pm10Atmospheric: Int,
    val particles0_3um: Int,
    val particles0_5um: Int,
    val particles1_0um: Int,
    val particles2_5um: Int,
    val particles5_0um: Int,
    val particles10um: Int,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Driver for the Plantower PMS7003 particulate matter sensor.
 *
 * Communicates over serial UART (default 9600 baud). The sensor outputs a
 * 32-byte fixed frame beginning with the magic header `0x42 0x4D`.
 *
 * Frame structure:
 * ```
 * Byte 0-1: Header (0x42, 0x4D)
 * Byte 2-3: Frame length (0x00, 0x1C = 28 data bytes)
 * Byte 4-5: PM1.0 standard
 * Byte 6-7: PM2.5 standard
 * Byte 8-9: PM10 standard
 * Byte 10-11: PM1.0 atmospheric
 * Byte 12-13: PM2.5 atmospheric
 * Byte 14-15: PM10 atmospheric
 * Byte 16-17: Particles >0.3μm / 0.1L
 * Byte 18-19: Particles >0.5μm / 0.1L
 * Byte 20-21: Particles >1.0μm / 0.1L
 * Byte 22-23: Particles >2.5μm / 0.1L
 * Byte 24-25: Particles >5.0μm / 0.1L
 * Byte 26-27: Particles >10μm / 0.1L
 * Byte 28-29: Reserved
 * Byte 30-31: Checksum (sum of bytes 0-29)
 * ```
 */
class PMS7003Driver {

    companion object {
        private const val FRAME_SIZE = 32
        private const val HEADER_0: Byte = 0x42
        private const val HEADER_1: Byte = 0x4D

        // Serial commands
        private val CMD_PASSIVE_MODE = byteArrayOf(0x42, 0x4D, 0xE1, 0x00, 0x00, 0x01, 0x70)
        private val CMD_ACTIVE_MODE = byteArrayOf(0x42, 0x4D, 0xE1, 0x00, 0x01, 0x01, 0x71)
        private val CMD_SLEEP = byteArrayOf(0x42, 0x4D, 0xE4, 0x00, 0x00, 0x01, 0x73)
        private val CMD_WAKEUP = byteArrayOf(0x42, 0x4D, 0xE4, 0x00, 0x01, 0x01, 0x74)
        private val CMD_READ_PASSIVE = byteArrayOf(0x42, 0x4D, 0xE2, 0x00, 0x00, 0x01, 0x71)
    }

    private val readBuffer = ByteArray(256)
    private var bufferIndex = 0

    /**
     * Feeds raw bytes from the serial port into the driver's internal buffer
     * and attempts to parse complete PMS7003 frames.
     *
     * @param data Raw bytes received from USB serial
     * @return [Result] containing a list of parsed [PMS7003Reading]s, or an error
     */
    fun parse(data: ByteArray): Result<List<PMS7003Reading>> {
        return try {
            val readings = mutableListOf<PMS7003Reading>()

            for (byte in data) {
                readBuffer[bufferIndex] = byte
                bufferIndex++

                if (bufferIndex >= FRAME_SIZE) {
                    if (isValidFrame(readBuffer, bufferIndex)) {
                        val reading = extractReading(readBuffer)
                        readings.add(reading)
                        bufferIndex = 0
                    } else {
                        // Shift buffer to find next potential header
                        bufferIndex = shiftToNextHeader(readBuffer, bufferIndex)
                    }
                }

                if (bufferIndex >= readBuffer.size) {
                    bufferIndex = 0
                }
            }

            Result.success(readings)
        } catch (e: Exception) {
            Timber.e(e, "PMS7003 parse error")
            Result.failure(e)
        }
    }

    /**
     * Resets the internal read buffer. Call when the serial port is (re)opened.
     */
    fun reset() {
        bufferIndex = 0
        readBuffer.fill(0)
    }

    /**
     * Returns the command to set the sensor to passive mode (requires explicit read).
     */
    fun getPassiveModeCommand(): ByteArray = CMD_PASSIVE_MODE.clone()

    /**
     * Returns the command to set the sensor to active mode (continuous output).
     */
    fun getActiveModeCommand(): ByteArray = CMD_ACTIVE_MODE.clone()

    /**
     * Returns the command to put the sensor to sleep.
     */
    fun getSleepCommand(): ByteArray = CMD_SLEEP.clone()

    /**
     * Returns the command to wake the sensor from sleep.
     */
    fun getWakeupCommand(): ByteArray = CMD_WAKEUP.clone()

    /**
     * Returns the command to trigger a single reading in passive mode.
     */
    fun getReadCommand(): ByteArray = CMD_READ_PASSIVE.clone()

    private fun isValidFrame(buffer: ByteArray, size: Int): Boolean {
        if (size < FRAME_SIZE) return false
        if (buffer[0] != HEADER_0 || buffer[1] != HEADER_1) return false

        // Verify frame length byte (should be 0x001C = 28)
        val frameLength = ((buffer[2].toInt() and 0xFF) shl 8) or (buffer[3].toInt() and 0xFF)
        if (frameLength != 28) return false

        // Verify checksum
        var checksum = 0
        for (i in 0 until FRAME_SIZE - 2) {
            checksum += buffer[i].toInt() and 0xFF
        }
        val frameChecksum = ((buffer[30].toInt() and 0xFF) shl 8) or (buffer[31].toInt() and 0xFF)
        return checksum == frameChecksum
    }

    private fun extractReading(buffer: ByteArray): PMS7003Reading {
        val bb = ByteBuffer.wrap(buffer).order(ByteOrder.BIG_ENDIAN)
        bb.position(4) // Skip header and frame length

        return PMS7003Reading(
            pm1_0Standard = bb.short.toInt(),
            pm2_5Standard = bb.short.toInt(),
            pm10Standard = bb.short.toInt(),
            pm1_0Atmospheric = bb.short.toInt(),
            pm2_5Atmospheric = bb.short.toInt(),
            pm10Atmospheric = bb.short.toInt(),
            particles0_3um = bb.short.toInt(),
            particles0_5um = bb.short.toInt(),
            particles1_0um = bb.short.toInt(),
            particles2_5um = bb.short.toInt(),
            particles5_0um = bb.short.toInt(),
            particles10um = bb.short.toInt()
        )
    }

    private fun shiftToNextHeader(buffer: ByteArray, size: Int): Int {
        for (i in 1 until size) {
            if (buffer[i] == HEADER_0) {
                // Shift remaining bytes to front
                for (j in i until size) {
                    buffer[j - i] = buffer[j]
                }
                return size - i
            }
        }
        return 0
    }
}
