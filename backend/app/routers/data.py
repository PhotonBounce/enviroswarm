"""Data query router."""

import math
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import SensorReading, SensorStation, User
from app.schemas import (
    StandardResponse,
    DataQueryResponse,
    NearbyStationResponse,
    SENSOR_TYPES,
)

router = APIRouter(prefix="/data", tags=["data"])


@router.get("", response_model=StandardResponse)
async def query_data(
    station_id: Optional[UUID] = Query(None),
    sensor_type: Optional[str] = Query(None, pattern="^(air_quality|temperature|humidity|noise_level|radiation|water_quality|co2|pm25|pm10|voc)$"),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    aggregate: Optional[str] = Query(None, pattern="^(none|hour|day|month)$"),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    # Retention check based on tier
    retention_days = {"free": 7, "pro": 90, "enterprise": 730}
    max_retention = retention_days.get(user.tier, 7)
    earliest_allowed = datetime.now(timezone.utc) - timedelta(days=max_retention)
    if start:
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        effective_start = max(start, earliest_allowed)
    else:
        effective_start = earliest_allowed

    if aggregate and aggregate != "none":
        # Aggregation query using date_trunc
        trunc_map = {"hour": "hour", "day": "day", "month": "month"}
        trunc_unit = trunc_map[aggregate]

        stmt = (
            select(
                func.date_trunc(trunc_unit, SensorReading.timestamp).label("bucket"),
                func.avg(SensorReading.value).label("avg_value"),
                func.min(SensorReading.value).label("min_value"),
                func.max(SensorReading.value).label("max_value"),
                func.count(SensorReading.id).label("count"),
                SensorReading.sensor_type,
                SensorReading.unit,
            )
            .join(SensorStation)
            .where(SensorStation.user_id == user.id)
            .where(SensorStation.deleted_at.is_(None))
            .where(SensorReading.deleted_at.is_(None))
            .where(SensorReading.timestamp >= effective_start)
            .group_by(
                func.date_trunc(trunc_unit, SensorReading.timestamp),
                SensorReading.sensor_type,
                SensorReading.unit,
            )
            .order_by("bucket")
            .limit(limit)
            .offset(offset)
        )

        if station_id:
            stmt = stmt.where(SensorReading.station_id == station_id)
        if sensor_type:
            stmt = stmt.where(SensorReading.sensor_type == sensor_type)
        if end:
            stmt = stmt.where(SensorReading.timestamp <= end)

        result = await db.execute(stmt)
        rows = result.all()
        data = [
            {
                "bucket": r.bucket.isoformat() if r.bucket else None,
                "avg_value": round(r.avg_value, 6) if r.avg_value else None,
                "min_value": r.min_value,
                "max_value": r.max_value,
                "count": r.count,
                "sensor_type": r.sensor_type,
                "unit": r.unit,
            }
            for r in rows
        ]
        return StandardResponse(
            data=data,
            meta={"page": (offset // limit) + 1, "limit": limit, "total": None},
        )

    # Raw query
    stmt = (
        select(SensorReading)
        .join(SensorStation)
        .where(SensorStation.user_id == user.id)
        .where(SensorStation.deleted_at.is_(None))
        .where(SensorReading.deleted_at.is_(None))
        .where(SensorReading.timestamp >= effective_start)
    )
    if station_id:
        stmt = stmt.where(SensorReading.station_id == station_id)
    if sensor_type:
        stmt = stmt.where(SensorReading.sensor_type == sensor_type)
    if end:
        stmt = stmt.where(SensorReading.timestamp <= end)

    # Count total for pagination
    count_stmt = stmt.with_only_columns(func.count(SensorReading.id), maintain_order_from=False)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one() or 0

    stmt = stmt.order_by(SensorReading.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return StandardResponse(
        data=[DataQueryResponse.model_validate(r).model_dump(mode="json") for r in rows],
        meta={"page": (offset // limit) + 1, "limit": limit, "total": total},
    )


@router.get("/nearby", response_model=StandardResponse)
async def nearby(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, ge=0.1, le=500),
    sensor_type: Optional[str] = Query(None, pattern="^(air_quality|temperature|humidity|noise_level|radiation|water_quality|co2|pm25|pm10|voc)$"),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Find stations near a lat/lon using haversine formula (Python side).
    In production with PostGIS, use ST_DWithin."""

    # Use a SQL bounding box to avoid loading all stations into memory
    lat_margin = radius_km / 111.0
    cos_lat = math.cos(math.radians(lat))
    # Guard against cos(lat) approaching 0 at the poles
    if abs(cos_lat) < 1e-6:
        lon_margin = 180.0
    else:
        lon_margin = radius_km / (111.32 * cos_lat)
    lon_margin = min(lon_margin, 180.0)

    stmt = (
        select(SensorStation)
        .where(SensorStation.user_id == user.id)
        .where(SensorStation.deleted_at.is_(None))
        .where(SensorStation.latitude.isnot(None))
        .where(SensorStation.longitude.isnot(None))
        .where(
            and_(
                SensorStation.latitude >= lat - lat_margin,
                SensorStation.latitude <= lat + lat_margin,
                SensorStation.longitude >= lon - lon_margin,
                SensorStation.longitude <= lon + lon_margin,
            )
        )
    )
    if sensor_type:
        # JSON contains check removed; Python-side filter below handles this.
        pass

    result = await db.execute(stmt)
    stations = result.scalars().all()

    nearby_stations = []
    for s in stations:
        if s.latitude is None or s.longitude is None:
            continue
        if sensor_type and sensor_type not in s.sensor_types:
            continue

        d = _haversine(lat, lon, float(s.latitude), float(s.longitude))
        if d <= radius_km:
            item = NearbyStationResponse(
                id=s.id,
                name=s.name,
                latitude=float(s.latitude) if s.latitude else None,
                longitude=float(s.longitude) if s.longitude else None,
                sensor_types=s.sensor_types,
                distance_km=round(d, 2),
            )
            nearby_stations.append(item.model_dump(mode="json"))

    nearby_stations.sort(key=lambda x: x["distance_km"] or float("inf"))
    return StandardResponse(data=nearby_stations)


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
