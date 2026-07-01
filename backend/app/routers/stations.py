from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import require_permission, rate_limit_dependency
from app.models import SensorStation, SensorReading, User
from app.schemas import StandardResponse, StationCreateRequest, StationUpdateRequest, StationResponse
from app.constants import STATION_TIER_LIMITS

router = APIRouter(prefix="/stations", tags=["stations"])


@router.post("", response_model=StandardResponse)
async def create_station(
    body: StationCreateRequest,
    user: User = Depends(require_permission("write")),
    _rate_limited: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    # Tier limits — lock user row to prevent race condition
    result = await db.execute(
        select(User).where(User.id == user.id).with_for_update()
    )
    locked_user = result.scalar_one_or_none()
    if locked_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    result = await db.execute(
        select(func.count(SensorStation.id)).where(
            SensorStation.user_id == user.id, SensorStation.deleted_at.is_(None)
        )
    )
    existing_count = result.scalar_one() or 0
    tier_limits = STATION_TIER_LIMITS
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
    user: User = Depends(require_permission("read")),
    _rate_limited: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(active|inactive|maintenance)$"),
) -> StandardResponse:
    stmt = select(SensorStation).where(
        SensorStation.user_id == user.id, SensorStation.deleted_at.is_(None)
    )
    if status_filter:
        stmt = stmt.where(SensorStation.status == status_filter)

    count_stmt = stmt.with_only_columns(func.count(SensorStation.id))
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    stmt = stmt.order_by(SensorStation.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    stations = result.scalars().all()
    return StandardResponse(
        data=[StationResponse.model_validate(s).model_dump(mode="json") for s in stations],
        meta={"page": (offset // limit) + 1, "limit": limit, "total": total},
    )


@router.get("/{station_id}", response_model=StandardResponse)
async def get_station(
    station_id: UUID,
    user: User = Depends(require_permission("read")),
    _rate_limited: User = Depends(rate_limit_dependency),
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
    station_id: UUID,
    body: StationUpdateRequest,
    user: User = Depends(require_permission("write")),
    _rate_limited: User = Depends(rate_limit_dependency),
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

    if body.name is not None:
        station.name = body.name
    station.latitude = body.latitude
    station.longitude = body.longitude
    if body.sensor_types is not None:
        station.sensor_types = body.sensor_types
    if body.status is not None:
        station.status = body.status
    await db.commit()
    await db.refresh(station)
    return StandardResponse(
        data=StationResponse.model_validate(station).model_dump(mode="json")
    )


@router.delete("/{station_id}", response_model=StandardResponse)
async def delete_station(
    station_id: UUID,
    user: User = Depends(require_permission("write")),
    _rate_limited: User = Depends(rate_limit_dependency),
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
    now = datetime.now(timezone.utc)
    station.deleted_at = now
    # Cascade soft-delete to readings
    await db.execute(
        update(SensorReading)
        .where(SensorReading.station_id == station.id, SensorReading.deleted_at.is_(None))
        .values(deleted_at=now, updated_at=now)
    )
    await db.commit()
    return StandardResponse(data={"deleted": str(station_id)})
