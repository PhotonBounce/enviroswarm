"""Central constants for ENViroSwarm backend."""

from datetime import timedelta

# Retention windows by tier (days)
RETENTION_DAYS = {"free": 7, "pro": 90, "enterprise": 730}

# Daily reading ingestion limits by tier
READING_TIER_LIMITS = {"free": 100, "pro": 10000, "enterprise": 99999999}

# Station creation limits by tier
STATION_TIER_LIMITS = {"free": 1, "pro": 10, "enterprise": 9999}

# API key creation limits by tier
API_KEY_TIER_LIMITS = {"free": 0, "pro": 1, "enterprise": 10}

# Rate limits per tier (requests per minute)
RATE_LIMITS = {"free": 10, "pro": 100, "enterprise": 1000}

# Idempotency key TTL
IDEMPOTENCY_TTL_SECONDS = 300

# Accepted sensor units
ACCEPTED_UNITS = {
    "C", "F", "K",           # temperature
    "ppm", "ppb", "mg/m3",   # concentration
    "dB", "dBA",             # noise
    "µSv/h", "mSv/h",        # radiation
    "pH", "mg/L", "µg/L",    # water quality
    "µg/m3", "ng/m3",        # air quality (PM/VOC)
    "%", "RH",               # humidity
    "m", "km",               # distance
    "W/m2", "lux",           # light/solar
    "V", "A", "W",           # electrical
    "Pa", "hPa", "kPa",      # pressure
    "m/s", "km/h", "mph",    # wind
    "",                      # unitless / dimensionless
}
