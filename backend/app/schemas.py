"""Pydantic v2 schemas for request/response validation."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

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

class SensorTypeValidator:
    @field_validator("sensor_type", mode="before")
    @classmethod
    def validate_sensor_type(cls, v: str) -> str:
        if v not in SENSOR_TYPES:
            raise ValueError(f"Invalid sensor_type. Must be one of: {SENSOR_TYPES}")
        return v

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

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

    class Config:
        from_attributes = True

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
        return v

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in {"active", "inactive", "maintenance"}:
            raise ValueError(f"Invalid status: {v}. Must be one of: active, inactive, maintenance")
        return v


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
        return v

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in {"active", "inactive", "maintenance"}:
            raise ValueError(f"Invalid status: {v}. Must be one of: active, inactive, maintenance")
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

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------

class SensorReadingPayload(BaseModel):
    station_id: UUID
    sensor_type: str
    value: float
    unit: str = Field(..., min_length=1, max_length=20)
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("sensor_type", mode="before")
    @classmethod
    def validate_sensor_type(cls, v: str) -> str:
        if v not in SENSOR_TYPES:
            raise ValueError(f"Invalid sensor_type. Must be one of: {SENSOR_TYPES}")
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
    metadata: Optional[Dict[str, Any]] = Field(default=None, alias="reading_metadata")

    class Config:
        from_attributes = True

class NearbyStationResponse(BaseModel):
    id: UUID
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sensor_types: List[str]
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# API Keys
# ---------------------------------------------------------------------------

class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    permissions: Optional[Dict[str, bool]] = None
    expires_at: Optional[datetime] = None

class ApiKeyCreateResponse(BaseModel):
    id: UUID
    name: str
    key: str  # returned once at creation
    permissions: Dict[str, bool]
    rate_limit_per_min: int
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ApiKeyResponse(BaseModel):
    id: UUID
    name: str
    permissions: Dict[str, bool]
    rate_limit_per_min: int
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

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

class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    tier: str
    start_date: datetime
    end_date: datetime
    payment_status: str
    created_at: datetime

    class Config:
        from_attributes = True
