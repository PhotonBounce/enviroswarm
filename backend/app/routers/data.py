"""Data query router."""

import math
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.dependencies import rate_limit_dependency
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
    station_id: Optional[str] = Query(None),
    sensor_type: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    aggregate: Optional[str] = Query(None, pattern="^(none|hour|day|month)$"),
    user: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    # Build query
    stmt = select(SensorReading).join(SensorStation).where(
        SensorStation.user_id == user.id
    )
    if station_id:
        stmt = stmt.where(SensorReading.station_id == station_id)
    if sensor_type:
        stmt = stmt.where(SensorReading.sensor_type == sensor_type)
    if start:
        stmt = stmt.where(SensorReading.timestamp >= start)
    if end:
        stmt = stmt.where(SensorReading.timestamp <= end)

    # Retention check based on tier
    retention_days = {"free": 7, "pro": 90, "enterprise": 730}
    max_retention = retention_days.get(user.tier, 7)
    earliest_allowed = datetime.now(timezone.utc) - timedelta(days=max_retention)
    if not start or start < earliest_allowed:
        stmt = stmt.where(SensorReading.timestamp >= earliest_allowed)

    if aggregate and aggregate != "none":
        # Return raw for MVP; aggregation requires TimescaleDB functions or Python grouping
        pass

    stmt = stmt.order_by(SensorReading.timestamp.desc()).limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return StandardResponse(
        data=[DataQueryResponse.model_validate(r).model_dump(mode="json") for r in rows],
        meta={"page": 1, "limit": limit, "total": len(rows)},
    )


@router.get("/nearby", response_model=StandardResponse)
async def nearby(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, ge=0.1, le=500),
    sensor_type: Optional[str] = Query(None),
    user: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Find stations near a lat/lon using haversine formula (Python side).
    In production with PostGIS, use ST_DWithin."""

    result = await db.execute(select(SensorStation))
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
