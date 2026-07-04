"""Forecasting service for environmental sensor data."""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

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


async def get_recent_readings(
    db: AsyncSession,
    station_id: str,
    sensor_type: str,
    hours: int = 72,
) -> List[Tuple[datetime, float]]:
    """Fetch recent readings ordered by timestamp ascending."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(SensorReading.timestamp, SensorReading.value)
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.sensor_type == sensor_type)
        .where(SensorReading.timestamp >= cutoff)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )
    result = await db.execute(stmt)
    return [(row.timestamp, float(row.value)) for row in result.all()]


async def forecast_linear(
    db: AsyncSession,
    station_id: str,
    sensor_type: str,
    horizon_hours: int = 24,
) -> List[Dict[str, any]]:
    """Return linear-regression forecast points for the given horizon."""
    readings = await get_recent_readings(db, station_id, sensor_type, hours=72)
    if len(readings) < 2:
        return []

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
    points = []
    for i in range(1, horizon_hours + 1):
        future_time = last_time + timedelta(hours=i)
        future_x = (future_time - base_time).total_seconds()
        predicted = intercept + slope * future_x
        points.append({
            "timestamp": future_time.isoformat(),
            "predicted_value": round(predicted, 6),
            "confidence_lower": round(predicted - 1.96 * std_error, 6) if std_error > 0 else None,
            "confidence_upper": round(predicted + 1.96 * std_error, 6) if std_error > 0 else None,
        })
    return points


async def forecast_moving_average(
    db: AsyncSession,
    station_id: str,
    sensor_type: str,
    horizon_hours: int = 24,
    window_hours: int = 24,
) -> List[Dict[str, any]]:
    """Return simple moving average forecast."""
    readings = await get_recent_readings(db, station_id, sensor_type, hours=window_hours)
    if not readings:
        return []

    avg = sum(r[1] for r in readings) / len(readings)
    last_time = readings[-1][0]
    points = []
    for i in range(1, horizon_hours + 1):
        future_time = last_time + timedelta(hours=i)
        points.append({
            "timestamp": future_time.isoformat(),
            "predicted_value": round(avg, 6),
            "confidence_lower": None,
            "confidence_upper": None,
        })
    return points


async def generate_forecast(
    db: AsyncSession,
    station_id: str,
    sensor_type: str,
    horizon: str = "24h",
    method: str = "linear",
) -> Dict[str, any]:
    """Generate a forecast with metadata."""
    horizon_hours = 24 if horizon == "24h" else 168

    if method == "linear":
        points = await forecast_linear(db, station_id, sensor_type, horizon_hours)
    elif method == "moving_average":
        points = await forecast_moving_average(db, station_id, sensor_type, horizon_hours)
    else:
        points = await forecast_linear(db, station_id, sensor_type, horizon_hours)

    # Trend analysis
    readings = await get_recent_readings(db, station_id, sensor_type, hours=72)
    trend = "stable"
    if len(readings) >= 2:
        first_avg = sum(r[1] for r in readings[:len(readings)//2]) / max(len(readings)//2, 1)
        second_avg = sum(r[1] for r in readings[len(readings)//2:]) / max(len(readings) - len(readings)//2, 1)
        diff_pct = ((second_avg - first_avg) / abs(first_avg)) * 100.0 if first_avg != 0 else 0.0
        if diff_pct > 5.0:
            trend = "increasing"
        elif diff_pct < -5.0:
            trend = "decreasing"

    return {
        "station_id": station_id,
        "sensor_type": sensor_type,
        "horizon": horizon,
        "method": method,
        "trend": trend,
        "base_readings": len(readings),
        "points": points,
    }
