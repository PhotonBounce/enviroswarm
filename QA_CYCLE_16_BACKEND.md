# ENViroSwarm Backend — QA Cycle 16 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 1 |
| **High** | 1 |
| **Medium** | 2 |
| **Low** | 5 |
| **Total** | **9** |

## Issues Found

### Critical

#### C-1: Invalid dummy bcrypt hash in login endpoint causes 500 errors and email enumeration
- **Location**: `app/routers/auth.py`, line 136
- **Description**: The `login` endpoint uses a hardcoded dummy bcrypt hash (`$2b$12$00000000000000000000000000000000000000000000000000000`) to equalize timing for non-existing users. This hash is **invalid** and causes `bcrypt.checkpw` to raise `ValueError: Invalid salt`. The exception propagates uncaught, bypassing the intended `HTTPException(401)` and returning a 500 error via the global exception handler. Attackers can distinguish non-existing emails (500) from existing emails with wrong passwords (401), defeating the email-enumeration protection and creating a stability vulnerability.
- **Impact**: Email enumeration, 500 errors for legitimate login attempts with non-existent emails.
- **Fix**: Replace the dummy hash with a pre-computed valid bcrypt hash (e.g., `bcrypt.hashpw(b"dummy", bcrypt.gensalt())` computed once at module load). Additionally, `verify_password` should catch `ValueError` and return `False` for defensive robustness.

### High

#### H-1: StationUpdateRequest validator allows partial coordinate nullification on PATCH
- **Location**: `app/schemas.py`, lines 110–114; `app/routers/stations.py`, lines 139–142
- **Description**: The `StationUpdateRequest` model validator only checks `(self.latitude is not None) != (self.longitude is not None)`. It does **not** inspect `model_fields_set`. When a client sends `{"latitude": null}` on a PATCH request, Pydantic sets `self.latitude = None` and `self.longitude = None` (default). The validator passes because both values are `None`. The endpoint then sets `station.latitude = None` (because `"latitude"` is in `model_fields_set`) but leaves `station.longitude` unchanged, creating a data-integrity violation (partial coordinates). The existing test `tests/test_stations.py::test_update_station_partial_coordinates_rejected` expects a 422 for this exact payload, but the endpoint currently returns 200.
- **Impact**: Corrupts station data with partial coordinates; test expectation mismatch.
- **Fix**: Enhance the validator to check `model_fields_set`:
  ```python
  lat_set = "latitude" in self.model_fields_set
  lon_set = "longitude" in self.model_fields_set
  if lat_set != lon_set:
      raise ValueError("latitude and longitude must both be provided or both be omitted")
  ```

### Medium

#### M-1: Missing unique constraint on active subscriptions allows MultipleResultsFound crash
- **Location**: `app/routers/billing.py`, line 83; `app/models.py`, `Subscription` model
- **Description**: The `subscribe` endpoint uses `scalar_one_or_none()` to find an existing active subscription. If a race condition creates two active subscriptions (e.g., two concurrent requests), `scalar_one_or_none()` raises `MultipleResultsFound`, causing a 500 error instead of a controlled 409. The model has a TODO comment acknowledging the missing migration (`CREATE UNIQUE INDEX uq_active_subscription ON subscriptions(user_id) WHERE deleted_at IS NULL AND end_date >= NOW()`).
- **Impact**: 500 crash under concurrent subscription creation.
- **Fix**: Add the unique partial index at the DB level and handle the potential `MultipleResultsFound` gracefully in code.

#### M-2: `postgresql_where` on users.email unique constraint causes SQLite/PostgreSQL behavior divergence
- **Location**: `app/models.py`, line 60
- **Description**: The `UniqueConstraint("email", postgresql_where=(deleted_at.is_(None)), ...)` is only rendered for PostgreSQL. On SQLite, the constraint applies to **all** rows, including soft-deleted users. This means a deleted user on SQLite blocks re-registration of the same email, while on PostgreSQL it does not (because the partial index only applies to non-deleted). The application code handles deleted-account re-registration by returning 409, but the DB-level behavior is inconsistent.
- **Impact**: Schema portability issue; different behavior across backends.
- **Fix**: Add a backend-agnostic solution, such as a functional unique index on `lower(email)` combined with application-level soft-delete checks, or use a conditional unique constraint that works on both backends.

### Low

#### L-1: Hardcoded sensor_type regex patterns duplicated across data endpoints
- **Location**: `app/routers/data.py`, lines 35 and 157
- **Description**: The `sensor_type` Query parameter in `query_data` and `nearby` uses hardcoded regex patterns `^(air_quality|temperature|...|voc)$`. If `SENSOR_TYPES` in `app/schemas.py` changes, these patterns must be updated manually. This is a maintenance risk.
- **Fix**: Generate the pattern dynamically from `SENSOR_TYPES` or use a shared validator.

#### L-2: Cookie max_age constants are not dynamically linked to token settings
- **Location**: `app/routers/auth.py`, lines 38–52
- **Description**: `COOKIE_SETTINGS["max_age"] = 3600` and `REFRESH_COOKIE_SETTINGS["max_age"] = 604800` are hardcoded. They happen to match `access_token_expire_minutes=60` and `refresh_token_expire_days=7`, but if settings change, the cookie lifetime will desync from the JWT expiry.
- **Fix**: Compute `max_age` from `settings.access_token_expire_minutes` and `settings.refresh_token_expire_days`.

#### L-3: Redundant sub claim validation in refresh_token endpoint
- **Location**: `app/routers/auth.py`, lines 167–169
- **Description**: `decode_refresh_token` already validates that `payload.get("sub")` is present and raises 401 if missing. The `refresh_token` endpoint repeats this check unnecessarily.
- **Fix**: Remove the redundant check.

#### L-4: SensorReadingPayload value validator does not reject NaN
- **Location**: `app/schemas.py`, line 198
- **Description**: The validator `if abs(v) >= 1e9` does not reject `float('nan')` because `abs(float('nan'))` is `nan`, and `nan >= 1e9` evaluates to `False`. NaN values could be stored in the database, potentially causing aggregation anomalies.
- **Fix**: Add an explicit `math.isnan(v)` check.

#### L-5: logout endpoint requires valid access token, preventing logout with expired token
- **Location**: `app/routers/auth.py`, line 226
- **Description**: The `logout` endpoint depends on `get_current_user`, which validates the access token. If a user's access token is expired but they still have a valid refresh token, they cannot call `/logout` to clear cookies and revoke the refresh token.
- **Fix**: Accept authentication via refresh token (e.g., via body or cookie) when the access token is expired, or make `get_current_user` optional and only revoke if a valid token is present.

## Previous Fix Verification

The following fixes from prior QA cycles appear present and structurally correct:
- Soft-delete checks (`deleted_at.is_(None)`) are consistently applied across all read/write endpoints.
- `with_for_update()` row locking is present in `create_station`, `create_api_key`, and `ingest` to prevent race conditions on tier limits.
- Database-backed idempotency key handling with transactional storage and `IntegrityError` race handling is present in `ingest`.
- Database-backed rate limiting with `RateLimitEntry` and cleanup is present.
- Request ID middleware and global exception handler with production-safe error masking are present.
- Dummy hash timing-equalization logic is present but **broken** (see Critical C-1).
- `StationUpdateRequest` partial-coordinate validator is present but **incomplete** (see High H-1).

However, **C-1** and **H-1** represent regressions or incomplete implementations of previous QA fixes that must be corrected.
