"""Data aggregation service for time-series rollups."""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import SensorReading, SensorStation


def _date_trunc(unit: str, column):
    """Cross-database date_trunc helper."""
    if get_settings().database_url.startswith("sqlite"):
        fmt_map = {
            "hour": "%Y-%m-%d %H:00:00",
            "day": "%Y-%m-%d 00:00:00",
            "week": "%Y-%m-%d 00:00:00",
            "month": "%Y-%m-01 00:00:00",
        }
        return func.strftime(fmt_map[unit], column)
    return func.date_trunc(unit, column)


async def aggregate_readings(
    db: AsyncSession,
    user_id: str,
    period: str,
    station_id: Optional[str] = None,
    sensor_type: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: int = 1000,
    offset: int = 0,
) -> Dict[str, any]:
    """Aggregate sensor readings by period (hour/day/week/month).

    Returns bucketed statistics: avg, min, max, count, stddev.
    """
    from app.constants import RETENTION_DAYS
    retention_days = RETENTION_DAYS
    max_retention = 730  # enterprise default
    earliest_allowed = datetime.now(timezone.utc) - timedelta(days=max_retention)

    if start:
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        effective_start = max(start, earliest_allowed)
    else:
        effective_start = earliest_allowed

    if end:
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

    trunc_map = {"hour": "hour", "day": "day", "week": "week", "month": "month"}
    trunc_unit = trunc_map.get(period, "day")

    # Build aggregation query
    stmt = (
        select(
            _date_trunc(trunc_unit, SensorReading.timestamp).label("bucket"),
            func.avg(SensorReading.value).label("avg_value"),
            func.min(SensorReading.value).label("min_value"),
            func.max(SensorReading.value).label("max_value"),
            func.count(SensorReading.id).label("count"),
            func.stddev(SensorReading.value).label("stddev"),
            SensorReading.sensor_type,
            SensorReading.unit,
        )
        .join(SensorStation)
        .where(SensorStation.user_id == user_id)
        .where(SensorStation.deleted_at.is_(None))
        .where(SensorReading.deleted_at.is_(None))
        .where(SensorReading.timestamp >= effective_start)
        .group_by(
            _date_trunc(trunc_unit, SensorReading.timestamp),
            SensorReading.sensor_type,
            SensorReading.unit,
        )
        .order_by("bucket")
        .limit(limit)
        .offset(offset)
    )

    if station_id is not None:
        stmt = stmt.where(SensorReading.station_id == station_id)
    if sensor_type is not None:
        stmt = stmt.where(SensorReading.sensor_type == sensor_type)
    if end is not None:
        stmt = stmt.where(SensorReading.timestamp <= end)

    result = await db.execute(stmt)
    rows = result.all()

    data = []
    for r in rows:
        bucket_val = r.bucket
        if isinstance(bucket_val, datetime):
            bucket_val = bucket_val.isoformat()
        data.append({
            "bucket": bucket_val,
            "sensor_type": r.sensor_type,
            "unit": r.unit,
            "avg_value": round(r.avg_value, 6) if r.avg_value is not None else None,
            "min_value": r.min_value,
            "max_value": r.max_value,
            "count": r.count,
            "stddev": round(r.stddev, 6) if r.stddev is not None else None,
        })

    return {
        "period": period,
        "data": data,
        "meta": {
            "page": (offset // limit) + 1,
            "limit": limit,
            "total": len(data),
        },
    }


async def aggregate_daily_summary(
    db: AsyncSession,
    user_id: str,
    station_id: Optional[str] = None,
    days: int = 7,
) -> List[Dict[str, any]]:
    """Return daily summary statistics for recent days."""
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)

    stmt = (
        select(
            func.date(SensorReading.timestamp).label("date"),
            SensorReading.sensor_type,
            func.avg(SensorReading.value).label("avg_value"),
            func.min(SensorReading.value).label("min_value"),
            func.max(SensorReading.value).label("max_value"),
            func.count(SensorReading.id).label("count"),
            SensorReading.unit,
        )
        .join(SensorStation)
        .where(SensorStation.user_id == user_id)
        .where(SensorStation.deleted_at.is_(None))
        .where(SensorReading.deleted_at.is_(None))
        .where(SensorReading.timestamp >= start)
        .where(SensorReading.timestamp <= end)
        .group_by(
            func.date(SensorReading.timestamp),
            SensorReading.sensor_type,
            SensorReading.unit,
        )
        .order_by(func.date(SensorReading.timestamp).desc())
    )

    if station_id is not None:
        stmt = stmt.where(SensorReading.station_id == station_id)

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "date": str(r.date),
            "sensor_type": r.sensor_type,
            "unit": r.unit,
            "avg_value": round(r.avg_value, 6) if r.avg_value is not None else None,
            "min_value": r.min_value,
            "max_value": r.max_value,
            "count": r.count,
        }
        for r in rows
    ]
