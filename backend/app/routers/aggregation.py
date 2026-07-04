"""Data aggregation router."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User
from app.schemas import StandardResponse, SENSOR_TYPES
from app.services.aggregation import aggregate_readings, aggregate_daily_summary

router = APIRouter(prefix="/readings", tags=["aggregation"])


@router.get("/aggregate", response_model=StandardResponse)
async def get_aggregated_readings(
    period: str = Query(..., pattern="^(hour|day|week|month)$"),
    station_id: Optional[UUID] = Query(None),
    sensor_type: Optional[str] = Query(None, pattern=f'^({"|".join(SENSOR_TYPES)})$'),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Aggregate sensor readings by time period with statistics."""
    result = await aggregate_readings(
        db, str(user.id), period, str(station_id) if station_id else None,
        sensor_type, start, end, limit, offset,
    )
    return StandardResponse(data=result)


@router.get("/daily-summary", response_model=StandardResponse)
async def get_daily_summary(
    station_id: Optional[UUID] = Query(None),
    days: int = Query(7, ge=1, le=90),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Return daily summary statistics for recent days."""
    result = await aggregate_daily_summary(
        db, str(user.id), str(station_id) if station_id else None, days
    )
    return StandardResponse(data=result)
