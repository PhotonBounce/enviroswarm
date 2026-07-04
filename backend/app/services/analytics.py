"""Predictive analytics services for ENViroSwarm."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SensorReading


def _linear_regression_slope_intercept(
    x_vals: List[float], y_vals: List[float]
) -> Tuple[float, float]:
    """Return (slope, intercept) for simple linear regression via least squares."""
    n = len(x_vals)
    if n == 0:
        return 0.0, 0.0
    sum_x = sum(x_vals)
    sum_y = sum(y_vals)
    sum_xy = sum(x * y for x, y in zip(x_vals, y_vals))
    sum_x2 = sum(x * x for x in x_vals)
    denominator = n * sum_x2 - sum_x * sum_x
    if denominator == 0:
        return 0.0, sum_y / n if n > 0 else 0.0
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def _calculate_iqr_bounds(values: List[float]) -> Tuple[float, float]:
    """Return (lower_bound, upper_bound) using the IQR method."""
    if len(values) < 4:
        return float("-inf"), float("inf")
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    q1_idx = n // 4
    q3_idx = (3 * n) // 4
    q1 = sorted_vals[q1_idx]
    q3 = sorted_vals[q3_idx]
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    return lower, upper


async def get_recent_readings_for_forecast(
    db: AsyncSession,
    station_id: Optional[str],
    sensor_type: str,
    hours: int = 72,
) -> List[Tuple[datetime, float]]:
    """Fetch recent readings ordered by timestamp ascending."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(SensorReading.timestamp, SensorReading.value)
        .where(SensorReading.sensor_type == sensor_type)
        .where(SensorReading.timestamp >= cutoff)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )
    if station_id is not None:
        from uuid import UUID
        stmt = stmt.where(SensorReading.station_id == UUID(station_id))
    result = await db.execute(stmt)
    return [(row.timestamp, float(row.value)) for row in result.all()]


async def forecast_linear(
    db: AsyncSession,
    station_id: Optional[str],
    sensor_type: str,
    horizon_hours: int = 24,
) -> List[dict]:
    """Return linear-regression forecast points for the given horizon."""
    readings = await get_recent_readings_for_forecast(
        db, station_id, sensor_type, hours=72
    )
    if len(readings) < 2:
        return []

    # Use epoch seconds as x values
    base_time = readings[0][0]
    x_vals = [(r[0] - base_time).total_seconds() for r in readings]
    y_vals = [r[1] for r in readings]
    slope, intercept = _linear_regression_slope_intercept(x_vals, y_vals)

    # Calculate standard error for confidence intervals
    predictions = [intercept + slope * x for x in x_vals]
    residuals = [y - p for y, p in zip(y_vals, predictions)]
    mse = sum(r * r for r in residuals) / max(len(residuals) - 2, 1)
    std_error = mse ** 0.5

    last_time = readings[-1][0]
    interval_seconds = 3600  # hourly predictions
    points = []
    for i in range(1, horizon_hours + 1):
        future_time = last_time + timedelta(hours=i)
        future_x = (future_time - base_time).total_seconds()
        predicted = intercept + slope * future_x
        points.append({
            "timestamp": future_time,
            "predicted_value": round(predicted, 6),
            "confidence_lower": round(predicted - 1.96 * std_error, 6) if std_error > 0 else None,
            "confidence_upper": round(predicted + 1.96 * std_error, 6) if std_error > 0 else None,
        })
    return points


async def detect_anomalies_iqr(
    db: AsyncSession,
    station_id: Optional[str],
    sensor_type: str,
    hours: int = 24,
) -> Tuple[List[dict], int]:
    """Return (anomaly_points, total_readings) using IQR outlier detection."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(SensorReading.timestamp, SensorReading.value, SensorReading.unit)
        .where(SensorReading.sensor_type == sensor_type)
        .where(SensorReading.timestamp >= cutoff)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )
    if station_id is not None:
        from uuid import UUID
        stmt = stmt.where(SensorReading.station_id == UUID(station_id))
    result = await db.execute(stmt)
    rows = result.all()
    total = len(rows)
    if total < 4:
        return [], total

    values = [float(row.value) for row in rows]
    lower, upper = _calculate_iqr_bounds(values)

    anomalies = []
    for row in rows:
        val = float(row.value)
        if val < lower or val > upper:
            deviation = abs(val - (lower + upper) / 2) / max(abs(upper - lower), 1e-9)
            anomalies.append({
                "timestamp": row.timestamp,
                "value": val,
                "sensor_type": sensor_type,
                "unit": row.unit,
                "deviation_factor": round(deviation, 4),
            })
    return anomalies, total
