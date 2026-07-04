"""OpenAQ public air quality data integration."""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

OPENAQ_BASE_URL = "https://api.openaq.org/v2"


async def _fetch_openaq(endpoint: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Make an async HTTP request to OpenAQ API v2."""
    url = f"{OPENAQ_BASE_URL}/{endpoint}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        logger.warning("OpenAQ HTTP error: %s", exc.response.status_code)
        return None
    except httpx.RequestError as exc:
        logger.warning("OpenAQ request error: %s", exc)
        return None


async def get_nearby_locations(
    lat: float, lon: float, radius_km: int = 25, limit: int = 20
) -> List[Dict[str, Any]]:
    """Fetch nearby public air quality monitoring locations from OpenAQ."""
    # OpenAQ uses radius in meters
    radius_m = radius_km * 1000
    params = {
        "coordinates": f"{lat},{lon}",
        "radius": radius_m,
        "limit": limit,
        "order_by": "distance",
        "sort": "asc",
    }
    data = await _fetch_openaq("locations", params)
    if not data or "results" not in data:
        return []

    locations = []
    for result in data["results"]:
        loc = {
            "id": result.get("id"),
            "name": result.get("name"),
            "city": result.get("city"),
            "country": result.get("country"),
            "latitude": result.get("coordinates", {}).get("latitude"),
            "longitude": result.get("coordinates", {}).get("longitude"),
            "distance_km": _haversine(lat, lon,
                result.get("coordinates", {}).get("latitude", lat),
                result.get("coordinates", {}).get("longitude", lon)),
            "sensor_types": [m.get("parameter") for m in result.get("measurements", [])],
            "last_updated": result.get("lastUpdated"),
        }
        locations.append(loc)
    return locations


async def get_latest_measurements(location_id: int) -> List[Dict[str, Any]]:
    """Fetch latest measurements for a specific OpenAQ location."""
    params = {
        "location_id": location_id,
        "limit": 100,
        "order_by": "datetime",
        "sort": "desc",
    }
    data = await _fetch_openaq("latest", params)
    if not data or "results" not in data:
        return []

    measurements = []
    for result in data["results"]:
        for m in result.get("measurements", []):
            measurements.append({
                "parameter": m.get("parameter"),
                "value": m.get("value"),
                "unit": m.get("unit"),
                "timestamp": m.get("lastUpdated"),
                "source_name": result.get("sourceName"),
            })
    return measurements


async def compare_with_openaq(
    user_readings: List[Dict[str, Any]],
    lat: float,
    lon: float,
    radius_km: int = 25,
) -> Dict[str, Any]:
    """Compare user sensor readings against nearby OpenAQ public stations."""
    locations = await get_nearby_locations(lat, lon, radius_km=radius_km, limit=5)
    if not locations:
        return {"error": "No nearby OpenAQ stations found", "comparison": []}

    comparisons = []
    for loc in locations:
        loc_measurements = await get_latest_measurements(loc["id"])
        for user_reading in user_readings:
            param = user_reading.get("sensor_type", "").lower()
            # Map sensor types to OpenAQ parameters
            param_map = {
                "pm25": "pm25",
                "pm10": "pm10",
                "co2": "co2",
                "no2": "no2",
                "so2": "so2",
                "o3": "o3",
            }
            oaq_param = param_map.get(param)
            if not oaq_param:
                continue
            matching = [m for m in loc_measurements if m.get("parameter", "").lower() == oaq_param]
            if matching:
                oaq_val = matching[0]["value"]
                user_val = user_reading.get("value", 0)
                unit = user_reading.get("unit", "")
                diff = user_val - oaq_val
                diff_pct = (diff / oaq_val * 100.0) if oaq_val != 0 else None
                comparisons.append({
                    "parameter": param,
                    "user_value": user_val,
                    "user_unit": unit,
                    "openaq_station": loc["name"],
                    "openaq_value": oaq_val,
                    "openaq_unit": matching[0].get("unit"),
                    "absolute_difference": round(diff, 4),
                    "percent_difference": round(diff_pct, 2) if diff_pct is not None else None,
                    "distance_km": round(loc.get("distance_km", 0), 2),
                })

    return {
        "nearby_stations": locations,
        "comparison": comparisons,
        "compared_at": datetime.now(timezone.utc).isoformat(),
    }


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    a = min(1.0, max(0.0, a))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
