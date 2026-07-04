"""Predictive analytics router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import SensorStation, User
from app.schemas import (
    StandardResponse,
    ForecastResponse,
    AnomalyResponse,
    SENSOR_TYPES,
)
from app.services.analytics import forecast_linear, detect_anomalies_iqr

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/forecast/{station_id}", response_model=StandardResponse)
async def get_forecast(
    station_id: UUID,
    sensor_type: str = Query(..., pattern=f'^({"|".join(SENSOR_TYPES)})$'),
    horizon: str = Query("24h", pattern="^(24h|7d)$"),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Return linear-regression forecast for a station and sensor type."""
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

    horizon_hours = 24 if horizon == "24h" else 168
    points = await forecast_linear(db, str(station_id), sensor_type, horizon_hours)

    forecast = ForecastResponse(
        station_id=station_id,
        sensor_type=sensor_type,
        horizon=horizon,
        points=points,
    )
    return StandardResponse(data=forecast.model_dump(mode="json"))


@router.get("/anomalies/{station_id}", response_model=StandardResponse)
async def get_anomalies(
    station_id: UUID,
    sensor_type: str = Query(..., pattern=f'^({"|".join(SENSOR_TYPES)})$'),
    hours: int = Query(24, ge=1, le=168),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Detect outliers using the IQR method."""
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

    anomalies, total = await detect_anomalies_iqr(db, str(station_id), sensor_type, hours)

    response = AnomalyResponse(
        station_id=station_id,
        sensor_type=sensor_type,
        anomalies=anomalies,
        total_readings=total,
        anomaly_count=len(anomalies),
    )
    return StandardResponse(data=response.model_dump(mode="json"))
