package com.enviroswarm.fieldkit.hardware.usb.drivers

import timber.log.Timber

/**
 * Data class representing an MH-Z19B CO₂ sensor reading.
 *
 * @property co2Ppm CO₂ concentration in parts per million (ppm)
 * @property temperature Optional temperature reading in °C (available on some firmware versions)
 * @property abcStatus Automatic Baseline Calibration status (true = enabled)
 * @property timestamp Unix timestamp (ms) when reading was taken
 */
data class MHZ19Reading(
    val co2Ppm: Int,
    val temperature: Int?,
    val abcStatus: Boolean,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Driver for the Winsen MH-Z19B / MH-Z19C NDIR CO₂ sensor.
 *
 * Communicates over serial UART (default 9600 baud). The sensor responds with a
 * 9-byte fixed frame to a 0xFF 0x01 command.
 *
 * Response frame structure:
 * ```
 * Byte 0: Start byte (0xFF)
 * Byte 1: Sensor number (0x01)
 * Byte 2: High byte of CO₂ concentration
 * Byte 3: Low byte of CO₂ concentration
 * Byte 4: Reserved / temperature (on some versions)
 * Byte 5: Reserved
 * Byte 6: Reserved
 * Byte 7: Reserved
 * Byte 8: Checksum (0xFF - (sum of bytes 1-7) + 1)
 * ```
 */
class MHZ19Driver {

    companion object {
        private const val FRAME_SIZE = 9
        private const val START_BYTE: Byte = 0xFF.toByte()
        private const val SENSOR_NUM: Byte = 0x01

        // Serial commands
        private val CMD_READ_CO2 = byteArrayOf(0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79)
        private val CMD_CALIBRATE_ZERO = byteArrayOf(0xFF, 0x01, 0x87, 0x00, 0x00, 0x00, 0x00, 0x00, 0x78)
        private val CMD_ABC_ON = byteArrayOf(0xFF, 0x01, 0x79, 0xA0, 0x00, 0x00, 0x00, 0x00, 0xE6)
        private val CMD_ABC_OFF = byteArrayOf(0xFF, 0x01, 0x79, 0x00, 0x00, 0x00, 0x00, 0x00, 0x86)
        private val CMD_SET_RANGE_2000 = byteArrayOf(0xFF, 0x01, 0x99, 0x00, 0x00, 0x00, 0x07, 0xD0, 0x8F)
        private val CMD_SET_RANGE_5000 = byteArrayOf(0xFF, 0x01, 0x99, 0x00, 0x00, 0x00, 0x13, 0x88, 0xCB)
    }

    private val readBuffer = ByteArray(64)
    private var bufferIndex = 0

    /**
     * Feeds raw bytes from the serial port into the driver's internal buffer
     * and attempts to parse complete MH-Z19B frames.
     *
     * @param data Raw bytes received from USB serial
     * @return [Result] containing a list of parsed [MHZ19Reading]s, or an error
     */
    fun parse(data: ByteArray): Result<List<MHZ19Reading>> {
        return try {
            val readings = mutableListOf<MHZ19Reading>()

            for (byte in data) {
                readBuffer[bufferIndex] = byte
                bufferIndex++

                if (bufferIndex >= FRAME_SIZE) {
                    if (isValidFrame(readBuffer, bufferIndex)) {
                        val reading = extractReading(readBuffer)
                        readings.add(reading)
                        // Remove parsed frame from buffer
                        bufferIndex = shiftBuffer(bufferIndex, FRAME_SIZE)
                    } else {
                        // Invalid frame, shift to find next start byte
                        bufferIndex = shiftToNextStart(readBuffer, bufferIndex)
                    }
                }

                if (bufferIndex >= readBuffer.size) {
                    bufferIndex = 0
                }
            }

            Result.success(readings)
        } catch (e: Exception) {
            Timber.e(e, "MH-Z19 parse error")
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
     * Returns the command to read current CO₂ concentration.
     */
    fun getReadCommand(): ByteArray = CMD_READ_CO2.clone()

    /**
     * Returns the command to perform zero-point calibration.
     * Only call in fresh air (~400 ppm)!
     */
    fun getZeroCalibrationCommand(): ByteArray = CMD_CALIBRATE_ZERO.clone()

    /**
     * Returns the command to enable ABC (Automatic Baseline Calibration).
     */
    fun getABCOnCommand(): ByteArray = CMD_ABC_ON.clone()

    /**
     * Returns the command to disable ABC (Automatic Baseline Calibration).
     */
    fun getABCOffCommand(): ByteArray = CMD_ABC_OFF.clone()

    /**
     * Returns the command to set measurement range to 0-2000 ppm.
     */
    fun getRange2000Command(): ByteArray = CMD_SET_RANGE_2000.clone()

    /**
     * Returns the command to set measurement range to 0-5000 ppm.
     */
    fun getRange5000Command(): ByteArray = CMD_SET_RANGE_5000.clone()

    private fun isValidFrame(buffer: ByteArray, size: Int): Boolean {
        if (size < FRAME_SIZE) return false
        if (buffer[0] != START_BYTE) return false
        if (buffer[1] != SENSOR_NUM) return false

        // Verify checksum
        var sum = 0
        for (i in 1 until FRAME_SIZE - 1) {
            sum += buffer[i].toInt() and 0xFF
        }
        val checksum = (0xFF - sum + 1) and 0xFF
        val frameChecksum = buffer[FRAME_SIZE - 1].toInt() and 0xFF
        return checksum == frameChecksum
    }

    private fun extractReading(buffer: ByteArray): MHZ19Reading {
        val co2High = buffer[2].toInt() and 0xFF
        val co2Low = buffer[3].toInt() and 0xFF
        val co2Ppm = (co2High shl 8) or co2Low

        // Temperature byte interpretation varies by firmware version
        // Some versions report (byte - 40) as °C
        val tempByte = buffer[4].toInt() and 0xFF
        val temperature = if (tempByte in 0..80) tempByte - 40 else null

        // ABC status can be inferred from byte 5 on some versions, but we don't have a reliable way
        // Default to unknown; the caller should track ABC state explicitly
        val abcStatus = buffer[5].toInt() and 0xFF == 0xA0

        return MHZ19Reading(
            co2Ppm = co2Ppm,
            temperature = temperature,
            abcStatus = abcStatus
        )
    }

    private fun shiftBuffer(buffer: ByteArray, size: Int, shiftBy: Int): Int {
        for (i in shiftBy until size) {
            buffer[i - shiftBy] = buffer[i]
        }
        return size - shiftBy
    }

    private fun shiftToNextStart(buffer: ByteArray, size: Int): Int {
        for (i in 1 until size) {
            if (buffer[i] == START_BYTE) {
                return shiftBuffer(buffer, size, i)
            }
        }
        return 0
    }
}
