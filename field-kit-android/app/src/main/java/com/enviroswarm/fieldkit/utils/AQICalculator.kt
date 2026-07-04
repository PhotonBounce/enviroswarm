package com.enviroswarm.fieldkit.utils

import androidx.compose.ui.graphics.Color
import com.enviroswarm.fieldkit.ui.theme.AqiGood
import com.enviroswarm.fieldkit.ui.theme.AqiHazardous
import com.enviroswarm.fieldkit.ui.theme.AqiModerate
import com.enviroswarm.fieldkit.ui.theme.AqiUnhealthy
import com.enviroswarm.fieldkit.ui.theme.AqiUnhealthySensitive
import com.enviroswarm.fieldkit.ui.theme.AqiVeryUnhealthy

/**
 * Utility object for calculating Air Quality Index (AQI) based on EPA breakpoints.
 *
 * Uses the US EPA standard for PM2.5 AQI calculation with the following breakpoints:
 *
 * | AQI Category                  | PM2.5 (μg/m³) 24-hr avg |
 * |-------------------------------|--------------------------|
 * | Good (0-50)                   | 0.0 - 12.0               |
 * | Moderate (51-100)             | 12.1 - 35.4              |
 * | Unhealthy for Sensitive (101-150)| 35.5 - 55.4            |
 * | Unhealthy (151-200)           | 55.5 - 150.4             |
 * | Very Unhealthy (201-300)      | 150.5 - 250.4            |
 * | Hazardous (301-500)           | 250.5 - 500.4            |
 */
object AQICalculator {

    private data class Breakpoint(
        val lowAqi: Int,
        val highAqi: Int,
        val lowConc: Double,
        val highConc: Double
    )

    private val pm25Breakpoints = listOf(
        Breakpoint(0, 50, 0.0, 12.0),
        Breakpoint(51, 100, 12.1, 35.4),
        Breakpoint(101, 150, 35.5, 55.4),
        Breakpoint(151, 200, 55.5, 150.4),
        Breakpoint(201, 300, 150.5, 250.4),
        Breakpoint(301, 500, 250.5, 500.4)
    )

    /**
     * Calculates the AQI value from a PM2.5 concentration.
     *
     * @param pm25 PM2.5 concentration in μg/m³
     * @return AQI value (0-500), clamped to valid range
     */
    fun calculateAQI(pm25: Double): Int {
        val bp = pm25Breakpoints.find {
            pm25 >= it.lowConc && pm25 <= it.highConc
        } ?: return if (pm25 < 0) 0 else 500

        val aqi = ((bp.highAqi - bp.lowAqi) / (bp.highConc - bp.lowConc)) *
                (pm25 - bp.lowConc) + bp.lowAqi

        return aqi.toInt().coerceIn(0, 500)
    }

    /**
     * Returns the color associated with the given AQI value.
     *
     * @param aqi AQI value (0-500)
     * @return Compose Color for the AQI category
     */
    fun getAQIColor(aqi: Int): Color = when (aqi) {
        in 0..50 -> AqiGood
        in 51..100 -> AqiModerate
        in 101..150 -> AqiUnhealthySensitive
        in 151..200 -> AqiUnhealthy
        in 201..300 -> AqiVeryUnhealthy
        else -> AqiHazardous
    }

    /**
     * Returns the human-readable label for the given AQI value.
     *
     * @param aqi AQI value (0-500)
     * @return Label string for the AQI category
     */
    fun getAQILabel(aqi: Int): String = when (aqi) {
        in 0..50 -> "Good"
        in 51..100 -> "Moderate"
        in 101..150 -> "Unhealthy for Sensitive Groups"
        in 151..200 -> "Unhealthy"
        in 201..300 -> "Very Unhealthy"
        else -> "Hazardous"
    }

    /**
     * Returns health advice based on the AQI value.
     *
     * @param aqi AQI value (0-500)
     * @return Health advisory string
     */
    fun getHealthAdvice(aqi: Int): String = when (aqi) {
        in 0..50 -> "Air quality is satisfactory. Enjoy outdoor activities!"
        in 51..100 -> "Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exertion."
        in 101..150 -> "Sensitive groups should reduce outdoor exertion. Others can enjoy normal activities."
        in 151..200 -> "Everyone should reduce outdoor exertion. Sensitive groups should avoid prolonged outdoor activity."
        in 201..300 -> "Avoid outdoor activities. Keep windows closed and use air purifiers indoors."
        else -> "Emergency conditions. Stay indoors and seek medical attention if experiencing symptoms."
    }
}
