"""Data ingestion router."""

import asyncio
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_or_api_key, rate_limit_dependency
from app.models import SensorReading, SensorStation, User
from app.schemas import StandardResponse, IngestRequest, IngestResponse

router = APIRouter(prefix="/ingest", tags=["ingest"])

# ---------------------------------------------------------------------------
# In-memory idempotency store: { key_hash: (expires_at, result) }
# Replace with Redis in production.
# ---------------------------------------------------------------------------
_idempotency_store: dict = {}
_idempotency_lock = asyncio.Lock()

_IDEMPOTENCY_TTL = 300  # 5 minutes


def _idempotency_key(user_id, key: str) -> str:
    return hashlib.sha256(f"{user_id}:{key}".encode()).hexdigest()


async def _check_idempotency(user_id, key: str):
    now = datetime.now(timezone.utc)
    async with _idempotency_lock:
        # Evict expired entries (simple sweep)
        expired = [k for k, (expires, _) in _idempotency_store.items() if expires < now]
        for k in expired:
            _idempotency_store.pop(k, None)
        cache_key = _idempotency_key(user_id, key)
        cached = _idempotency_store.get(cache_key)
        if cached:
            return cached[1]
    return None


async def _store_idempotency(user_id, key: str, result):
    now = datetime.now(timezone.utc)
    async with _idempotency_lock:
        cache_key = _idempotency_key(user_id, key)
        _idempotency_store[cache_key] = (now + timedelta(seconds=_IDEMPOTENCY_TTL), result)


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

    # Idempotency check
    idempotency_key = request.headers.get("X-Idempotency-Key")
    if idempotency_key:
        cached = await _check_idempotency(str(user.id), idempotency_key)
        if cached is not None:
            return StandardResponse(data=cached)

    try:
        # Verify all stations belong to user and are not soft-deleted
        station_ids = {str(r.station_id) for r in body.readings}
        result = await db.execute(
            select(SensorStation).where(
                SensorStation.id.in_(station_ids),
                SensorStation.user_id == user.id,
                SensorStation.deleted_at.is_(None),
            )
        )
        stations = result.scalars().all()
        station_sensor_types = {str(s.id): s.sensor_types for s in stations}
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
            if r.sensor_type not in station_sensor_types.get(str(r.station_id), []):
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

        # Check daily reading limit using COUNT()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        count_result = await db.execute(
            select(func.count(SensorReading.id))
            .join(SensorStation)
            .where(
                SensorStation.user_id == user.id,
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
        await db.commit()

        result_data = IngestResponse(inserted=len(readings)).model_dump(mode="json")
        if idempotency_key:
            await _store_idempotency(str(user.id), idempotency_key, result_data)

        return StandardResponse(data=result_data)
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise
