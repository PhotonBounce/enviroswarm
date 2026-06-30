"""Sensor stations router."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

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
        select(func.count(SensorStation.id)).where(
            SensorStation.user_id == user.id, SensorStation.deleted_at.is_(None)
        )
    )
    existing_count = result.scalar_one() or 0
    tier_limits = {"free": 1, "pro": 10, "enterprise": 9999}
    if existing_count >= tier_limits.get(user.tier, 1):
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
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
) -> StandardResponse:
    stmt = select(SensorStation).where(
        SensorStation.user_id == user.id, SensorStation.deleted_at.is_(None)
    )
    if status_filter:
        stmt = stmt.where(SensorStation.status == status_filter)

    count_stmt = stmt.with_only_columns(func.count(SensorStation.id), maintain_order_from=False)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one() or 0

    stmt = stmt.order_by(SensorStation.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    stations = result.scalars().all()
    return StandardResponse(
        data=[StationResponse.model_validate(s).model_dump(mode="json") for s in stations],
        meta={"page": (offset // limit) + 1, "limit": limit, "total": total},
    )


@router.get("/{station_id}", response_model=StandardResponse)
async def get_station(
    station_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    result = await db.execute(
        select(SensorStation).where(
            SensorStation.id == station_id,
            SensorStation.user_id == user.id,
            SensorStation.deleted_at.is_(None),
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


@router.patch("/{station_id}", response_model=StandardResponse)
async def update_station(
    station_id: str,
    body: StationCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    result = await db.execute(
        select(SensorStation).where(
            SensorStation.id == station_id,
            SensorStation.user_id == user.id,
            SensorStation.deleted_at.is_(None),
        )
    )
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Station not found"
        )

    station.name = body.name
    station.latitude = body.latitude
    station.longitude = body.longitude
    station.sensor_types = body.sensor_types
    station.status = body.status
    await db.commit()
    await db.refresh(station)
    return StandardResponse(
        data=StationResponse.model_validate(station).model_dump(mode="json")
    )


@router.delete("/{station_id}", response_model=StandardResponse)
async def delete_station(
    station_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    result = await db.execute(
        select(SensorStation).where(
            SensorStation.id == station_id,
            SensorStation.user_id == user.id,
            SensorStation.deleted_at.is_(None),
        )
    )
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Station not found"
        )
    from datetime import datetime, timezone
    station.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return StandardResponse(data={"deleted": str(station_id)})
