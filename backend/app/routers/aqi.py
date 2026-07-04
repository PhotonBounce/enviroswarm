"""AQI calculator router."""

from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User
from app.schemas import StandardResponse
from app.services.aqi import AQICalculator

router = APIRouter(prefix="/aqi", tags=["aqi"])


class AQICalculateRequest(BaseModel):
    concentrations: Dict[str, float] = Field(..., description="Pollutant concentrations in standard units")
    standard: str = Field("epa", pattern="^(epa|eaqi|aqhi|all)$")
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    o3: Optional[float] = None
    co: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None

    @classmethod
    def model_validate(cls, data):
        # Backward compat: if concentrations not provided, build from individual fields
        if "concentrations" not in data or not data.get("concentrations"):
            conc = {}
            for k in ("pm25", "pm10", "o3", "co", "no2", "so2"):
                if k in data and data[k] is not None:
                    conc[k] = data[k]
            data["concentrations"] = conc
        return super().model_validate(data)


class NowCastRequest(BaseModel):
    readings: Dict[str, list] = Field(..., description="Pollutant -> list of {timestamp, value} dicts")


@router.post("/calculate", response_model=StandardResponse)
async def calculate_aqi(
    body: AQICalculateRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Calculate AQI using EPA, EAQI, AQHI, or all standards."""
    conc = body.concentrations
    if not conc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No concentrations provided",
        )

    if body.standard == "epa":
        result = AQICalculator.calculate_epa(conc)
    elif body.standard == "eaqi":
        result = AQICalculator.calculate_eaqi(conc)
    elif body.standard == "aqhi":
        if not all(k in conc for k in ("pm25", "o3", "no2")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AQHI requires pm25, o3, and no2",
            )
        result = AQICalculator.calculate_aqhi(conc["pm25"], conc["o3"], conc["no2"])
    else:
        result = AQICalculator.calculate_all(conc)

    return StandardResponse(data=result)


@router.post("/nowcast", response_model=StandardResponse)
async def calculate_nowcast(
    body: NowCastRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Calculate NowCast AQI from recent time-series readings."""
    readings = {}
    for pollutant, reading_list in body.readings.items():
        parsed = []
        for r in reading_list:
            ts = r.get("timestamp")
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts)
            if ts is None or ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc) if ts else datetime.now(timezone.utc)
            parsed.append((ts, r.get("value", 0.0)))
        readings[pollutant] = parsed

    result = AQICalculator.calculate_nowcast(readings)
    return StandardResponse(data=result)
