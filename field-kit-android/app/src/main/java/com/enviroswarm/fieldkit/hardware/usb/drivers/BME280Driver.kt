package com.enviroswarm.fieldkit.hardware.usb.drivers

import com.enviroswarm.fieldkit.utils.UnitConverter
import timber.log.Timber

/**
 * Data class representing a BME280 environmental sensor reading.
 *
 * @property temperature Temperature in °C
 * @property humidity Relative humidity in % (0-100)
 * @property pressure Atmospheric pressure in hPa
 * @property altitude Estimated altitude in meters (from pressure)
 * @property dewPoint Dew point in °C
 * @property timestamp Unix timestamp (ms) when reading was taken
 */
data class BME280Reading(
    val temperature: Double,
    val humidity: Double,
    val pressure: Double,
    val altitude: Double,
    val dewPoint: Double,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Driver for the Bosch BME280 temperature, humidity, and pressure sensor.
 *
 * The BME280 is typically accessed via I2C or SPI, but when connected through
 * a USB-to-serial bridge (e.g., Arduino, ESP32), the host MCU sends parsed
 * values over a simple serial text or binary protocol.
 *
 * This driver supports both:
 * 1. **Text protocol**: comma-separated values like `T:25.3,H:48.2,P:1013.5\n`
 * 2. **Binary protocol**: 8-byte little-endian float triple (T, H, P)
 *
 * For direct I2C/SPI access, use the Android Things or custom I2C driver layer.
 */
class BME280Driver {

    companion object {
        private const val SEA_LEVEL_PRESSURE_HPA = 1013.25
    }

    private val textBuffer = StringBuilder()

    /**
     * Feeds raw bytes from the serial port into the driver's internal buffer
     * and attempts to parse complete BME280 readings.
     *
     * Supports both text CSV and binary protocols. Auto-detects based on content.
     *
     * @param data Raw bytes received from USB serial
     * @return [Result] containing a list of parsed [BME280Reading]s, or an error
     */
    fun parse(data: ByteArray): Result<List<BME280Reading>> {
        return try {
            // Try binary protocol first if data length is a multiple of 12 (3 floats)
            if (data.size % 12 == 0 && data.size >= 12) {
                return parseBinary(data)
            }

            // Fall back to text protocol
            parseText(data)
        } catch (e: Exception) {
            Timber.e(e, "BME280 parse error")
            Result.failure(e)
        }
    }

    /**
     * Resets the internal text buffer. Call when the serial port is (re)opened.
     */
    fun reset() {
        textBuffer.clear()
    }

    private fun parseBinary(data: ByteArray): Result<List<BME280Reading>> {
        val readings = mutableListOf<BME280Reading>()
        val buffer = java.nio.ByteBuffer.wrap(data).order(java.nio.ByteOrder.LITTLE_ENDIAN)

        while (buffer.remaining() >= 12) {
            val temperature = buffer.float.toDouble()
            val humidity = buffer.float.toDouble()
            val pressure = buffer.float.toDouble()

            if (isValidReading(temperature, humidity, pressure)) {
                readings.add(createReading(temperature, humidity, pressure))
            }
        }

        return Result.success(readings)
    }

    private fun parseText(data: ByteArray): Result<List<BME280Reading>> {
        val readings = mutableListOf<BME280Reading>()
        textBuffer.append(String(data, Charsets.UTF_8))

        var newlineIndex: Int
        while (textBuffer.indexOf('\n').also { newlineIndex = it } != -1) {
            val line = textBuffer.substring(0, newlineIndex).trim()
            textBuffer.delete(0, newlineIndex + 1)

            if (line.isNotBlank()) {
                parseLine(line)?.let { readings.add(it) }
            }
        }

        // Prevent buffer from growing indefinitely
        if (textBuffer.length > 4096) {
            textBuffer.delete(0, textBuffer.length - 1024)
        }

        return Result.success(readings)
    }

    private fun parseLine(line: String): BME280Reading? {
        return try {
            // Expected formats:
            // "T:25.3,H:48.2,P:1013.5"
            // "25.3,48.2,1013.5"
            // "TEMP:25.3,HUM:48.2,PRES:1013.5"

            val cleaned = line.replace(" ", "").replace("\r", "")

            val tempRegex = Regex("[Tt][Ee]?[Mm]?[Pp]?[:\s,=]+(-?\d+\.?\d*)")
            val humRegex = Regex("[Hh][Uu]?[Mm]?[:\s,=]+(-?\d+\.?\d*)")
            val presRegex = Regex("[Pp][Rr]?[Ee]?[Ss]?[:\s,=]+(-?\d+\.?\d*)")

            val tempMatch = tempRegex.find(cleaned)
            val humMatch = humRegex.find(cleaned)
            val presMatch = presRegex.find(cleaned)

            if (tempMatch != null && humMatch != null && presMatch != null) {
                val temp = tempMatch.groupValues[1].toDouble()
                val hum = humMatch.groupValues[1].toDouble()
                val pres = presMatch.groupValues[1].toDouble()

                if (isValidReading(temp, hum, pres)) {
                    createReading(temp, hum, pres)
                } else null
            } else {
                // Try simple CSV: "25.3,48.2,1013.5"
                val parts = cleaned.split(",")
                if (parts.size >= 3) {
                    val temp = parts[0].toDoubleOrNull() ?: return null
                    val hum = parts[1].toDoubleOrNull() ?: return null
                    val pres = parts[2].toDoubleOrNull() ?: return null

                    if (isValidReading(temp, hum, pres)) {
                        createReading(temp, hum, pres)
                    } else null
                } else null
            }
        } catch (e: Exception) {
            Timber.w(e, "Failed to parse BME280 line: $line")
            null
        }
    }

    private fun isValidReading(temp: Double, hum: Double, pressure: Double): Boolean {
        return temp in -40.0..85.0 &&
                hum in 0.0..100.0 &&
                pressure in 300.0..1100.0
    }

    private fun createReading(temperature: Double, humidity: Double, pressure: Double): BME280Reading {
        val altitude = UnitConverter.pressureToAltitude(pressure, SEA_LEVEL_PRESSURE_HPA)
        val dewPoint = UnitConverter.calculateDewPoint(temperature, humidity)

        return BME280Reading(
            temperature = temperature,
            humidity = humidity,
            pressure = pressure,
            altitude = altitude,
            dewPoint = dewPoint
        )
    }
}
