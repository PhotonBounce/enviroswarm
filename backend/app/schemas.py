"""Pydantic v2 schemas for request/response validation."""

from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------

class StandardResponse(BaseModel):
    success: bool = True
    data: Any = None
    error: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

# ---------------------------------------------------------------------------
# Sensor types
# ---------------------------------------------------------------------------

SENSOR_TYPES = [
    "air_quality",
    "temperature",
    "humidity",
    "noise_level",
    "radiation",
    "water_quality",
    "co2",
    "pm25",
    "pm10",
    "voc",
]

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("password", mode="after")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        from app.auth import validate_password
        validate_password(v)
        return v

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: UUID
    email: str
    tier: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Sensor Stations
# ---------------------------------------------------------------------------

class StationUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    sensor_types: Optional[List[str]] = Field(None, min_length=1)
    status: Optional[str] = None

    @field_validator("sensor_types", mode="before")
    @classmethod
    def validate_sensor_types(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        invalid = [t for t in v if t not in SENSOR_TYPES]
        if invalid:
            raise ValueError(f"Invalid sensor types: {invalid}. Must be one of: {SENSOR_TYPES}")
        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for t in v:
            if t not in seen:
                seen.add(t)
                deduped.append(t)
        return deduped

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in {"active", "inactive", "maintenance"}:
            raise ValueError(f"Invalid status: {v}. Must be one of: active, inactive, maintenance")
        return v

    @model_validator(mode="after")
    def validate_latitude_longitude(self) -> "StationUpdateRequest":
        lat_set = "latitude" in self.model_fields_set
        lon_set = "longitude" in self.model_fields_set
        if lat_set != lon_set:
            raise ValueError("latitude and longitude must both be provided or both be omitted")
        if lat_set and lon_set and (self.latitude is not None) != (self.longitude is not None):
            raise ValueError("latitude and longitude must both be non-null or both be null")
        return self


class StationCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    sensor_types: List[str] = Field(..., min_length=1)
    status: str = "active"

    @field_validator("sensor_types", mode="before")
    @classmethod
    def validate_sensor_types(cls, v: List[str]) -> List[str]:
        invalid = [t for t in v if t not in SENSOR_TYPES]
        if invalid:
            raise ValueError(f"Invalid sensor types: {invalid}. Must be one of: {SENSOR_TYPES}")
        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for t in v:
            if t not in seen:
                seen.add(t)
                deduped.append(t)
        return deduped

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in {"active", "inactive", "maintenance"}:
            raise ValueError(f"Invalid status: {v}. Must be one of: active, inactive, maintenance")
        return v

    @field_validator("longitude", mode="after")
    @classmethod
    def validate_latitude_longitude(cls, v: Optional[float], info) -> Optional[float]:
        data = info.data
        lat = data.get("latitude")
        lon = v
        if (lat is not None) != (lon is not None):
            raise ValueError("latitude and longitude must both be set or both be omitted")
        return v

class StationResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sensor_types: List[str]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------

class SensorReadingPayload(BaseModel):
    station_id: UUID
    sensor_type: str
    value: float
    unit: str = Field(..., max_length=20)
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("sensor_type", mode="before")
    @classmethod
    def validate_sensor_type(cls, v: str) -> str:
        if v not in SENSOR_TYPES:
            raise ValueError(f"Invalid sensor_type. Must be one of: {SENSOR_TYPES}")
        return v

    @field_validator("timestamp", mode="after")
    @classmethod
    def validate_timestamp(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

    @field_validator("value", mode="after")
    @classmethod
    def validate_value_bounds(cls, v: float) -> float:
        if math.isnan(v):
            raise ValueError("Value cannot be NaN")
        if abs(v) >= 1e9:
            raise ValueError("value must be between -1e9 and 1e9")
        return v

    @field_validator("unit", mode="before")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        from app.constants import ACCEPTED_UNITS
        if v not in ACCEPTED_UNITS:
            raise ValueError(f"Invalid unit: {v}. Must be one of: {sorted(ACCEPTED_UNITS)}")
        return v

class IngestRequest(BaseModel):
    readings: List[SensorReadingPayload] = Field(..., min_length=1, max_length=1000)

class IngestResponse(BaseModel):
    inserted: int

# ---------------------------------------------------------------------------
# Data Query
# ---------------------------------------------------------------------------

class DataQueryResponse(BaseModel):
    id: UUID
    station_id: UUID
    sensor_type: str
    value: float
    unit: str
    timestamp: datetime
    reading_metadata: Optional[Dict[str, Any]] = Field(default=None, serialization_alias="metadata")

    model_config = ConfigDict(from_attributes=True)

class NearbyStationResponse(BaseModel):
    id: UUID
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sensor_types: List[str]
    distance_km: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# API Keys
# ---------------------------------------------------------------------------

class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    permissions: Optional[Dict[str, bool]] = None
    expires_at: Optional[datetime] = None

    @field_validator("permissions", mode="before")
    @classmethod
    def validate_permissions(cls, v: Optional[Dict[str, bool]]) -> Optional[Dict[str, bool]]:
        if v is None:
            return v
        invalid = [k for k in v if k not in {"read", "write"}]
        if invalid:
            raise ValueError(f"Invalid permissions: {invalid}. Only 'read' and 'write' are allowed")
        return v

    @field_validator("expires_at", mode="after")
    @classmethod
    def validate_expires_at(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= datetime.now(timezone.utc):
            raise ValueError("expires_at must be in the future")
        return v

class ApiKeyCreateResponse(BaseModel):
    id: UUID
    name: str
    key: str  # returned once at creation
    permissions: Dict[str, bool]
    rate_limit_per_min: int
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ApiKeyResponse(BaseModel):
    id: UUID
    name: str
    permissions: Dict[str, bool]
    rate_limit_per_min: int
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Billing / Subscription
# ---------------------------------------------------------------------------

class PricingTier(BaseModel):
    name: str
    price_monthly: float
    stations: int
    readings_per_day: int
    retention_days: int
    api_keys: int
    description: str

class SubscriptionRequest(BaseModel):
    tier: str = Field(..., pattern="^(pro|enterprise)$")
    duration_months: int = Field(1, ge=1, le=12)
    payment_intent_id: str = Field(..., min_length=1)

class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    tier: str
    start_date: datetime
    end_date: datetime
    payment_status: str
    payment_intent_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class ReportGenerateRequest(BaseModel):
    station_id: Optional[UUID] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    report_format: str = Field(..., pattern="^(pdf|csv|excel)$")
    name: str = Field(..., min_length=1, max_length=255)

    @field_validator("date_range_end", mode="after")
    @classmethod
    def validate_date_range(cls, v: Optional[datetime], info) -> Optional[datetime]:
        if v is None:
            return v
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        start = info.data.get("date_range_start")
        if start and v <= start:
            raise ValueError("date_range_end must be after date_range_start")
        return v

    @field_validator("date_range_start", mode="after")
    @classmethod
    def validate_start(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v


class ReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    station_id: Optional[UUID] = None
    name: str
    report_format: str
    status: str
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Share / Public Dashboard
# ---------------------------------------------------------------------------

class ShareCreateRequest(BaseModel):
    station_id: Optional[UUID] = None
    expires_at: Optional[datetime] = None

    @field_validator("expires_at", mode="after")
    @classmethod
    def validate_expires_at(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= datetime.now(timezone.utc):
            raise ValueError("expires_at must be in the future")
        return v


class ShareResponse(BaseModel):
    id: UUID
    user_id: UUID
    station_id: Optional[UUID] = None
    token: str
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicDashboardResponse(BaseModel):
    station: Optional[StationResponse] = None
    readings: List[DataQueryResponse] = []


# ---------------------------------------------------------------------------
# Predictive Analytics
# ---------------------------------------------------------------------------

class ForecastPoint(BaseModel):
    timestamp: datetime
    predicted_value: float
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None


class ForecastResponse(BaseModel):
    station_id: UUID
    sensor_type: str
    horizon: str
    points: List[ForecastPoint]


class AnomalyPoint(BaseModel):
    timestamp: datetime
    value: float
    sensor_type: str
    unit: str
    deviation_factor: float


class AnomalyResponse(BaseModel):
    station_id: UUID
    sensor_type: str
    anomalies: List[AnomalyPoint]
    total_readings: int
    anomaly_count: int


# ---------------------------------------------------------------------------
# Data Quality
# ---------------------------------------------------------------------------

class QualityMetrics(BaseModel):
    uptime_percentage: float
    completeness_percentage: float
    calibration_age_days: Optional[int] = None
    last_reading_at: Optional[datetime] = None
    expected_interval_minutes: int
    actual_interval_minutes: Optional[float] = None


class QualityScoreResponse(BaseModel):
    station_id: UUID
    overall_score: float  # 0-100
    metrics: QualityMetrics


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

class AuditLogResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

NOTIFY_METHODS = ["email", "webhook", "push"]
ALERT_CONDITIONS = ["gt", "lt", "eq", "gte", "lte"]


class AlertCreateRequest(BaseModel):
    station_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    sensor_type: str
    condition: str
    threshold: float = Field(..., ge=-1e9, le=1e9)
    notify_methods: List[str] = Field(default_factory=list)
    cooldown_minutes: int = Field(default=60, ge=0, le=10080)
    is_active: bool = True

    @field_validator("sensor_type", mode="before")
    @classmethod
    def validate_sensor_type(cls, v: str) -> str:
        if v not in SENSOR_TYPES:
            raise ValueError(f"Invalid sensor_type. Must be one of: {SENSOR_TYPES}")
        return v

    @field_validator("condition", mode="before")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        if v not in ALERT_CONDITIONS:
            raise ValueError(f"Invalid condition. Must be one of: {ALERT_CONDITIONS}")
        return v

    @field_validator("notify_methods", mode="before")
    @classmethod
    def validate_notify_methods(cls, v: List[str]) -> List[str]:
        invalid = [m for m in v if m not in NOTIFY_METHODS]
        if invalid:
            raise ValueError(f"Invalid notify_methods: {invalid}. Must be one of: {NOTIFY_METHODS}")
        return list(dict.fromkeys(v))  # deduplicate preserve order


class AlertUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sensor_type: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = Field(None, ge=-1e9, le=1e9)
    notify_methods: Optional[List[str]] = None
    cooldown_minutes: Optional[int] = Field(None, ge=0, le=10080)
    is_active: Optional[bool] = None

    @field_validator("sensor_type", mode="before")
    @classmethod
    def validate_sensor_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in SENSOR_TYPES:
            raise ValueError(f"Invalid sensor_type. Must be one of: {SENSOR_TYPES}")
        return v

    @field_validator("condition", mode="before")
    @classmethod
    def validate_condition(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALERT_CONDITIONS:
            raise ValueError(f"Invalid condition. Must be one of: {ALERT_CONDITIONS}")
        return v

    @field_validator("notify_methods", mode="before")
    @classmethod
    def validate_notify_methods(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        invalid = [m for m in v if m not in NOTIFY_METHODS]
        if invalid:
            raise ValueError(f"Invalid notify_methods: {invalid}. Must be one of: {NOTIFY_METHODS}")
        return list(dict.fromkeys(v))


class AlertResponse(BaseModel):
    id: UUID
    user_id: UUID
    station_id: UUID
    name: str
    sensor_type: str
    condition: str
    threshold: float
    notify_methods: List[str]
    cooldown_minutes: int
    is_active: bool
    last_triggered_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Data Aggregation
# ---------------------------------------------------------------------------

class AggregationResponse(BaseModel):
    bucket: datetime
    sensor_type: str
    unit: str
    avg_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    count: int

    id: UUID
    user_id: UUID
    tier: str
    start_date: datetime
    end_date: datetime
    payment_status: str
    payment_intent_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
