"""Weather and air pollution overlay service using OpenWeatherMap."""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# In-memory TTL cache for weather data (fallback when Redis is unavailable)
_weather_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = asyncio.Lock()
CACHE_TTL_SECONDS = 600  # 10 minutes

OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
OPENWEATHER_AIR_URL = "https://api.openweathermap.org/data/2.5/air_pollution"


def _cache_key(lat: float, lon: float, endpoint: str) -> str:
    return f"weather:{endpoint}:{lat:.4f}:{lon:.4f}"


async def _get_cached(key: str) -> Optional[Dict[str, Any]]:
    async with _cache_lock:
        entry = _weather_cache.get(key)
        if entry is None:
            return None
        if datetime.now(timezone.utc) > entry["expires_at"]:
            del _weather_cache[key]
            return None
        return entry["data"]


async def _set_cached(key: str, data: Dict[str, Any], ttl: int = CACHE_TTL_SECONDS) -> None:
    async with _cache_lock:
        _weather_cache[key] = {
            "data": data,
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=ttl),
        }


async def _fetch_owm(endpoint: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Make an async HTTP request to OpenWeatherMap."""
    settings = get_settings()
    api_key = getattr(settings, "openweather_api_key", None)
    if not api_key:
        logger.warning("OpenWeatherMap API key not configured")
        return None

    params = {**params, "appid": api_key}
    url = f"{OPENWEATHER_BASE_URL}/{endpoint}"
    if endpoint == "air_pollution":
        url = OPENWEATHER_AIR_URL
    elif endpoint == "air_pollution/forecast":
        url = f"{OPENWEATHER_AIR_URL}/forecast"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        logger.warning("OpenWeatherMap HTTP error: %s", exc.response.status_code)
        return None
    except httpx.RequestError as exc:
        logger.warning("OpenWeatherMap request error: %s", exc)
        return None


async def get_current_air_pollution(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Fetch current air pollution data from OpenWeatherMap."""
    cache_key = _cache_key(lat, lon, "current")
    cached = await _get_cached(cache_key)
    if cached is not None:
        return cached

    data = await _fetch_owm("air_pollution", {"lat": lat, "lon": lon})
    if data is not None:
        await _set_cached(cache_key, data, ttl=600)
    return data


async def get_air_pollution_forecast(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Fetch 5-day air pollution forecast from OpenWeatherMap."""
    cache_key = _cache_key(lat, lon, "forecast")
    cached = await _get_cached(cache_key)
    if cached is not None:
        return cached

    data = await _fetch_owm("air_pollution/forecast", {"lat": lat, "lon": lon})
    if data is not None:
        await _set_cached(cache_key, data, ttl=1800)
    return data


async def get_current_weather(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Fetch current weather conditions from OpenWeatherMap."""
    cache_key = _cache_key(lat, lon, "weather")
    cached = await _get_cached(cache_key)
    if cached is not None:
        return cached

    data = await _fetch_owm("weather", {"lat": lat, "lon": lon, "units": "metric"})
    if data is not None:
        await _set_cached(cache_key, data, ttl=600)
    return data


async def get_weather_overlay(lat: float, lon: float) -> Dict[str, Any]:
    """Combine weather and air pollution into a single overlay response."""
    weather_task = get_current_weather(lat, lon)
    pollution_task = get_current_air_pollution(lat, lon)
    weather, pollution = await asyncio.gather(weather_task, pollution_task)

    result: Dict[str, Any] = {
        "lat": lat,
        "lon": lon,
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }

    if weather:
        result["weather"] = {
            "temperature_c": weather.get("main", {}).get("temp"),
            "humidity_percent": weather.get("main", {}).get("humidity"),
            "pressure_hpa": weather.get("main", {}).get("pressure"),
            "wind_speed_mps": weather.get("wind", {}).get("speed"),
            "wind_deg": weather.get("wind", {}).get("deg"),
            "clouds_percent": weather.get("clouds", {}).get("all"),
            "visibility_m": weather.get("visibility"),
            "weather_description": weather.get("weather", [{}])[0].get("description"),
        }

    if pollution and "list" in pollution and pollution["list"]:
        entry = pollution["list"][0]
        components = entry.get("components", {})
        result["air_pollution"] = {
            "aqi": entry.get("main", {}).get("aqi"),
            "timestamp": datetime.fromtimestamp(entry.get("dt", 0), tz=timezone.utc).isoformat(),
            "components": {
                "co": components.get("co"),
                "no": components.get("no"),
                "no2": components.get("no2"),
                "o3": components.get("o3"),
                "so2": components.get("so2"),
                "pm25": components.get("pm2_5"),
                "pm10": components.get("pm10"),
                "nh3": components.get("nh3"),
            },
        }

    return result


async def get_weather_forecast_overlay(lat: float, lon: float) -> Dict[str, Any]:
    """Return forecasted air pollution and weather data."""
    pollution = await get_air_pollution_forecast(lat, lon)
    weather = await get_current_weather(lat, lon)

    result: Dict[str, Any] = {
        "lat": lat,
        "lon": lon,
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }

    if pollution and "list" in pollution:
        forecast_points = []
        for entry in pollution["list"]:
            components = entry.get("components", {})
            forecast_points.append({
                "timestamp": datetime.fromtimestamp(entry.get("dt", 0), tz=timezone.utc).isoformat(),
                "aqi": entry.get("main", {}).get("aqi"),
                "components": {
                    "co": components.get("co"),
                    "no": components.get("no"),
                    "no2": components.get("no2"),
                    "o3": components.get("o3"),
                    "so2": components.get("so2"),
                    "pm25": components.get("pm2_5"),
                    "pm10": components.get("pm10"),
                    "nh3": components.get("nh3"),
                },
            })
        result["air_pollution_forecast"] = forecast_points

    if weather:
        result["current_weather"] = {
            "temperature_c": weather.get("main", {}).get("temp"),
            "humidity_percent": weather.get("main", {}).get("humidity"),
            "pressure_hpa": weather.get("main", {}).get("pressure"),
            "wind_speed_mps": weather.get("wind", {}).get("speed"),
            "weather_description": weather.get("weather", [{}])[0].get("description"),
        }

    return result
