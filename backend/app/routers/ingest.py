"""Data ingestion router."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.dependencies import get_current_user_or_api_key, rate_limit_dependency
from app.models import SensorReading, SensorStation, User
from app.schemas import StandardResponse, IngestRequest, IngestResponse

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("", response_model=StandardResponse)
async def ingest(
    body: IngestRequest,
    user: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    try:
        # Verify all stations belong to user
        station_ids = {str(r.station_id) for r in body.readings}
        result = await db.execute(
            select(SensorStation).where(
                SensorStation.id.in_(station_ids), SensorStation.user_id == user.id
            )
        )
        owned = {str(s.id) for s in result.scalars().all()}
        missing = station_ids - owned
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not own station(s): {missing}",
            )

        # Check daily reading limit using COUNT() — do NOT load all rows into memory
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        count_result = await db.execute(
            select(func.count(SensorReading.id))
            .join(SensorStation)
            .where(
                SensorStation.user_id == user.id,
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
                    timestamp=r.timestamp or datetime.now(timezone.utc),
                    reading_metadata=r.metadata or {},
                )
            )

        db.add_all(readings)
        await db.commit()

        return StandardResponse(
            data=IngestResponse(inserted=len(readings)).model_dump(mode="json")
        )
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise
