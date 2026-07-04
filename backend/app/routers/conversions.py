"""Scientific conversions router."""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User
from app.schemas import StandardResponse
from app.services.conversions import ConversionEngine

router = APIRouter(prefix="/convert", tags=["conversions"])


class ConversionRequest(BaseModel):
    value: float
    from_unit: str = Field(..., min_length=1, max_length=20)
    to_unit: str = Field(..., min_length=1, max_length=20)
    pollutant: Optional[str] = None
    temperature_c: Optional[float] = Field(default=25.0, ge=-50, le=60)
    pressure_kpa: Optional[float] = Field(default=101.325, ge=50, le=200)


class BatchConversionRequest(BaseModel):
    conversions: List[ConversionRequest] = Field(..., min_length=1, max_length=100)


@router.post("", response_model=StandardResponse)
async def convert_units(
    body: ConversionRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Convert a single value between scientific units."""
    try:
        result = ConversionEngine.convert(
            value=body.value,
            from_unit=body.from_unit,
            to_unit=body.to_unit,
            pollutant=body.pollutant,
            temperature_c=body.temperature_c or 25.0,
            pressure_kpa=body.pressure_kpa or 101.325,
        )
        return StandardResponse(data={
            "input_value": body.value,
            "from_unit": body.from_unit,
            "to_unit": body.to_unit,
            "result": round(result, 6),
            "pollutant": body.pollutant,
            "temperature_c": body.temperature_c,
            "pressure_kpa": body.pressure_kpa,
        })
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post("/batch", response_model=StandardResponse)
async def convert_units_batch(
    body: BatchConversionRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Batch convert multiple values."""
    conversions = [c.model_dump() for c in body.conversions]
    results = ConversionEngine.batch_convert(conversions)
    return StandardResponse(data=results)
