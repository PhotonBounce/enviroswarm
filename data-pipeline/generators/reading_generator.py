"""Reading generator — produce time-series sensor readings with realistic noise."""

import random
import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

import numpy as np


def _daily_seasonal_factor(hour: int, base_phase: float = 0.0) -> float:
    """Return a diurnal factor (-1 to 1) based on hour of day."""
    # Simple sinusoidal: coldest ~6am, warmest ~3pm (15h)
    phase = (hour - 6) / 24 * 2 * math.pi + base_phase
    return math.sin(phase)


def _temperature_value(
    timestamp: datetime,
    city: str,
    base_temp: Optional[float] = None,
) -> float:
    """Generate a realistic temperature value in °C."""
    # City-specific base temperature (approximate seasonal average)
    city_bases = {
        "New York City": 12.0,
        "Los Angeles": 18.0,
        "London": 11.0,
        "Tokyo": 16.0,
        "Berlin": 10.0,
    }
    base = base_temp if base_temp is not None else city_bases.get(city, 15.0)
    
    hour = timestamp.hour
    day_of_year = timestamp.timetuple().tm_yday
    
    # Seasonal variation (coldest in Jan, warmest in July)
    seasonal = -15 * math.cos((day_of_year - 15) / 365 * 2 * math.pi)
    
    # Diurnal variation
    diurnal = 8 * _daily_seasonal_factor(hour, base_phase=0.0)
    
    # Random noise
    noise = random.gauss(0, 2.5)
    
    value = base + seasonal + diurnal + noise
    return round(value, 2)


def _humidity_value(timestamp: datetime, temperature: float) -> float:
    """Generate humidity % roughly inversely correlated with temperature."""
    # Higher temp often means lower humidity (simplified)
    base = 70 - (temperature * 0.8)
    hour = timestamp.hour
    diurnal = 10 * math.sin((hour - 3) / 24 * 2 * math.pi)
    noise = random.gauss(0, 8)
    value = base + diurnal + noise
    return round(max(10.0, min(100.0, value)), 2)


def _co2_value(city: str) -> float:
    """Generate CO2 ppm. Urban areas are higher."""
    urban_bump = {"New York City": 50, "Los Angeles": 60, "London": 45, "Tokyo": 55, "Berlin": 40}
    base = 400 + urban_bump.get(city, 0)
    noise = random.gauss(0, 20)
    value = base + noise
    return round(max(350.0, min(600.0, value)), 2)


def _pm25_value(city: str) -> float:
    """Generate PM2.5 µg/m³."""
    urban_bump = {"New York City": 20, "Los Angeles": 35, "London": 18, "Tokyo": 22, "Berlin": 15}
    base = 10 + urban_bump.get(city, 0)
    noise = random.gauss(0, 15)
    # Occasional pollution spikes
    if random.random() < 0.05:
        noise += random.uniform(40, 80)
    value = base + noise
    return round(max(0.0, min(150.0, value)), 2)


def _pm10_value(pm25: float) -> float:
    """PM10 is generally larger than PM2.5."""
    ratio = random.uniform(1.2, 2.5)
    noise = random.gauss(0, 10)
    value = pm25 * ratio + noise
    return round(max(0.0, min(200.0, value)), 2)


def _noise_level_value(city: str, hour: int) -> float:
    """Generate noise level in dB."""
    base = 50 + {"New York City": 8, "Los Angeles": 6, "London": 7, "Tokyo": 10, "Berlin": 5}.get(city, 0)
    # Nighttime is quieter
    if 22 <= hour or hour < 6:
        base -= 12
    elif 6 <= hour < 9 or 17 <= hour < 20:
        base += 8  # rush hour
    noise = random.gauss(0, 6)
    value = base + noise
    return round(max(30.0, min(100.0, value)), 2)


def _radiation_value() -> float:
    """Generate radiation in µSv/h."""
    base = 0.10
    noise = random.gauss(0, 0.03)
    # Very rare cosmic spike
    if random.random() < 0.001:
        noise += 0.10
    value = base + noise
    return round(max(0.05, min(0.30, value)), 4)


def _air_quality_value(pm25: float, pm10: float) -> float:
    """Derive AQI-like value from particulate matter."""
    # Very rough approximation
    aqi = (pm25 * 2.0) + (pm10 * 0.5) + random.gauss(0, 10)
    return round(max(0.0, min(200.0, aqi)), 2)


def _water_quality_value() -> float:
    """Generate Water Quality Index (0-100, higher is better)."""
    base = 78.0
    noise = random.gauss(0, 12)
    if random.random() < 0.03:
        noise -= 30  # contamination event
    value = base + noise
    return round(max(0.0, min(100.0, value)), 2)


def _voc_value() -> float:
    """Generate VOC in ppb."""
    base = 200.0
    noise = random.gauss(0, 150)
    if random.random() < 0.04:
        noise += 400  # spike
    value = base + noise
    return round(max(50.0, min(1000.0, value)), 2)


def generate_readings_for_station(
    station: Dict[str, Any],
    days: int = 30,
    interval_minutes: int = 15,
    missing_rate: float = 0.03,
    outlier_rate: float = 0.01,
    end_time: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """Generate historical readings for a single station.
    
    Args:
        station: Station dict (must contain 'id', 'sensor_types', 'city', 'name').
        days: Number of days of history to generate.
        interval_minutes: Sampling interval.
        missing_rate: Fraction of readings to drop (simulate sensor failure).
        outlier_rate: Fraction of readings to make extreme outliers.
        end_time: The "now" timestamp. Defaults to UTC now.
    
    Returns:
        List of reading dicts ready for ingest.
    """
    if end_time is None:
        end_time = datetime.now(timezone.utc)
    
    start_time = end_time - timedelta(days=days)
    sensor_types = station.get("sensor_types", [])
    station_id = station.get("id")
    city = station.get("city", "Unknown")
    
    readings = []
    current = start_time
    
    # Precompute temperature for each timestep so humidity can correlate
    # This is a bit memory-heavy but keeps logic clean
    intervals = []
    while current <= end_time:
        intervals.append(current)
        current += timedelta(minutes=interval_minutes)
    
    # Generate per-interval, per-sensor
    for ts in intervals:
        # Simulate missing interval (whole timestamp dropped for all sensors)
        if random.random() < missing_rate:
            continue
        
        # Temperature first for correlation
        temp = None
        pm25 = None
        pm10 = None
        
        for st in sensor_types:
            value = None
            unit = ""
            
            if st == "temperature":
                value = _temperature_value(ts, city)
                unit = "°C"
                temp = value
            elif st == "humidity":
                value = _humidity_value(ts, temp if temp is not None else 15.0)
                unit = "%"
            elif st == "co2":
                value = _co2_value(city)
                unit = "ppm"
            elif st == "pm25":
                value = _pm25_value(city)
                unit = "µg/m³"
                pm25 = value
            elif st == "pm10":
                if pm25 is None:
                    pm25 = _pm25_value(city)
                value = _pm10_value(pm25)
                unit = "µg/m³"
                pm10 = value
            elif st == "noise_level":
                value = _noise_level_value(city, ts.hour)
                unit = "dB"
            elif st == "radiation":
                value = _radiation_value()
                unit = "µSv/h"
            elif st == "air_quality":
                if pm25 is None:
                    pm25 = _pm25_value(city)
                if pm10 is None:
                    pm10 = _pm10_value(pm25)
                value = _air_quality_value(pm25, pm10)
                unit = "AQI"
            elif st == "water_quality":
                value = _water_quality_value()
                unit = "WQI"
            elif st == "voc":
                value = _voc_value()
                unit = "ppb"
            else:
                value = random.uniform(0, 100)
                unit = "unit"
            
            # Inject outlier
            if random.random() < outlier_rate:
                outlier_multiplier = random.choice([5.0, -4.0, 10.0])
                value = value * outlier_multiplier
                # Clamp to reasonable bounds after outlier
                if st == "temperature":
                    value = max(-50.0, min(60.0, value))
                elif st == "humidity":
                    value = max(0.0, min(100.0, value))
                elif st == "co2":
                    value = max(300.0, min(2000.0, value))
                elif st in ("pm25", "pm10"):
                    value = max(0.0, min(500.0, value))
                elif st == "noise_level":
                    value = max(20.0, min(140.0, value))
                elif st == "radiation":
                    value = max(0.0, min(2.0, value))
                elif st == "air_quality":
                    value = max(0.0, min(500.0, value))
                elif st == "water_quality":
                    value = max(0.0, min(100.0, value))
                elif st == "voc":
                    value = max(0.0, min(5000.0, value))
            
            readings.append({
                "station_id": station_id,
                "sensor_type": st,
                "value": round(value, 4) if isinstance(value, float) else float(value),
                "unit": unit,
                "timestamp": ts.isoformat(),
                "metadata": {
                    "city": city,
                    "station_name": station.get("name", ""),
                    "simulated": True,
                },
            })
    
    return readings


def generate_all_readings(
    stations: List[Dict[str, Any]],
    days: int = 30,
    interval_minutes: int = 15,
    missing_rate: float = 0.03,
    outlier_rate: float = 0.01,
    end_time: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """Generate readings for all stations."""
    all_readings = []
    for station in stations:
        readings = generate_readings_for_station(
            station,
            days=days,
            interval_minutes=interval_minutes,
            missing_rate=missing_rate,
            outlier_rate=outlier_rate,
            end_time=end_time,
        )
        all_readings.extend(readings)
    return all_readings
