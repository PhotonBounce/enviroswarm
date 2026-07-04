"""Anomaly detection router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User
from app.schemas import StandardResponse, SENSOR_TYPES
from app.services.anomalies import (
    detect_anomalies_iqr,
    detect_anomalies_zscore,
    detect_anomalies_combined,
)

router = APIRouter(prefix="/stations", tags=["anomalies"])


@router.get("/{station_id}/anomalies", response_model=StandardResponse)
async def get_anomalies(
    station_id: UUID,
    sensor_type: Optional[str] = Query(None, pattern=f'^({"|".join(SENSOR_TYPES)})$'),
    hours: int = Query(24, ge=1, le=168),
    method: str = Query("combined", pattern="^(iqr|zscore|combined)$"),
    z_threshold: float = Query(3.0, ge=1.0, le=10.0),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Detect anomalies in station readings using IQR, Z-score, or both."""
    if method == "iqr":
        result = await detect_anomalies_iqr(db, str(station_id), sensor_type, hours)
    elif method == "zscore":
        result = await detect_anomalies_zscore(db, str(station_id), sensor_type, hours, z_threshold)
    else:
        result = await detect_anomalies_combined(db, str(station_id), sensor_type, hours, z_threshold)
    return StandardResponse(data=result)
