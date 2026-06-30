"""Data ingestion router."""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, func, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_or_api_key, rate_limit_dependency
from app.models import SensorReading, SensorStation, User, IdempotencyKey
from app.schemas import StandardResponse, IngestRequest, IngestResponse

router = APIRouter(prefix="/ingest", tags=["ingest"])

_IDEMPOTENCY_TTL = 300  # 5 minutes


@router.post("", response_model=StandardResponse)
async def ingest(
    request: Request,
    body: IngestRequest,
    user: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    # API key permission check
    api_key = getattr(request.state, "api_key", None)
    if api_key and not api_key.permissions.get("write", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key does not have write permission",
        )

    # Idempotency check — transactional via DB
    idempotency_key = request.headers.get("X-Idempotency-Key")
    key_hash = None
    if idempotency_key:
        key_hash = hashlib.sha256(f"{user.id}:{idempotency_key}".encode()).hexdigest()
        idem_result = await db.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.user_id == user.id,
                IdempotencyKey.key_hash == key_hash,
                IdempotencyKey.expires_at > datetime.now(timezone.utc),
            )
        )
        cached = idem_result.scalar_one_or_none()
        if cached:
            return StandardResponse(data=cached.response)

    try:
        # Verify all stations belong to user and are not soft-deleted
        station_ids = {r.station_id for r in body.readings}
        result = await db.execute(
            select(SensorStation).where(
                SensorStation.id.in_(station_ids),
                SensorStation.user_id == user.id,
                SensorStation.deleted_at.is_(None),
            )
        )
        stations = result.scalars().all()
        station_sensor_types = {s.id: s.sensor_types for s in stations}
        owned = set(station_sensor_types.keys())
        missing = station_ids - owned
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not own station(s): {missing}",
            )

        # Validate sensor_type matches station configuration and timestamp bounds
        retention_days = {"free": 7, "pro": 90, "enterprise": 730}
        max_retention = retention_days.get(user.tier, 7)
        now = datetime.now(timezone.utc)
        earliest_allowed = now - timedelta(days=max_retention)
        future_limit = now + timedelta(minutes=5)

        for r in body.readings:
            if r.sensor_type not in station_sensor_types.get(r.station_id, []):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sensor type '{r.sensor_type}' not configured for station {r.station_id}",
                )
            if r.timestamp is not None:
                if r.timestamp < earliest_allowed or r.timestamp > future_limit:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Timestamp out of allowed range [{earliest_allowed.isoformat()}, {future_limit.isoformat()}]",
                    )

        # Lock user row to prevent race condition on daily reading limit
        await db.execute(
            select(User).where(User.id == user.id).with_for_update()
        )

        # Check daily reading limit using COUNT() — exclude soft-deleted stations
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        count_result = await db.execute(
            select(func.count(SensorReading.id))
            .join(SensorStation)
            .where(
                SensorStation.user_id == user.id,
                SensorStation.deleted_at.is_(None),
                SensorReading.deleted_at.is_(None),
                SensorReading.timestamp >= today_start,
            )
        )
        today_count = count_result.scalar_one() or 0

        tier_limits = {"free": 100, "pro": 10000, "enterprise": 99999999}
        if today_count + len(body.readings) > tier_limits.get(user.tier, 100):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Daily reading limit exceeded for your tier",
            )

        readings = []
        for r in body.readings:
            readings.append(
                SensorReading(
                    station_id=r.station_id,
                    sensor_type=r.sensor_type,
                    value=r.value,
                    unit=r.unit,
                    timestamp=r.timestamp or now,
                    reading_metadata=r.metadata or {},
                )
            )

        db.add_all(readings)

        # Store idempotency key as part of the same transaction
        result_data = IngestResponse(inserted=len(readings)).model_dump(mode="json")
        if idempotency_key:
            db.add(
                IdempotencyKey(
                    user_id=user.id,
                    key_hash=key_hash,
                    response=result_data,
                    expires_at=datetime.now(timezone.utc) + timedelta(seconds=_IDEMPOTENCY_TTL),
                )
            )

        await db.commit()

        return StandardResponse(data=result_data if idempotency_key else IngestResponse(inserted=len(readings)).model_dump(mode="json"))
    except IntegrityError:
        await db.rollback()
        if idempotency_key and key_hash:
            idem_result = await db.execute(
                select(IdempotencyKey).where(
                    IdempotencyKey.user_id == user.id,
                    IdempotencyKey.key_hash == key_hash,
                    IdempotencyKey.expires_at > datetime.now(timezone.utc),
                )
            )
            cached = idem_result.scalar_one_or_none()
            if cached:
                return StandardResponse(data=cached.response)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency conflict or duplicate key",
        )
    except Exception:
        await db.rollback()
        raise
