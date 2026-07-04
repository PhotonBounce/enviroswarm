package com.enviroswarm.fieldkit.utils

import kotlin.math.ln
import kotlin.math.pow

/**
 * Utility object for converting between common scientific and environmental units.
 *
 * Supports gas concentration conversions, temperature scales, pressure units,
 * and reference sound level comparisons.
 */
object UnitConverter {

    // --- Gas Concentration ---

    /**
     * Converts ppm (parts per million) to ppb (parts per billion).
     *
     * @param ppm Concentration in ppm
     * @return Concentration in ppb
     */
    fun ppmToPpb(ppm: Double): Double = ppm * 1000.0

    /**
     * Converts ppb (parts per billion) to ppm (parts per million).
     *
     * @param ppb Concentration in ppb
     * @return Concentration in ppm
     */
    fun ppbToPpm(ppb: Double): Double = ppb / 1000.0

    /**
     * Converts μg/m³ to ppm for a given gas at standard temperature and pressure.
     *
     * Formula: ppm = (μg/m³ * 24.45) / (molecularWeight * 1000)
     *
     * @param ugPm3 Concentration in μg/m³
     * @param molecularWeight Molecular weight of the gas in g/mol
     * @param temperature Temperature in °C (default 25°C)
     * @param pressure Pressure in kPa (default 101.325 kPa)
     * @return Concentration in ppm
     */
    fun ugPm3ToPpm(
        ugPm3: Double,
        molecularWeight: Double,
        temperature: Double = 25.0,
        pressure: Double = 101.325
    ): Double {
        // Adjust molar volume for temperature and pressure
        val molarVolume = 22.414 * (temperature + 273.15) / 273.15 * 101.325 / pressure
        return (ugPm3 * molarVolume) / (molecularWeight * 1000.0)
    }

    /**
     * Converts ppm to μg/m³ for a given gas at standard temperature and pressure.
     *
     * @param ppm Concentration in ppm
     * @param molecularWeight Molecular weight of the gas in g/mol
     * @param temperature Temperature in °C (default 25°C)
     * @param pressure Pressure in kPa (default 101.325 kPa)
     * @return Concentration in μg/m³
     */
    fun ppmToUgPm3(
        ppm: Double,
        molecularWeight: Double,
        temperature: Double = 25.0,
        pressure: Double = 101.325
    ): Double {
        val molarVolume = 22.414 * (temperature + 273.15) / 273.15 * 101.325 / pressure
        return (ppm * molecularWeight * 1000.0) / molarVolume
    }

    // --- Temperature ---

    /**
     * Converts Celsius to Fahrenheit.
     *
     * @param celsius Temperature in °C
     * @return Temperature in °F
     */
    fun celsiusToFahrenheit(celsius: Double): Double = (celsius * 9.0 / 5.0) + 32.0

    /**
     * Converts Fahrenheit to Celsius.
     *
     * @param fahrenheit Temperature in °F
     * @return Temperature in °C
     */
    fun fahrenheitToCelsius(fahrenheit: Double): Double = (fahrenheit - 32.0) * 5.0 / 9.0

    /**
     * Converts Celsius to Kelvin.
     *
     * @param celsius Temperature in °C
     * @return Temperature in K
     */
    fun celsiusToKelvin(celsius: Double): Double = celsius + 273.15

    /**
     * Converts Kelvin to Celsius.
     *
     * @param kelvin Temperature in K
     * @return Temperature in °C
     */
    fun kelvinToCelsius(kelvin: Double): Double = kelvin - 273.15

    // --- Pressure ---

    /**
     * Converts hPa (hectopascal) to atm (standard atmosphere).
     *
     * @param hPa Pressure in hPa
     * @return Pressure in atm
     */
    fun hPaToAtm(hPa: Double): Double = hPa / 1013.25

    /**
     * Converts atm (standard atmosphere) to hPa (hectopascal).
     *
     * @param atm Pressure in atm
     * @return Pressure in hPa
     */
    fun atmToHpa(atm: Double): Double = atm * 1013.25

    /**
     * Converts hPa to mmHg (millimeters of mercury).
     *
     * @param hPa Pressure in hPa
     * @return Pressure in mmHg
     */
    fun hPaToMmHg(hPa: Double): Double = hPa * 0.750062

    /**
     * Converts mmHg to hPa (hectopascal).
     *
     * @param mmHg Pressure in mmHg
     * @return Pressure in hPa
     */
    fun mmHgToHpa(mmHg: Double): Double = mmHg / 0.750062

    /**
     * Converts hPa to inches of mercury (inHg).
     *
     * @param hPa Pressure in hPa
     * @return Pressure in inHg
     */
    fun hPaToInHg(hPa: Double): Double = hPa * 0.02953

    /**
     * Calculates altitude from sea level pressure and current pressure.
     *
     * Uses the barometric formula: h = 44330 * (1 - (P / P0)^(1/5.255))
     *
     * @param pressure Current pressure in hPa
     * @param seaLevelPressure Sea level pressure in hPa (default 1013.25 hPa)
     * @return Altitude in meters
     */
    fun pressureToAltitude(pressure: Double, seaLevelPressure: Double = 1013.25): Double {
        return 44330.0 * (1.0 - (pressure / seaLevelPressure).pow(1.0 / 5.255))
    }

    // --- Dew Point ---

    /**
     * Calculates dew point from temperature and relative humidity.
     *
     * Uses the Magnus formula with the Sonntag 1990 coefficients.
     *
     * @param temperature Temperature in °C
     * @param humidity Relative humidity in % (0-100)
     * @return Dew point in °C
     */
    fun calculateDewPoint(temperature: Double, humidity: Double): Double {
        val a = 17.62
        val b = 243.12
        val alpha = ln(humidity / 100.0) + (a * temperature) / (b + temperature)
        return (b * alpha) / (a - alpha)
    }

    // --- Sound Level References ---

    /**
     * Returns a human-readable description for a given sound level in dB.
     *
     * @param db Sound pressure level in dB
     * @return Description of the sound environment
     */
    fun getSoundLevelDescription(db: Double): String = when (db) {
        in 0.0..20.0 -> "Very quiet (whisper, recording studio)"
        in 20.0..40.0 -> "Quiet (library, quiet rural area)"
        in 40.0..60.0 -> "Moderate (quiet conversation, suburban home)"
        in 60.0..70.0 -> "Loud (normal conversation, busy office)"
        in 70.0..80.0 -> "Very loud (city traffic, vacuum cleaner)"
        in 80.0..90.0 -> "Hazardous (motorcycle, heavy traffic)"
        in 90.0..100.0 -> "Extremely hazardous (subway, power tools)"
        in 100.0..120.0 -> "Pain threshold (rock concert, jet takeoff)"
        else -> "Immediate danger (gunshot, firecracker)"
    }

    /**
     * Common molecular weights for pollutant gases (g/mol).
     */
    object MolecularWeights {
        const val CO2 = 44.01
        const val CO = 28.01
        const val NO2 = 46.01
        const val SO2 = 64.07
        const val O3 = 48.00
        const val NH3 = 17.03
        const val CH4 = 16.04
        const val H2S = 34.08
    }
}
