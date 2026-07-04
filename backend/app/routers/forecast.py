"""Forecasting router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import SensorStation, User
from app.schemas import StandardResponse, SENSOR_TYPES
from app.services.forecast import generate_forecast

router = APIRouter(prefix="/stations", tags=["forecast"])


@router.get("/{station_id}/forecast", response_model=StandardResponse)
async def get_forecast(
    station_id: UUID,
    sensor_type: str = Query(..., pattern=f'^({"|".join(SENSOR_TYPES)})$'),
    horizon: str = Query("24h", pattern="^(24h|7d)$"),
    method: str = Query("linear", pattern="^(linear|moving_average)$"),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Generate forecast for a station using linear regression or moving average."""
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

    forecast = await generate_forecast(db, str(station_id), sensor_type, horizon, method)
    return StandardResponse(data=forecast)
