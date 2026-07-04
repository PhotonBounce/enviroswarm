"""Scientific unit conversion engine for environmental sensor data."""

from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Conversion factors and formulas
# ---------------------------------------------------------------------------

# Temperature conversions (to Celsius as base)
_TEMP_TO_C: Dict[str, callable] = {
    "C": lambda x: x,
    "F": lambda x: (x - 32) * 5 / 9,
    "K": lambda x: x - 273.15,
}

_TEMP_FROM_C: Dict[str, callable] = {
    "C": lambda x: x,
    "F": lambda x: x * 9 / 5 + 32,
    "K": lambda x: x + 273.15,
}

# Gas molar masses (g/mol) for ppm <-> µg/m³ conversions
_MOLAR_MASSES = {
    "co": 28.01,
    "co2": 44.01,
    "no2": 46.01,
    "so2": 64.07,
    "o3": 48.00,
    "voc": 78.00,  # approximate average
    "nh3": 17.03,
    "ch4": 16.04,
}

# Standard conditions: 25°C, 1 atm
_STANDARD_TEMP_K = 298.15
_STANDARD_PRESSURE_KPA = 101.325

# Ideal gas constant (L·kPa / K·mol)
_R = 8.31446


class ConversionEngine:
    """Scientific unit conversion engine for environmental measurements."""

    @staticmethod
    def convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
        """Convert temperature between C, F, K."""
        from_unit = from_unit.upper()
        to_unit = to_unit.upper()
        if from_unit not in _TEMP_TO_C:
            raise ValueError(f"Unsupported temperature unit: {from_unit}")
        if to_unit not in _TEMP_FROM_C:
            raise ValueError(f"Unsupported temperature unit: {to_unit}")
        celsius = _TEMP_TO_C[from_unit](value)
        return _TEMP_FROM_C[to_unit](celsius)

    @staticmethod
    def ppm_to_ugm3(value: float, pollutant: str, temperature_c: float = 25.0, pressure_kpa: float = 101.325) -> float:
        """Convert ppm (parts per million) to µg/m³ for a gas pollutant.

        Formula: µg/m³ = ppm * M * P / (R * T) * 1000
        Where M = molar mass (g/mol), P = pressure (kPa), T = temperature (K), R = 8.314
        """
        molar_mass = _MOLAR_MASSES.get(pollutant.lower())
        if molar_mass is None:
            raise ValueError(f"Unknown pollutant for molar mass: {pollutant}")
        temp_k = temperature_c + 273.15
        # At standard conditions, 1 ppm ≈ M / 24.45 mg/m³
        # Simplified: µg/m³ = ppm * M * 1000 / (R * T / P)
        volume_per_mol = (_R * temp_k) / pressure_kpa  # L/mol
        # 1 ppm = 1 mL/m³ = 1e-6 m³/m³
        # µg/m³ = ppm * (molar_mass g/mol) / (volume_per_mol L/mol) * (1e3 µg/g) * (1e-3 L/m³ correction)
        # Actually: ppm = (volume of gas / total volume) * 1e6
        # mass concentration = (ppm * 1e-6) * (molar_mass / volume_per_mol) * 1e6 (to get µg)
        # = ppm * molar_mass / volume_per_mol * 1000
        return value * molar_mass / volume_per_mol * 1000.0

    @staticmethod
    def ugm3_to_ppm(value: float, pollutant: str, temperature_c: float = 25.0, pressure_kpa: float = 101.325) -> float:
        """Convert µg/m³ to ppm for a gas pollutant."""
        molar_mass = _MOLAR_MASSES.get(pollutant.lower())
        if molar_mass is None:
            raise ValueError(f"Unknown pollutant for molar mass: {pollutant}")
        temp_k = temperature_c + 273.15
        volume_per_mol = (_R * temp_k) / pressure_kpa
        return value / (molar_mass / volume_per_mol * 1000.0)

    @staticmethod
    def ppb_to_ppm(value: float) -> float:
        """Convert ppb to ppm."""
        return value / 1000.0

    @staticmethod
    def ppm_to_ppb(value: float) -> float:
        """Convert ppm to ppb."""
        return value * 1000.0

    @staticmethod
    def convert(
        value: float,
        from_unit: str,
        to_unit: str,
        pollutant: Optional[str] = None,
        temperature_c: float = 25.0,
        pressure_kpa: float = 101.325,
    ) -> float:
        """Generic conversion between supported units."""
        from_unit = from_unit.lower().replace("µg", "ug").replace("μg", "ug")
        to_unit = to_unit.lower().replace("µg", "ug").replace("μg", "ug")

        # Temperature
        if from_unit in ("c", "f", "k") and to_unit in ("c", "f", "k"):
            return ConversionEngine.convert_temperature(value, from_unit, to_unit)

        # ppm <-> ppb
        if from_unit == "ppb" and to_unit == "ppm":
            return ConversionEngine.ppb_to_ppm(value)
        if from_unit == "ppm" and to_unit == "ppb":
            return ConversionEngine.ppm_to_ppb(value)

        # ppm <-> µg/m³
        if from_unit == "ppm" and to_unit in ("ug/m3", "ug/m³", "µg/m3", "µg/m³"):
            if pollutant is None:
                raise ValueError("pollutant required for ppm to µg/m³ conversion")
            return ConversionEngine.ppm_to_ugm3(value, pollutant, temperature_c, pressure_kpa)
        if from_unit in ("ug/m3", "ug/m³", "µg/m3", "µg/m³") and to_unit == "ppm":
            if pollutant is None:
                raise ValueError("pollutant required for µg/m³ to ppm conversion")
            return ConversionEngine.ugm3_to_ppm(value, pollutant, temperature_c, pressure_kpa)

        # ppb <-> µg/m³
        if from_unit == "ppb" and to_unit in ("ug/m3", "ug/m³", "µg/m3", "µg/m³"):
            if pollutant is None:
                raise ValueError("pollutant required for ppb to µg/m³ conversion")
            ppm = ConversionEngine.ppb_to_ppm(value)
            return ConversionEngine.ppm_to_ugm3(ppm, pollutant, temperature_c, pressure_kpa)
        if from_unit in ("ug/m3", "ug/m³", "µg/m3", "µg/m³") and to_unit == "ppb":
            if pollutant is None:
                raise ValueError("pollutant required for µg/m³ to ppb conversion")
            ppm = ConversionEngine.ugm3_to_ppm(value, pollutant, temperature_c, pressure_kpa)
            return ConversionEngine.ppm_to_ppb(ppm)

        # Pressure
        if from_unit in ("pa", "hpa", "kpa") and to_unit in ("pa", "hpa", "kpa"):
            return ConversionEngine._convert_pressure(value, from_unit, to_unit)

        # Distance
        if from_unit in ("m", "km") and to_unit in ("m", "km"):
            return ConversionEngine._convert_distance(value, from_unit, to_unit)

        # Noise
        if from_unit in ("db", "dba") and to_unit in ("db", "dba"):
            # dBA to dB is approximate; they measure different things
            return value

        raise ValueError(f"Unsupported conversion: {from_unit} -> {to_unit}")

    @staticmethod
    def _convert_pressure(value: float, from_unit: str, to_unit: str) -> float:
        to_pa = {"pa": 1.0, "hpa": 100.0, "kpa": 1000.0}
        pa = value * to_pa[from_unit]
        return pa / to_pa[to_unit]

    @staticmethod
    def _convert_distance(value: float, from_unit: str, to_unit: str) -> float:
        to_m = {"m": 1.0, "km": 1000.0}
        m = value * to_m[from_unit]
        return m / to_m[to_unit]

    @staticmethod
    def batch_convert(
        conversions: List[Dict[str, any]],
        default_temperature_c: float = 25.0,
        default_pressure_kpa: float = 101.325,
    ) -> List[Dict[str, any]]:
        """Convert multiple values in a single call."""
        results = []
        for c in conversions:
            try:
                result = ConversionEngine.convert(
                    value=c["value"],
                    from_unit=c["from_unit"],
                    to_unit=c["to_unit"],
                    pollutant=c.get("pollutant"),
                    temperature_c=c.get("temperature_c", default_temperature_c),
                    pressure_kpa=c.get("pressure_kpa", default_pressure_kpa),
                )
                results.append({
                    "input": c,
                    "result": round(result, 6),
                    "success": True,
                })
            except ValueError as exc:
                results.append({
                    "input": c,
                    "error": str(exc),
                    "success": False,
                })
        return results
