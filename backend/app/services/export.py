"""Export services for scientific data formats."""

import json
import logging
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SensorReading, SensorStation

logger = logging.getLogger(__name__)


async def export_geojson(
    db: AsyncSession,
    user_id: str,
    station_id: Optional[str] = None,
    sensor_type: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> Dict[str, any]:
    """Export sensor readings as GeoJSON FeatureCollection."""
    stmt = (
        select(SensorReading, SensorStation.latitude, SensorStation.longitude, SensorStation.name)
        .join(SensorStation)
        .where(SensorStation.user_id == user_id)
        .where(SensorStation.deleted_at.is_(None))
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )

    if station_id is not None:
        stmt = stmt.where(SensorReading.station_id == station_id)
    if sensor_type is not None:
        stmt = stmt.where(SensorReading.sensor_type == sensor_type)
    if start is not None:
        stmt = stmt.where(SensorReading.timestamp >= start)
    if end is not None:
        stmt = stmt.where(SensorReading.timestamp <= end)

    result = await db.execute(stmt)
    rows = result.all()

    features = []
    for reading, lat, lon, station_name in rows:
        if lat is None or lon is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(lon), float(lat)],
            },
            "properties": {
                "station_id": str(reading.station_id),
                "station_name": station_name,
                "sensor_type": reading.sensor_type,
                "value": float(reading.value),
                "unit": reading.unit,
                "timestamp": reading.timestamp.isoformat(),
                "metadata": reading.reading_metadata,
            },
        })

    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "record_count": len(features),
        },
    }
    return geojson


async def export_netcdf(
    db: AsyncSession,
    user_id: str,
    station_id: Optional[str] = None,
    sensor_type: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> Dict[str, any]:
    """Export sensor readings as NetCDF-like JSON structure.

    Since NetCDF requires binary libraries (netcdf4/h5py), this returns a
    CF-compliant JSON representation that can be converted to NetCDF.
    """
    stmt = (
        select(SensorReading, SensorStation.latitude, SensorStation.longitude, SensorStation.name)
        .join(SensorStation)
        .where(SensorStation.user_id == user_id)
        .where(SensorStation.deleted_at.is_(None))
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )

    if station_id is not None:
        stmt = stmt.where(SensorReading.station_id == station_id)
    if sensor_type is not None:
        stmt = stmt.where(SensorReading.sensor_type == sensor_type)
    if start is not None:
        stmt = stmt.where(SensorReading.timestamp >= start)
    if end is not None:
        stmt = stmt.where(SensorReading.timestamp <= end)

    result = await db.execute(stmt)
    rows = result.all()

    timestamps = []
    values = []
    lats = []
    lons = []
    sensor_types = []
    units = []
    station_ids = []

    for reading, lat, lon, station_name in rows:
        timestamps.append(reading.timestamp.isoformat())
        values.append(float(reading.value))
        lats.append(float(lat) if lat is not None else 0.0)
        lons.append(float(lon) if lon is not None else 0.0)
        sensor_types.append(reading.sensor_type)
        units.append(reading.unit)
        station_ids.append(str(reading.station_id))

    return {
        "conventions": "CF-1.8",
        "title": "ENViroSwarm Sensor Data Export",
        "institution": "ENViroSwarm",
        "source": "Environmental sensor network",
        "history": f"Generated at {datetime.now(timezone.utc).isoformat()}",
        "dimensions": {
            "time": len(timestamps),
            "station": len(set(station_ids)),
        },
        "variables": {
            "time": {
                "dimensions": ["time"],
                "type": "str",
                "attributes": {"long_name": "timestamp", "calendar": "gregorian"},
                "data": timestamps,
            },
            "value": {
                "dimensions": ["time"],
                "type": "float64",
                "attributes": {"long_name": "sensor reading value"},
                "data": values,
            },
            "latitude": {
                "dimensions": ["time"],
                "type": "float64",
                "attributes": {"long_name": "latitude", "units": "degrees_north"},
                "data": lats,
            },
            "longitude": {
                "dimensions": ["time"],
                "type": "float64",
                "attributes": {"long_name": "longitude", "units": "degrees_east"},
                "data": lons,
            },
            "sensor_type": {
                "dimensions": ["time"],
                "type": "str",
                "attributes": {"long_name": "sensor type"},
                "data": sensor_types,
            },
            "unit": {
                "dimensions": ["time"],
                "type": "str",
                "attributes": {"long_name": "measurement unit"},
                "data": units,
            },
            "station_id": {
                "dimensions": ["time"],
                "type": "str",
                "attributes": {"long_name": "station identifier"},
                "data": station_ids,
            },
        },
        "metadata": {
            "record_count": len(timestamps),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


async def export_geotiff(
    db: AsyncSession,
    user_id: str,
    sensor_type: str,
    bbox: Optional[List[float]] = None,
    width: int = 256,
    height: int = 256,
) -> Dict[str, any]:
    """Export sensor data as GeoTIFF-like JSON structure.

    Since GeoTIFF requires rasterio/GDAL, this returns a GeoTIFF-compatible
    JSON structure with raster grid data that can be converted to TIFF.
    """
    stmt = (
        select(SensorReading, SensorStation.latitude, SensorStation.longitude)
        .join(SensorStation)
        .where(SensorStation.user_id == user_id)
        .where(SensorStation.deleted_at.is_(None))
        .where(SensorReading.deleted_at.is_(None))
        .where(SensorReading.sensor_type == sensor_type)
        .order_by(SensorReading.timestamp.desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return {
            "error": "No data for GeoTIFF export",
            "sensor_type": sensor_type,
        }

    # Determine bounding box
    lats = [float(r[1]) for r in rows if r[1] is not None]
    lons = [float(r[2]) for r in rows if r[2] is not None]

    if bbox:
        min_lon, min_lat, max_lon, max_lat = bbox
    else:
        min_lat = min(lats) if lats else 0.0
        max_lat = max(lats) if lats else 0.0
        min_lon = min(lons) if lons else 0.0
        max_lon = max(lons) if lons else 0.0

    # Create simple raster grid (average value per cell)
    lat_step = (max_lat - min_lat) / height if height > 0 and max_lat != min_lat else 1.0
    lon_step = (max_lon - min_lon) / width if width > 0 and max_lon != min_lon else 1.0

    grid = [[None for _ in range(width)] for _ in range(height)]
    counts = [[0 for _ in range(width)] for _ in range(height)]

    for reading, lat, lon in rows:
        if lat is None or lon is None:
            continue
        x = int((lon - min_lon) / lon_step) if lon_step != 0 else 0
        y = int((max_lat - lat) / lat_step) if lat_step != 0 else 0
        x = max(0, min(x, width - 1))
        y = max(0, min(y, height - 1))
        if grid[y][x] is None:
            grid[y][x] = 0.0
        grid[y][x] += float(reading.value)
        counts[y][x] += 1

    # Average cells
    for y in range(height):
        for x in range(width):
            if counts[y][x] > 0 and grid[y][x] is not None:
                grid[y][x] = round(grid[y][x] / counts[y][x], 6)
            else:
                grid[y][x] = None  # NoData

    return {
        "format": "GeoTIFF-JSON",
        "width": width,
        "height": height,
        "crs": "EPSG:4326",
        "bbox": [min_lon, min_lat, max_lon, max_lat],
        "geotransform": [min_lon, lon_step, 0, max_lat, 0, -lat_step],
        "nodata_value": None,
        "bands": [
            {
                "band": 1,
                "sensor_type": sensor_type,
                "data": grid,
            }
        ],
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "record_count": len(rows),
        },
    }


async def export_csv(
    db: AsyncSession,
    user_id: str,
    station_id: Optional[str] = None,
    sensor_type: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> str:
    """Export sensor readings as CSV string."""
    stmt = (
        select(SensorReading, SensorStation.latitude, SensorStation.longitude, SensorStation.name)
        .join(SensorStation)
        .where(SensorStation.user_id == user_id)
        .where(SensorStation.deleted_at.is_(None))
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )

    if station_id is not None:
        stmt = stmt.where(SensorReading.station_id == station_id)
    if sensor_type is not None:
        stmt = stmt.where(SensorReading.sensor_type == sensor_type)
    if start is not None:
        stmt = stmt.where(SensorReading.timestamp >= start)
    if end is not None:
        stmt = stmt.where(SensorReading.timestamp <= end)

    result = await db.execute(stmt)
    rows = result.all()

    lines = ["timestamp,station_id,station_name,latitude,longitude,sensor_type,value,unit"]
    for reading, lat, lon, station_name in rows:
        lines.append(
            f"{reading.timestamp.isoformat()},{reading.station_id},{station_name or ''},"
            f"{lat or ''},{lon or ''},{reading.sensor_type},{reading.value},{reading.unit}"
        )
    return "\n".join(lines)
