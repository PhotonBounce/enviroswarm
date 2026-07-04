"""AQI calculation services supporting EPA, EAQI, and AQHI standards."""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import math

# ---------------------------------------------------------------------------
# EPA AQI breakpoints (concentration -> AQI)
# Format: (C_low, C_high, I_low, I_high)
# ---------------------------------------------------------------------------

EPA_BREAKPOINTS: Dict[str, List[Tuple[float, float, int, int]]] = {
    "pm25": [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 500.4, 301, 500),
    ],
    "pm10": [
        (0, 54, 0, 50),
        (55, 154, 51, 100),
        (155, 254, 101, 150),
        (255, 354, 151, 200),
        (355, 424, 201, 300),
        (425, 604, 301, 500),
    ],
    "o3": [
        (0, 54, 0, 50),
        (55, 124, 51, 100),
        (125, 164, 101, 150),
        (165, 204, 151, 200),
        (205, 404, 201, 300),
        (405, 504, 301, 500),
    ],
    "co": [
        (0.0, 4.4, 0, 50),
        (4.5, 9.4, 51, 100),
        (9.5, 12.4, 101, 150),
        (12.5, 15.4, 151, 200),
        (15.5, 30.4, 201, 300),
        (30.5, 50.4, 301, 500),
    ],
    "no2": [
        (0, 53, 0, 50),
        (54, 100, 51, 100),
        (101, 360, 101, 150),
        (361, 649, 151, 200),
        (650, 1249, 201, 300),
        (1250, 2049, 301, 500),
    ],
    "so2": [
        (0, 35, 0, 50),
        (36, 75, 51, 100),
        (76, 185, 101, 150),
        (186, 304, 151, 200),
        (305, 604, 201, 300),
        (605, 1004, 301, 500),
    ],
}

# European EAQI index levels (µg/m³) — simplified 5-level scale
EAQI_LEVELS: Dict[str, List[Tuple[int, int, str]]] = {
    "pm25": [
        (0, 10, "good"),
        (11, 20, "fair"),
        (21, 25, "moderate"),
        (26, 50, "poor"),
        (51, 800, "very_poor"),
    ],
    "pm10": [
        (0, 20, "good"),
        (21, 40, "fair"),
        (41, 50, "moderate"),
        (51, 100, "poor"),
        (101, 1200, "very_poor"),
    ],
    "no2": [
        (0, 40, "good"),
        (41, 90, "fair"),
        (91, 120, "moderate"),
        (121, 230, "poor"),
        (231, 340, "very_poor"),
    ],
    "o3": [
        (0, 50, "good"),
        (51, 100, "fair"),
        (101, 130, "moderate"),
        (131, 240, "poor"),
        (241, 380, "very_poor"),
    ],
    "so2": [
        (0, 100, "good"),
        (101, 200, "fair"),
        (201, 350, "moderate"),
        (351, 500, "poor"),
        (501, 1250, "very_poor"),
    ],
}

# Canadian AQHI risk categories (simplified, based on combined pollutants)
AQHI_RISK_LEVELS: List[Tuple[int, int, str]] = [
    (1, 3, "low"),
    (4, 6, "moderate"),
    (7, 10, "high"),
    (11, 50, "very_high"),
]


def _calculate_epa_aqi(concentration: float, pollutant: str) -> Optional[int]:
    """Calculate EPA AQI for a single pollutant concentration."""
    breakpoints = EPA_BREAKPOINTS.get(pollutant.lower())
    if breakpoints is None:
        return None
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= concentration <= c_high:
            if c_high == c_low:
                return i_low
            aqi = ((i_high - i_low) / (c_high - c_low)) * (concentration - c_low) + i_low
            return max(0, round(aqi))
    # Above highest breakpoint
    last = breakpoints[-1]
    if concentration > last[1]:
        return last[3]  # Return max AQI for that breakpoint
    return None


def _calculate_nowcast_aqi(readings: List[Tuple[datetime, float]], pollutant: str) -> Optional[int]:
    """Calculate NowCast AQI using weighted recent readings.

    NowCast uses a weighted average of the last 12 hours, with more weight
    on recent hours when data is variable (high coefficient of variation).
    """
    if not readings:
        return None
    # Sort by time ascending
    readings_sorted = sorted(readings, key=lambda r: r[0])
    values = [r[1] for r in readings_sorted]
    if not values:
        return None

    # For simplicity, use the most recent reading if we have fewer than 2
    if len(values) < 2:
        return _calculate_epa_aqi(values[-1], pollutant)

    # Calculate coefficient of variation for weighting
    mean_val = sum(values) / len(values)
    if mean_val == 0:
        return _calculate_epa_aqi(values[-1], pollutant)
    variance = sum((v - mean_val) ** 2 for v in values) / len(values)
    std_dev = math.sqrt(variance)
    cv = std_dev / mean_val

    # Weight factor: higher CV = more weight on recent data
    w = max(0.5, min(1.0, 1.0 - cv))
    weights = [w ** i for i in range(len(values))]
    weights.reverse()  # Most recent gets highest weight
    weighted_sum = sum(v * wt for v, wt in zip(values, weights))
    weight_total = sum(weights)
    weighted_avg = weighted_sum / weight_total if weight_total > 0 else values[-1]

    return _calculate_epa_aqi(weighted_avg, pollutant)


def _calculate_eaqi_index(concentration: float, pollutant: str) -> Optional[str]:
    """Return European EAQI qualitative index level."""
    levels = EAQI_LEVELS.get(pollutant.lower())
    if levels is None:
        return None
    for low, high, level in levels:
        if low <= concentration <= high:
            return level
    return "very_poor"


def _calculate_aqhi(pm25: float, o3: float, no2: float) -> Optional[int]:
    """Calculate Canadian AQHI using simplified formula.

    Reference: AQHI = round(10/10.4 * (1000 * (exp(0.000537*O3) - 1) +
                                      1000 * (exp(0.000871*NO2) - 1) +
                                      1000 * (exp(0.000487*PM25) - 1)))
    Simplified for practical use.
    """
    try:
        risk = (
            1000 * (math.exp(0.000537 * o3) - 1)
            + 1000 * (math.exp(0.000871 * no2) - 1)
            + 1000 * (math.exp(0.000487 * pm25) - 1)
        )
        aqhi = round((10.0 / 10.4) * risk)
        return max(1, min(aqhi, 50))
    except (ValueError, OverflowError):
        return None


def _get_aqhi_risk(aqhi: int) -> str:
    for low, high, risk in AQHI_RISK_LEVELS:
        if low <= aqhi <= high:
            return risk
    return "very_high"


def _get_epa_category(aqi: int) -> str:
    if aqi <= 50:
        return "good"
    if aqi <= 100:
        return "moderate"
    if aqi <= 150:
        return "unhealthy_for_sensitive"
    if aqi <= 200:
        return "unhealthy"
    if aqi <= 300:
        return "very_unhealthy"
    return "hazardous"


class AQICalculator:
    """Service class for calculating air quality indices."""

    @staticmethod
    def calculate_epa(
        concentrations: Dict[str, float]
    ) -> Dict[str, any]:
        """Calculate EPA AQI for each pollutant and return overall."""
        results = {}
        max_aqi = 0
        max_pollutant = None

        for pollutant, concentration in concentrations.items():
            aqi = _calculate_epa_aqi(concentration, pollutant)
            if aqi is not None:
                results[pollutant] = {
                    "aqi": aqi,
                    "concentration": concentration,
                    "category": _get_epa_category(aqi),
                }
                if aqi > max_aqi:
                    max_aqi = aqi
                    max_pollutant = pollutant

        return {
            "overall_aqi": max_aqi,
            "dominant_pollutant": max_pollutant,
            "category": _get_epa_category(max_aqi),
            "pollutants": results,
            "standard": "EPA",
        }

    @staticmethod
    def calculate_nowcast(
        readings: Dict[str, List[Tuple[datetime, float]]]
    ) -> Dict[str, any]:
        """Calculate NowCast AQI for real-time display."""
        results = {}
        max_aqi = 0
        max_pollutant = None

        for pollutant, reading_list in readings.items():
            aqi = _calculate_nowcast_aqi(reading_list, pollutant)
            if aqi is not None:
                results[pollutant] = {
                    "aqi": aqi,
                    "category": _get_epa_category(aqi),
                }
                if aqi > max_aqi:
                    max_aqi = aqi
                    max_pollutant = pollutant

        return {
            "overall_aqi": max_aqi,
            "dominant_pollutant": max_pollutant,
            "category": _get_epa_category(max_aqi),
            "pollutants": results,
            "standard": "EPA_NowCast",
        }

    @staticmethod
    def calculate_eaqi(
        concentrations: Dict[str, float]
    ) -> Dict[str, any]:
        """Calculate European EAQI."""
        results = {}
        worst_level = "good"
        level_order = ["good", "fair", "moderate", "poor", "very_poor"]

        for pollutant, concentration in concentrations.items():
            level = _calculate_eaqi_index(concentration, pollutant)
            if level is not None:
                results[pollutant] = {
                    "level": level,
                    "concentration": concentration,
                }
                if level_order.index(level) > level_order.index(worst_level):
                    worst_level = level

        return {
            "overall_level": worst_level,
            "pollutants": results,
            "standard": "EAQI",
        }

    @staticmethod
    def calculate_aqhi(
        pm25: float, o3: float, no2: float
    ) -> Dict[str, any]:
        """Calculate Canadian AQHI."""
        aqhi = _calculate_aqhi(pm25, o3, no2)
        if aqhi is None:
            return {"standard": "AQHI", "error": "Calculation failed"}
        return {
            "aqhi": aqhi,
            "risk": _get_aqhi_risk(aqhi),
            "standard": "AQHI",
        }

    @staticmethod
    def calculate_all(
        concentrations: Dict[str, float],
        nowcast_readings: Optional[Dict[str, List[Tuple[datetime, float]]]] = None,
    ) -> Dict[str, any]:
        """Calculate all supported AQI standards."""
        result = {
            "epa": AQICalculator.calculate_epa(concentrations),
            "eaqi": AQICalculator.calculate_eaqi(concentrations),
        }
        if nowcast_readings:
            result["nowcast"] = AQICalculator.calculate_nowcast(nowcast_readings)
        if all(k in concentrations for k in ("pm25", "o3", "no2")):
            result["aqhi"] = AQICalculator.calculate_aqhi(
                concentrations["pm25"],
                concentrations["o3"],
                concentrations["no2"],
            )
        return result
