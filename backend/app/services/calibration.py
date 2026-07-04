"""Sensor calibration validation and drift detection services."""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SensorReading


def calculate_r_squared(y_true: List[float], y_pred: List[float]) -> float:
    """Calculate coefficient of determination (R²)."""
    if len(y_true) != len(y_pred) or len(y_true) == 0:
        return 0.0
    mean_true = sum(y_true) / len(y_true)
    ss_tot = sum((y - mean_true) ** 2 for y in y_true)
    ss_res = sum((y_t - y_p) ** 2 for y_t, y_p in zip(y_true, y_pred))
    if ss_tot == 0:
        return 1.0 if ss_res == 0 else 0.0
    return max(0.0, 1.0 - ss_res / ss_tot)


def calculate_rmse(y_true: List[float], y_pred: List[float]) -> float:
    """Calculate Root Mean Squared Error."""
    if len(y_true) != len(y_pred) or len(y_true) == 0:
        return 0.0
    mse = sum((y_t - y_p) ** 2 for y_t, y_p in zip(y_true, y_pred)) / len(y_true)
    return mse ** 0.5


def calculate_mae(y_true: List[float], y_pred: List[float]) -> float:
    """Calculate Mean Absolute Error."""
    if len(y_true) != len(y_pred) or len(y_true) == 0:
        return 0.0
    return sum(abs(y_t - y_p) for y_t, y_p in zip(y_true, y_pred)) / len(y_true)


class DriftDetector:
    """Statistical drift detection for sensor calibration monitoring."""

    @staticmethod
    def cusum(
        values: List[float],
        reference_mean: float,
        reference_std: float,
        threshold: float = 5.0,
        drift_factor: float = 0.5,
    ) -> Dict[str, any]:
        """Cumulative Sum (CUSUM) control chart for drift detection.

        Args:
            values: Time-ordered sensor readings
            reference_mean: Expected mean from calibration
            reference_std: Expected standard deviation from calibration
            threshold: Decision interval (number of std devs)
            drift_factor: Minimum drift to detect (number of std devs)
        """
        if not values or reference_std <= 0:
            return {"drift_detected": False, "error": "Invalid inputs"}

        k = drift_factor * reference_std
        h = threshold * reference_std

        cusum_pos = 0.0
        cusum_neg = 0.0
        drift_points = []

        for i, val in enumerate(values):
            cusum_pos = max(0.0, cusum_pos + val - reference_mean - k)
            cusum_neg = max(0.0, cusum_neg + reference_mean - val - k)
            if cusum_pos > h or cusum_neg > h:
                drift_points.append({
                    "index": i,
                    "value": val,
                    "cusum_pos": round(cusum_pos, 4),
                    "cusum_neg": round(cusum_neg, 4),
                })
                # Reset after detection
                cusum_pos = 0.0
                cusum_neg = 0.0

        return {
            "drift_detected": len(drift_points) > 0,
            "drift_point_count": len(drift_points),
            "drift_points": drift_points,
            "parameters": {
                "reference_mean": reference_mean,
                "reference_std": reference_std,
                "threshold": threshold,
                "drift_factor": drift_factor,
            },
        }

    @staticmethod
    def ewma(
        values: List[float],
        lambda_param: float = 0.2,
        l_multiplier: float = 2.814,
    ) -> Dict[str, any]:
        """Exponentially Weighted Moving Average (EWMA) control chart.

        Args:
            values: Time-ordered sensor readings
            lambda_param: Smoothing parameter (0 < lambda <= 1)
            l_multiplier: Control limit multiplier (typically 2.814 for 3-sigma)
        """
        if not values or not (0 < lambda_param <= 1):
            return {"drift_detected": False, "error": "Invalid inputs"}

        mean_val = sum(values) / len(values)
        variance = sum((v - mean_val) ** 2 for v in values) / len(values)
        std_dev = variance ** 0.5

        ewma_values = []
        ucl_values = []
        lcl_values = []
        alarm_points = []

        z = [0.0] * len(values)
        for i, val in enumerate(values):
            if i == 0:
                z[i] = lambda_param * val + (1 - lambda_param) * mean_val
            else:
                z[i] = lambda_param * val + (1 - lambda_param) * z[i - 1]

            # Control limits for EWMA
            sigma_z = std_dev * ((lambda_param / (2 - lambda_param)) * (1 - (1 - lambda_param) ** (2 * (i + 1)))) ** 0.5
            ucl = mean_val + l_multiplier * sigma_z
            lcl = mean_val - l_multiplier * sigma_z

            ewma_values.append(round(z[i], 4))
            ucl_values.append(round(ucl, 4))
            lcl_values.append(round(lcl, 4))

            if z[i] > ucl or z[i] < lcl:
                alarm_points.append({
                    "index": i,
                    "value": val,
                    "ewma": round(z[i], 4),
                    "ucl": round(ucl, 4),
                    "lcl": round(lcl, 4),
                })

        return {
            "drift_detected": len(alarm_points) > 0,
            "alarm_count": len(alarm_points),
            "alarm_points": alarm_points,
            "ewma_values": ewma_values,
            "ucl_values": ucl_values,
            "lcl_values": lcl_values,
            "parameters": {
                "lambda": lambda_param,
                "l_multiplier": l_multiplier,
                "mean": round(mean_val, 4),
                "std_dev": round(std_dev, 4),
            },
        }


async def validate_calibration(
    db: AsyncSession,
    reference_station_id: str,
    test_station_id: str,
    sensor_type: str,
    hours: int = 24,
) -> Dict[str, any]:
    """Compare two sensors and calculate calibration metrics (R², RMSE, MAE).

    Matches readings by nearest timestamp within a 5-minute window.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    ref_stmt = (
        select(SensorReading.timestamp, SensorReading.value)
        .where(SensorReading.station_id == reference_station_id)
        .where(SensorReading.sensor_type == sensor_type)
        .where(SensorReading.timestamp >= cutoff)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )
    test_stmt = (
        select(SensorReading.timestamp, SensorReading.value)
        .where(SensorReading.station_id == test_station_id)
        .where(SensorReading.sensor_type == sensor_type)
        .where(SensorReading.timestamp >= cutoff)
        .where(SensorReading.deleted_at.is_(None))
        .order_by(SensorReading.timestamp.asc())
    )

    ref_result = await db.execute(ref_stmt)
    test_result = await db.execute(test_stmt)
    ref_rows = ref_result.all()
    test_rows = test_result.all()

    if not ref_rows or not test_rows:
        return {
            "error": "Insufficient data for one or both sensors",
            "reference_count": len(ref_rows),
            "test_count": len(test_rows),
        }

    # Match by nearest timestamp (within 5 minutes)
    matched_pairs = []
    window = timedelta(minutes=5)
    test_idx = 0
    for ref_ts, ref_val in ref_rows:
        while test_idx < len(test_rows) and test_rows[test_idx][0] < ref_ts - window:
            test_idx += 1
        if test_idx < len(test_rows) and abs((test_rows[test_idx][0] - ref_ts).total_seconds()) <= window.total_seconds():
            matched_pairs.append((float(ref_val), float(test_rows[test_idx][1])))
            test_idx += 1

    if len(matched_pairs) < 3:
        return {
            "error": "Too few matched readings within 5-minute window",
            "matched_count": len(matched_pairs),
        }

    y_true = [pair[0] for pair in matched_pairs]
    y_pred = [pair[1] for pair in matched_pairs]

    r2 = calculate_r_squared(y_true, y_pred)
    rmse = calculate_rmse(y_true, y_pred)
    mae = calculate_mae(y_true, y_pred)
    mean_ref = sum(y_true) / len(y_true)
    mean_test = sum(y_pred) / len(y_pred)
    bias = mean_test - mean_ref

    # Drift detection on test sensor values
    detector = DriftDetector()
    ref_std = (sum((y - mean_ref) ** 2 for y in y_true) / len(y_true)) ** 0.5
    cusum_result = detector.cusum(y_pred, mean_ref, ref_std if ref_std > 0 else 1.0)
    ewma_result = detector.ewma(y_pred)

    return {
        "reference_station_id": reference_station_id,
        "test_station_id": test_station_id,
        "sensor_type": sensor_type,
        "matched_readings": len(matched_pairs),
        "r_squared": round(r2, 4),
        "rmse": round(rmse, 4),
        "mae": round(mae, 4),
        "bias": round(bias, 4),
        "reference_mean": round(mean_ref, 4),
        "test_mean": round(mean_test, 4),
        "drift": {
            "cusum": cusum_result,
            "ewma": ewma_result,
        },
    }
