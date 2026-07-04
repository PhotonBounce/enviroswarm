from uuid import UUID
from datetime import datetime, timezone, timedelta

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
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("write")),
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
    existing_count = result.scalar_one()
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
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
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
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
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
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("write")),
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
    if "latitude" in body.model_fields_set:
        station.latitude = body.latitude
    if "longitude" in body.model_fields_set:
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
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("write")),
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


@router.get("/{station_id}/quality", response_model=StandardResponse)
async def get_station_quality(
    station_id: UUID,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Return data quality metrics and overall score for a station."""
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
    window_start = now - timedelta(days=7)

    # Count total expected vs actual readings in last 7 days
    total_readings_result = await db.execute(
        select(func.count(SensorReading.id))
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.deleted_at.is_(None))
        .where(SensorReading.timestamp >= window_start)
    )
    total_readings = total_readings_result.scalar_one()

    # Calculate expected readings based on interval
    minutes_in_window = 7 * 24 * 60
    expected = minutes_in_window // max(station.expected_reading_interval_minutes, 1)
    completeness = min((total_readings / max(expected, 1)) * 100.0, 100.0)

    # Uptime: simplistic -- if any reading exists in each day, count as up
    daily_result = await db.execute(
        select(func.count(func.distinct(func.date_trunc("day", SensorReading.timestamp))))
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.deleted_at.is_(None))
        .where(SensorReading.timestamp >= window_start)
    )
    days_with_data = daily_result.scalar_one()
    uptime = (days_with_data / 7.0) * 100.0

    # Calibration age
    calibration_age_days = None
    if station.last_calibration_at is not None:
        calibration_age_days = (now - station.last_calibration_at).days

    # Last reading time
    last_reading_result = await db.execute(
        select(SensorReading.timestamp)
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.desc())
        .limit(1)
    )
    last_reading_row = last_reading_result.one_or_none()
    last_reading_at = last_reading_row[0] if last_reading_row is not None else None

    # Actual interval (median difference between consecutive readings)
    actual_interval = None
    if total_readings > 1:
        interval_result = await db.execute(
            select(SensorReading.timestamp)
            .where(SensorReading.station_id == station_id)
            .where(SensorReading.deleted_at.is_(None))
            .where(SensorReading.timestamp >= window_start)
            .order_by(SensorReading.timestamp.asc())
        )
        timestamps = [r[0] for r in interval_result.all()]
        if len(timestamps) > 1:
            diffs = [(timestamps[i] - timestamps[i - 1]).total_seconds() / 60.0
                     for i in range(1, len(timestamps))]
            diffs.sort()
            actual_interval = diffs[len(diffs) // 2]

    # Overall score (0-100)
    score = min(100.0, (uptime * 0.4) + (completeness * 0.4))
    if calibration_age_days is not None:
        cal_penalty = min(calibration_age_days / 30.0 * 5.0, 20.0)
        score = max(0.0, score - cal_penalty)

    return StandardResponse(data={
        "station_id": str(station_id),
        "overall_score": round(score, 2),
        "metrics": {
            "uptime_percentage": round(uptime, 2),
            "completeness_percentage": round(completeness, 2),
            "calibration_age_days": calibration_age_days,
            "last_reading_at": last_reading_at.isoformat() if last_reading_at else None,
            "expected_interval_minutes": station.expected_reading_interval_minutes,
            "actual_interval_minutes": round(actual_interval, 2) if actual_interval else None,
        },
    })
