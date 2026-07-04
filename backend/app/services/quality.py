"""Data quality scoring service for sensor stations."""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SensorReading, SensorStation


async def calculate_quality_score(
    db: AsyncSession,
    station_id: str,
    window_days: int = 7,
) -> Dict[str, any]:
    """Calculate a comprehensive data quality score (0-100) for a station.

    Factors:
    - Completeness: ratio of actual readings to expected readings
    - Recency: time since last reading
    - Variance: coefficient of variation (too low = suspicious, too high = noisy)
    - Outlier ratio: percentage of readings flagged as outliers
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=window_days)

    # Fetch station info
    result = await db.execute(
        select(SensorStation).where(SensorStation.id == station_id)
    )
    station = result.scalar_one_or_none()
    if station is None:
        return {"error": "Station not found"}

    # Total readings in window
    total_result = await db.execute(
        select(func.count(SensorReading.id))
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.deleted_at.is_(None))
        .where(SensorReading.timestamp >= window_start)
    )
    total_readings = total_result.scalar_one()

    # Expected readings
    interval_min = max(station.expected_reading_interval_minutes, 1)
    minutes_in_window = window_days * 24 * 60
    expected_readings = minutes_in_window // interval_min
    completeness = min((total_readings / max(expected_readings, 1)) * 100.0, 100.0)

    # Last reading recency
    last_result = await db.execute(
        select(SensorReading.timestamp)
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.desc())
        .limit(1)
    )
    last_row = last_result.one_or_none()
    last_reading_at = last_row[0] if last_row is not None else None
    recency_score = 100.0
    if last_reading_at is not None:
        hours_since = (now - last_reading_at).total_seconds() / 3600.0
        # Penalty: 10 points per hour of delay beyond 2x expected interval
        grace_hours = max(2 * interval_min / 60.0, 1.0)
        if hours_since > grace_hours:
            recency_score = max(0.0, 100.0 - (hours_since - grace_hours) * 5.0)
    else:
        recency_score = 0.0

    # Variance and outlier analysis per sensor type
    sensor_types_result = await db.execute(
        select(SensorReading.sensor_type)
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.deleted_at.is_(None))
        .where(SensorReading.timestamp >= window_start)
        .group_by(SensorReading.sensor_type)
    )
    sensor_types = [r[0] for r in sensor_types_result.all()]

    sensor_quality = {}
    overall_variance_score = 100.0
    overall_outlier_score = 100.0

    for sensor_type in sensor_types:
        values_result = await db.execute(
            select(SensorReading.value)
            .where(SensorReading.station_id == station_id)
            .where(SensorReading.sensor_type == sensor_type)
            .where(SensorReading.deleted_at.is_(None))
            .where(SensorReading.timestamp >= window_start)
            .order_by(SensorReading.timestamp.asc())
        )
        values = [float(r[0]) for r in values_result.all()]

        if len(values) < 4:
            sensor_quality[sensor_type] = {
                "count": len(values),
                "variance_score": 50.0,
                "outlier_score": 50.0,
            }
            continue

        # Variance score: penalize both zero variance (stuck sensor) and very high variance
        mean_val = sum(values) / len(values)
        if mean_val == 0:
            cv = 0.0
        else:
            variance = sum((v - mean_val) ** 2 for v in values) / len(values)
            cv = (variance ** 0.5) / abs(mean_val) if mean_val != 0 else 0.0

        if cv < 0.001:
            variance_score = 20.0  # Suspiciously flat
        elif cv > 2.0:
            variance_score = 60.0  # Very noisy
        else:
            variance_score = 100.0 - (cv * 20.0)  # Gradual penalty
        variance_score = max(0.0, min(100.0, variance_score))

        # Outlier score using IQR
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        q1 = sorted_vals[n // 4]
        q3 = sorted_vals[(3 * n) // 4]
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        outlier_count = sum(1 for v in values if v < lower or v > upper)
        outlier_ratio = outlier_count / len(values)
        outlier_score = max(0.0, 100.0 - outlier_ratio * 200.0)

        sensor_quality[sensor_type] = {
            "count": len(values),
            "mean": round(mean_val, 4),
            "cv": round(cv, 4),
            "variance_score": round(variance_score, 2),
            "outlier_ratio": round(outlier_ratio, 4),
            "outlier_score": round(outlier_score, 2),
        }

        overall_variance_score = min(overall_variance_score, variance_score)
        overall_outlier_score = min(overall_outlier_score, outlier_score)

    # Weighted overall score
    score = (
        completeness * 0.30
        + recency_score * 0.25
        + overall_variance_score * 0.25
        + overall_outlier_score * 0.20
    )
    score = max(0.0, min(100.0, score))

    calibration_age_days = None
    if station.last_calibration_at is not None:
        calibration_age_days = (now - station.last_calibration_at).days
        cal_penalty = min(calibration_age_days / 30.0 * 3.0, 15.0)
        score = max(0.0, score - cal_penalty)

    return {
        "station_id": station_id,
        "overall_score": round(score, 2),
        "window_days": window_days,
        "completeness": round(completeness, 2),
        "recency_score": round(recency_score, 2),
        "variance_score": round(overall_variance_score, 2),
        "outlier_score": round(overall_outlier_score, 2),
        "last_reading_at": last_reading_at.isoformat() if last_reading_at else None,
        "calibration_age_days": calibration_age_days,
        "sensor_quality": sensor_quality,
    }
