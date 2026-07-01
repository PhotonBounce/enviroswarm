"""Station factory — generate simulated sensor stations with realistic coordinates."""

import math
import random
import uuid
from typing import List, Dict, Any, Optional


# City centers with approximate lat/lon and approximate urban radius (km)
CITY_CLUSTERS = {
    "New York City": {"latitude": 40.7128, "longitude": -74.0060, "radius_km": 25},
    "Los Angeles": {"latitude": 34.0522, "longitude": -118.2437, "radius_km": 40},
    "London": {"latitude": 51.5074, "longitude": -0.1278, "radius_km": 30},
    "Tokyo": {"latitude": 35.6762, "longitude": 139.6503, "radius_km": 35},
    "Berlin": {"latitude": 52.5200, "longitude": 13.4050, "radius_km": 20},
}

SENSOR_TYPES = [
    "air_quality",
    "temperature",
    "humidity",
    "noise_level",
    "radiation",
    "water_quality",
    "co2",
    "pm25",
    "pm10",
    "voc",
]

STATION_NAMES = [
    "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel",
    "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa",
    "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-ray",
    "Yankee", "Zulu", "Aurora", "Borealis", "Cedar", "Dune", "Everest", "Flora",
    "Glacier", "Horizon", "Iris", "Jasper", "Kestrel", "Lagoon", "Meadow", "Nova",
    "Orbit", "Pulse", "Quasar", "Ridge", "Summit", "Tide", "Umbra", "Vista",
]


def _random_offset(latitude: float, longitude: float, radius_km: float) -> tuple[float, float]:
    """Generate a random point within a circle of radius_km around (lat, lon).
    
    Approximate: 1 deg lat ≈ 111 km, 1 deg lon ≈ 111 km * cos(lat).
    """
    r = radius_km * random.random() ** 0.5  # uniform distribution in circle
    theta = random.uniform(0, 2 * 3.141592653589793)
    lat_offset = (r * math.sin(theta)) / 111.0
    lon_offset = (r * math.cos(theta)) / (111.32 * math.cos(math.radians(latitude)))
    return latitude + lat_offset, longitude + lon_offset


def create_station(
    city_name: str,
    station_name: str,
    sensor_types: Optional[List[str]] = None,
    status: str = "active",
) -> Dict[str, Any]:
    """Create a single simulated station dict."""
    if sensor_types is None:
        # Pick a random subset of 4-8 sensor types
        k = random.randint(4, min(8, len(SENSOR_TYPES)))
        sensor_types = sorted(random.sample(SENSOR_TYPES, k))
    
    cluster = CITY_CLUSTERS[city_name]
    lat, lon = _random_offset(cluster["latitude"], cluster["longitude"], cluster["radius_km"])
    
    return {
        "id": str(uuid.uuid4()),
        "name": f"{station_name} ({city_name})",
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "sensor_types": sensor_types,
        "status": status,
        "city": city_name,
    }


def create_stations(
    total: int = 30,
    per_city: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Create a fleet of simulated stations distributed across cities.
    
    Args:
        total: Total number of stations to create. Defaults to 30.
        per_city: If provided, create exactly this many per city (overrides total).
    
    Returns:
        List of station dicts.
    """
    cities = list(CITY_CLUSTERS.keys())
    if per_city is not None:
        total = per_city * len(cities)
    
    stations = []
    name_pool = STATION_NAMES[:]
    random.shuffle(name_pool)
    name_idx = 0
    
    for i in range(total):
        city = cities[i % len(cities)]
        name = name_pool[name_idx % len(name_pool)]
        name_idx += 1
        stations.append(create_station(city, name))
    
    # Shuffle so they are not grouped by city in order
    random.shuffle(stations)
    return stations
