"""OpenAQ integration router."""

from typing import Optional, List
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User, SensorStation, SensorReading
from app.schemas import StandardResponse
from app.services.openaq import get_nearby_locations, compare_with_openaq

router = APIRouter(prefix="/openaq", tags=["openaq"])


class CompareRequest(BaseModel):
    station_id: str
    hours: int = Field(default=24, ge=1, le=168)
    radius_km: int = Field(default=25, ge=1, le=500)


@router.get("/locations", response_model=StandardResponse)
async def openaq_locations(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: int = Query(25, ge=1, le=500),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Find nearby public air quality monitoring stations from OpenAQ."""
    locations = await get_nearby_locations(lat, lon, radius_km=radius_km)
    return StandardResponse(data=locations)


@router.get("/compare", response_model=StandardResponse)
async def openaq_compare(
    station_id: str = Query(...),
    hours: int = Query(24, ge=1, le=168),
    radius_km: int = Query(25, ge=1, le=500),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Compare user station data against nearby OpenAQ public stations."""
    # Verify station ownership
    result = await db.execute(
        select(SensorStation).where(
            SensorStation.id == station_id,
            SensorStation.user_id == user.id,
            SensorStation.deleted_at.is_(None),
        )
    )
    station = result.scalar_one_or_none()
    if station is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Station not found"
        )

    if station.latitude is None or station.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Station has no geographic coordinates",
        )

    # Fetch recent user readings
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    readings_result = await db.execute(
        select(SensorReading)
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.timestamp >= cutoff)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.desc())
    )
    readings = readings_result.scalars().all()
    user_readings = [
        {
            "sensor_type": r.sensor_type,
            "value": float(r.value),
            "unit": r.unit,
            "timestamp": r.timestamp.isoformat(),
        }
        for r in readings
    ]

    comparison = await compare_with_openaq(
        user_readings,
        float(station.latitude),
        float(station.longitude),
        radius_km=radius_km,
    )
    return StandardResponse(data=comparison)
