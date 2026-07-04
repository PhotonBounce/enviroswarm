"""Calibration tools router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User
from app.schemas import StandardResponse, SENSOR_TYPES
from app.services.calibration import validate_calibration

router = APIRouter(prefix="/calibration", tags=["calibration"])


class CalibrationValidateRequest(BaseModel):
    reference_station_id: str
    test_station_id: str
    sensor_type: str = Field(..., pattern=f'^({"|".join(SENSOR_TYPES)})$')
    hours: int = Field(default=24, ge=1, le=168)


@router.post("/validate", response_model=StandardResponse)
async def validate_sensor_calibration(
    body: CalibrationValidateRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Compare two sensors and calculate calibration metrics (R², RMSE, MAE, drift)."""
    result = await validate_calibration(
        db,
        body.reference_station_id,
        body.test_station_id,
        body.sensor_type,
        body.hours,
    )
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )
    return StandardResponse(data=result)
