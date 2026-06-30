"""Sensor stations router."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import SensorStation, User
from app.schemas import StandardResponse, StationCreateRequest, StationResponse

router = APIRouter(prefix="/stations", tags=["stations"])


@router.post("", response_model=StandardResponse)
async def create_station(
    body: StationCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    # Tier limits
    result = await db.execute(
        select(SensorStation).where(SensorStation.user_id == user.id)
    )
    existing = result.scalars().all()
    tier_limits = {"free": 1, "pro": 10, "enterprise": 9999}
    if len(existing) >= tier_limits.get(user.tier, 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Station limit reached for your tier",
        )

    station = SensorStation(
        user_id=user.id,
        name=body.name,
        latitude=body.latitude,
        longitude=body.longitude,
        sensor_types=body.sensor_types,
        status=body.status,
    )
    db.add(station)
    await db.commit()
    await db.refresh(station)
    return StandardResponse(
        data=StationResponse.model_validate(station).model_dump(mode="json")
    )


@router.get("", response_model=StandardResponse)
async def list_stations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    result = await db.execute(
        select(SensorStation).where(SensorStation.user_id == user.id)
    )
    stations = result.scalars().all()
    return StandardResponse(
        data=[StationResponse.model_validate(s).model_dump(mode="json") for s in stations]
    )


@router.get("/{station_id}", response_model=StandardResponse)
async def get_station(
    station_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    result = await db.execute(
        select(SensorStation).where(
            SensorStation.id == station_id, SensorStation.user_id == user.id
        )
    )
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Station not found"
        )
    return StandardResponse(
        data=StationResponse.model_validate(station).model_dump(mode="json")
    )
