"""Anomaly detection services using statistical methods."""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SensorReading


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


def _calculate_zscore(values: List[float], threshold: float = 3.0) -> List[Tuple[int, float]]:
    """Return indices and values where |z-score| > threshold."""
    if len(values) < 2:
        return []
    mean_val = sum(values) / len(values)
    variance = sum((v - mean_val) ** 2 for v in values) / len(values)
    std_dev = variance ** 0.5
    if std_dev == 0:
        return []
    outliers = []
    for i, v in enumerate(values):
        z = abs((v - mean_val) / std_dev)
        if z > threshold:
            outliers.append((i, z))
    return outliers


async def detect_anomalies_iqr(
    db: AsyncSession,
    station_id: str,
    sensor_type: Optional[str] = None,
    hours: int = 24,
) -> Dict[str, any]:
    """Detect anomalies using the IQR method."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(SensorReading.timestamp, SensorReading.value, SensorReading.unit, SensorReading.sensor_type)
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.timestamp >= cutoff)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )
    if sensor_type:
        stmt = stmt.where(SensorReading.sensor_type == sensor_type)

    result = await db.execute(stmt)
    rows = result.all()
    total = len(rows)
    if total < 4:
        return {
            "method": "IQR",
            "total_readings": total,
            "anomaly_count": 0,
            "anomalies": [],
        }

    values = [float(row.value) for row in rows]
    lower, upper = _calculate_iqr_bounds(values)

    anomalies = []
    for i, row in enumerate(rows):
        val = float(row.value)
        if val < lower or val > upper:
            deviation = abs(val - (lower + upper) / 2) / max(abs(upper - lower), 1e-9)
            anomalies.append({
                "timestamp": row.timestamp.isoformat(),
                "value": val,
                "sensor_type": row.sensor_type,
                "unit": row.unit,
                "lower_bound": round(lower, 4),
                "upper_bound": round(upper, 4),
                "deviation_factor": round(deviation, 4),
            })

    return {
        "method": "IQR",
        "total_readings": total,
        "anomaly_count": len(anomalies),
        "anomaly_ratio": round(len(anomalies) / total, 4) if total > 0 else 0.0,
        "bounds": {"lower": round(lower, 4), "upper": round(upper, 4)},
        "anomalies": anomalies,
    }


async def detect_anomalies_zscore(
    db: AsyncSession,
    station_id: str,
    sensor_type: Optional[str] = None,
    hours: int = 24,
    threshold: float = 3.0,
) -> Dict[str, any]:
    """Detect anomalies using Z-score method."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(SensorReading.timestamp, SensorReading.value, SensorReading.unit, SensorReading.sensor_type)
        .where(SensorReading.station_id == station_id)
        .where(SensorReading.timestamp >= cutoff)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )
    if sensor_type:
        stmt = stmt.where(SensorReading.sensor_type == sensor_type)

    result = await db.execute(stmt)
    rows = result.all()
    total = len(rows)
    if total < 2:
        return {
            "method": "Z-Score",
            "threshold": threshold,
            "total_readings": total,
            "anomaly_count": 0,
            "anomalies": [],
        }

    values = [float(row.value) for row in rows]
    mean_val = sum(values) / len(values)
    variance = sum((v - mean_val) ** 2 for v in values) / len(values)
    std_dev = variance ** 0.5

    outlier_indices = _calculate_zscore(values, threshold)
    anomalies = []
    for idx, z_score in outlier_indices:
        row = rows[idx]
        anomalies.append({
            "timestamp": row.timestamp.isoformat(),
            "value": float(row.value),
            "sensor_type": row.sensor_type,
            "unit": row.unit,
            "z_score": round(z_score, 4),
            "mean": round(mean_val, 4),
            "std_dev": round(std_dev, 4),
        })

    return {
        "method": "Z-Score",
        "threshold": threshold,
        "total_readings": total,
        "anomaly_count": len(anomalies),
        "anomaly_ratio": round(len(anomalies) / total, 4) if total > 0 else 0.0,
        "statistics": {"mean": round(mean_val, 4), "std_dev": round(std_dev, 4)},
        "anomalies": anomalies,
    }


async def detect_anomalies_combined(
    db: AsyncSession,
    station_id: str,
    sensor_type: Optional[str] = None,
    hours: int = 24,
    z_threshold: float = 3.0,
) -> Dict[str, any]:
    """Run both IQR and Z-score methods and return combined results."""
    iqr_result = await detect_anomalies_iqr(db, station_id, sensor_type, hours)
    zscore_result = await detect_anomalies_zscore(db, station_id, sensor_type, hours, z_threshold)

    # Merge anomaly timestamps
    iqr_ts = {a["timestamp"] for a in iqr_result["anomalies"]}
    zscore_ts = {a["timestamp"] for a in zscore_result["anomalies"]}
    combined_ts = iqr_ts | zscore_ts

    return {
        "methods": ["IQR", "Z-Score"],
        "total_readings": iqr_result["total_readings"],
        "anomaly_count": len(combined_ts),
        "anomaly_ratio": round(len(combined_ts) / max(iqr_result["total_readings"], 1), 4),
        "iqr_anomalies": iqr_result["anomalies"],
        "zscore_anomalies": zscore_result["anomalies"],
    }
