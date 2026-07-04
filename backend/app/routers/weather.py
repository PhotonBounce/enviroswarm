"""Weather overlay router."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User
from app.schemas import StandardResponse
from app.services.weather import (
    get_weather_overlay,
    get_weather_forecast_overlay,
    get_current_air_pollution,
)

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/{lat}/{lon}", response_model=StandardResponse)
async def get_weather(
    lat: float,
    lon: float,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Get current weather and air pollution overlay for a location."""
    data = await get_weather_overlay(lat, lon)
    if not data.get("weather") and not data.get("air_pollution"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service unavailable or API key not configured",
        )
    return StandardResponse(data=data)


@router.get("/forecast/{lat}/{lon}", response_model=StandardResponse)
async def get_weather_forecast(
    lat: float,
    lon: float,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Get air pollution forecast for a location."""
    data = await get_weather_forecast_overlay(lat, lon)
    if not data.get("air_pollution_forecast"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather forecast service unavailable or API key not configured",
        )
    return StandardResponse(data=data)
