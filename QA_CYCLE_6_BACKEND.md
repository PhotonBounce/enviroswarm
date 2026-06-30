# ENViroSwarm Backend — QA Cycle 6 Re-Review Report

**Reviewer:** Senior QA Engineer (Sub-agent)  
**Scope:** `backend/app/` and `backend/tests/`  
**Date:** 2026-06-30  
**Repo:** `D:/photonbounce/enviroswarm`  
**Focus:** Zero-tolerance review of all Python files in scope. Verify Cycle 4 fixes, identify new regressions, and find every remaining issue.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Critical** | 7 |
| **High** | 10 |
| **Medium** | 12 |
| **Low** | 8 |
| **Total** | **37** |

Cycle 5 was supposed to address the 25 remaining issues from Cycle 4. **Several were fixed**, but **three critical regressions were introduced** during the fix process: a missing `import uuid` across three auth modules (which completely breaks JWT authentication), a dangerously short `IdempotencyKey.key_hash` column, and missing `require_permission` on `data.py` endpoints. In addition, **rate-limiting dependency is still missing from `stations.py`, `apikeys.py`, and `billing.py`**, leaving those endpoints unprotected.

---

## Critical Issues (7)

### C1 — Missing `import uuid` in `app/auth.py` breaks ALL JWT auth
**File:** `app/auth.py` (line 134)  
**Severity:** Critical  
**Description:** The module uses `uuid.UUID(user_id)` inside `_get_user_from_token` (line 134) but never imports `uuid`. Every endpoint that depends on `get_current_user` or `get_current_user_optional` will raise `NameError: name 'uuid' is not defined` at runtime. This is a **total auth failure** for JWT-based requests.  
**Likely cause:** Removed during a prior refactor (M6 fix in Cycle 4).  
**Fix:** Add `import uuid` at the top of the file.

### C2 — Missing `import uuid` in `app/routers/auth.py` breaks refresh token endpoint
**File:** `app/routers/auth.py` (line 109)  
**Severity:** Critical  
**Description:** `refresh_token` calls `uuid.UUID(user_id)` at line 109 without importing `uuid`. The refresh endpoint will always crash with `NameError`.  
**Fix:** Add `import uuid` at the top of the file.

### C3 — Missing `import uuid` in `app/dependencies.py` breaks API-key fallback JWT path
**File:** `app/dependencies.py` (line 163)  
**Severity:** Critical  
**Description:** `get_current_user_or_api_key` falls back to JWT when no API key is present. It calls `uuid.UUID(user_id)` at line 163 but `uuid` is not imported. This means any request that uses `Authorization: Bearer <jwt>` and is handled by `get_current_user_or_api_key` (which is almost all endpoints) will crash with `NameError`.  
**Fix:** Add `import uuid` at the top of the file.

### C4 — `data.py` endpoints do not enforce API key read permissions
**File:** `app/routers/data.py` (lines 14, 27, 136)  
**Severity:** Critical  
**Description:** `query_data` and `nearby` import `require_permission` but never apply it. A write-only API key can call `GET /api/v1/data` and `GET /api/v1/data/nearby` without restriction. This is the exact same half-implementation reported as **C6 / N1** in Cycle 4 and was **not** fixed.  
**Fix:** Change both endpoint signatures to include `user: User = Depends(require_permission("read"))` (or combine with `rate_limit_dependency`).

### C5 — `apikeys.py` `create_api_key` does not enforce API key write permissions
**File:** `app/routers/apikeys.py` (line 33)  
**Severity:** Critical  
**Description:** `create_api_key` uses `require_tier("pro", "enterprise")` but never `require_permission("write")`. A read-only API key belonging to a pro user can create new API keys.  
**Fix:** Add `Depends(require_permission("write"))` to the endpoint or combine it with `require_tier`.

### C6 — `IdempotencyKey` `key_hash` column is too short for the application value
**File:** `app/routers/ingest.py` (lines 38, 133); `app/models.py` (line 201)  
**Severity:** Critical  
**Description:** The application stores `key_hash = f"{user.id}:{idempotency_key}"` (36 + 1 + N chars). The model defines `key_hash` as `String(64)`. Any client-supplied idempotency key longer than 27 characters will cause a **database overflow / 500 error** on commit. The client controls the key length, making this an easily exploitable crash vector.  
**Fix:** Hash the composite with SHA-256 (`hashlib.sha256(f"{user.id}:{idempotency_key}".encode()).hexdigest()`) and keep `String(64)`, or change the column to `String(255)`.

### C7 — `IdempotencyKey` model has no unique constraint on `(user_id, key_hash)`
**File:** `app/models.py` (lines 210–212)  
**Severity:** Critical  
**Description:** The idempotency check is performed **before** the user row lock. Two concurrent requests with the same idempotency key can both find no cached entry, both pass validation, both insert readings, and both insert `IdempotencyKey` rows. Without a database unique constraint, duplicate data is silently committed.  
**Fix:** Add `UniqueConstraint("user_id", "key_hash", name="uq_idempotency_user_key")` to `__table_args__`, and catch `IntegrityError` in the ingest endpoint to return the cached response.

---

## High Issues (10)

### H1 — `stations.py`, `apikeys.py`, and `billing.py` endpoints have no rate limiting
**File:** `app/routers/stations.py` (lines 18, 63, 90, 113, 150); `app/routers/apikeys.py` (lines 30, 81, 95); `app/routers/billing.py` (line 55)  
**Severity:** High  
**Description:** `rate_limit_dependency` is only used in `data.py` and `ingest.py`. Every station, API key, and billing endpoint is unprotected. A malicious user can spam `create_station`, `delete_station`, `create_api_key`, `revoke_api_key`, and `subscribe` without throttling.  
**Fix:** Add `Depends(rate_limit_dependency)` to every mutating endpoint, and at least `Depends(get_current_user_or_api_key)` + `Depends(rate_limit_dependency)` to read endpoints.

### H2 — `tests/test_ingest.py` uses a stale timestamp that fails retention validation
**File:** `tests/test_ingest.py` (line 55)  
**Severity:** High  
**Description:** The test sends `"timestamp": "2024-06-01T12:00:00Z"`. The free-tier retention window is 7 days. As of the current date (2026-06-30), this timestamp is **~730 days outside** the allowed range. The ingest endpoint will return `400` with `"Timestamp out of allowed range"`, causing the test assertion `status_code == 200` to fail.  
**Fix:** Use `datetime.now(timezone.utc).isoformat()` or a timestamp within the last 7 days.

### H3 — No tests exist for `apikeys.py`, `billing.py`, or `data.py`
**File:** `backend/tests/`  
**Severity:** High  
**Description:** The test suite only covers `auth`, `stations`, and `ingest`. There are zero tests for API key CRUD, billing/subscription, data queries, or the nearby endpoint. This means the `uuid` bug (C1–C3), the permission gaps (C4–C5), and the geo-query logic are completely unexercised.  
**Fix:** Add `test_apikeys.py`, `test_billing.py`, and `test_data.py` with positive and negative cases.

### H4 — Missing database indexes on high-cardinality query columns
**File:** `app/models.py` (`SensorReading`, `SensorStation`)  
**Severity:** High  
**Description:** The following columns are heavily filtered but have no indexes:

| Table | Column | Why it needs an index |
|-------|--------|----------------------|
| `sensor_readings` | `station_id` | Joined in every data query |
| `sensor_readings` | `sensor_type` | Filtered in `query_data` and `nearby` |
| `sensor_readings` | `timestamp` | Range filter in `query_data` and `today_count` |
| `sensor_readings` | `deleted_at` | Filtered in almost every query |
| `sensor_stations` | `user_id` | Filtered in `list_stations`, `nearby`, `ingest` |
| `sensor_stations` | `latitude` | Range filter in `nearby` bounding box |
| `sensor_stations` | `longitude` | Range filter in `nearby` bounding box |
| `sensor_stations` | `deleted_at` | Filtered in almost every query |

At scale, every one of these queries will scan the full table.  
**Fix:** Add `Index(...)` entries to `__table_args__` for the above columns/column combinations.

### H5 — `SensorReadingPayload.timestamp` accepts naive datetimes, causing TypeError/500
**File:** `app/schemas.py` (lines 137–151); `app/routers/ingest.py` (line 84)  
**Severity:** High  
**Description:** `SensorReadingPayload.timestamp` is declared as `Optional[datetime] = None` with no timezone validator. If a client sends a naive ISO string (e.g., `"2024-06-01T12:00:00"`), Pydantic accepts it. The ingest endpoint then compares `r.timestamp < earliest_allowed` (line 84), where `earliest_allowed` is timezone-aware. This raises `TypeError: can't compare offset-naive and offset-aware datetimes`, resulting in an unhandled 500 error.  
**Fix:** Add a `field_validator` on `timestamp` that normalizes naive datetimes to UTC (or rejects them), mirroring `ApiKeyCreateRequest.validate_expires_at`.

### H6 — `UserRegisterRequest` schema does not enforce password complexity
**File:** `app/schemas.py` (lines 40–42); `app/routers/auth.py` (lines 44–47)  
**Severity:** High  
**Description:** The schema only validates `min_length=8`. The actual complexity rules (uppercase, lowercase, digit) are enforced by `validate_password` at runtime, which raises `ValueError` → `HTTPException(400)`. This means a client receives `400 Bad Request` instead of `422 Unprocessable Entity` for a weak password, violating the API contract and making client-side validation impossible.  
**Fix:** Add `field_validator` on `password` in `UserRegisterRequest` that calls `validate_password`.

### H7 — HTTPException responses do not match `StandardResponse` format
**File:** `app/main.py` (lines 89–109); all routers  
**Severity:** High  
**Description:** When any endpoint raises `HTTPException`, FastAPI returns `{"detail": "..."}`. The API's `StandardResponse` contract is `{"success": false, "data": null, "error": "..."}`. The global exception handler only catches bare `Exception`, not `HTTPException`. This means **every 400/401/403/404/409/429 from the routers returns a different JSON shape than the success responses**.  
**Fix:** Add an `HTTPException` handler to `app` that rewrites the response into `StandardResponse` format.

### H8 — `IdempotencyKey` check constraint can fail due to app/DB clock skew
**File:** `app/models.py` (line 211); `app/routers/ingest.py` (line 140)  
**Severity:** High  
**Description:** `expires_at` is computed by the app server (`datetime.now(timezone.utc) + timedelta(...)`), while `created_at` is set by the database (`server_default=func.now()`). If the app and DB clocks differ by even a millisecond in the wrong direction, `expires_at` can equal or be less than `created_at`, violating the `CheckConstraint("expires_at > created_at")` and causing a 500 on commit.  
**Fix:** Change `>` to `>=`, or compute `expires_at` relative to `func.now()` in the SQL statement instead of the app clock.

### H9 — `refresh` endpoint has no rate limiting
**File:** `app/routers/auth.py` (lines 98–134)  
**Severity:** High  
**Description:** An attacker with a stolen refresh token can call `POST /api/v1/auth/refresh` unlimited times. There is no `check_rate_limit` call and no `rate_limit_dependency`.  
**Fix:** Add `check_rate_limit` or `rate_limit_dependency` to the endpoint.

### H10 — `register` endpoint has no rate limiting
**File:** `app/routers/auth.py` (lines 31–60)  
**Severity:** High  
**Description:** An attacker can create unlimited accounts, filling the database with junk users. There is no `check_rate_limit` on registration.  
**Fix:** Add `check_rate_limit(f"register:{body.email}", "/auth/register", 3)` before the duplicate check.

---

## Medium Issues (12)

### M1 — Dead imports across multiple router files
**File:** `app/routers/data.py` (line 12 `get_current_user`, line 14 `require_permission`, line 21 `SENSOR_TYPES`); `app/routers/apikeys.py` (line 11 `get_current_user`); `app/routers/billing.py` (line 10 `get_current_user`); `app/routers/stations.py` (line 9 `get_current_user`); `app/routers/ingest.py` (line 7 `delete`)  
**Severity:** Medium  
**Description:** Multiple modules import symbols that are never referenced. `data.py` imports `get_current_user`, `require_permission`, and `SENSOR_TYPES` but uses none of them. `ingest.py` imports `delete` from SQLAlchemy but never uses it.  
**Fix:** Remove all dead imports.

### M2 — `query_data` `end` parameter accepts naive datetimes without normalization
**File:** `app/routers/data.py` (line 119)  
**Severity:** Medium  
**Description:** The `start` parameter is explicitly normalized to UTC if naive (line 43–44). The `end` parameter is not normalized. If a client sends a naive `end`, PostgreSQL interprets it using the server's local timezone, which may produce inconsistent or incorrect results compared to `start`.  
**Fix:** Apply the same `tzinfo` normalization to `end` before use.

### M3 — Old refresh tokens are never revoked (token rotation without blacklist)
**File:** `app/routers/auth.py` (lines 127–128)  
**Severity:** Medium  
**Description:** The refresh endpoint issues a new access token and a new refresh token, but the old refresh token is not blacklisted. A stolen refresh token can be used indefinitely until its natural expiration. This was reported as **L9** in Cycle 4 and remains open.  
**Fix:** Maintain a token blacklist (Redis set or DB table) keyed by `jti`, and reject blacklisted tokens in `_decode_token`.

### M4 — `app/main.py` lifespan still uses `create_all` instead of Alembic
**File:** `app/main.py` (lines 30–36)  
**Severity:** Medium  
**Description:** `Base.metadata.create_all` is called on startup. This is dangerous in production because it does not handle schema migrations, renames, or data migrations. It was reported as **M14** in Cycle 4 and remains open.  
**Fix:** Run `alembic upgrade head` in the Docker entrypoint and remove `create_all` from the lifespan.

### M5 — `global_exception_handler` generates random `request_id` with no upstream correlation
**File:** `app/main.py` (line 92)  
**Severity:** Medium  
**Description:** The handler generates `request_id = str(uuid.uuid4())[:8]` if none is found on `request.state`. But no middleware ever sets `request.state.request_id`. This means every log line for the same request gets the same random ID, but different requests have unrelated IDs, and there is no correlation with upstream request IDs (e.g., from a load balancer).  
**Fix:** Add a middleware that reads `X-Request-ID` from headers or generates one, and stores it on `request.state.request_id`.

### M6 — API key hash comparison is not constant-time
**File:** `app/dependencies.py` (line 117)  
**Severity:** Medium  
**Description:** The API key lookup loop does `if api_key.key_hash == key_hash:` using a standard Python string comparison. If an attacker can find two API keys with the same 8-char prefix (a 32-bit collision is feasible with millions of keys), the timing of the `==` comparison leaks which hash is being matched.  
**Fix:** Use `hmac.compare_digest(api_key.key_hash, key_hash)` for constant-time comparison.

### M7 — `ingest.py` exception handling has unreachable `except HTTPException` block
**File:** `app/routers/ingest.py` (lines 147–152)  
**Severity:** Medium  
**Description:** `except HTTPException` is followed by `except Exception`. Because `HTTPException` is a subclass of `Exception`, the first block is unreachable. The second block handles everything.  
**Fix:** Remove the redundant `except HTTPException` block.

### M8 — `data.py` `nearby` has dead code (`if sensor_type: pass`)
**File:** `app/routers/data.py` (line 174)  
**Severity:** Medium  
**Description:** The SQL query is built with a placeholder `if sensor_type: pass` that does nothing. The actual sensor_type filtering is done in Python after the query. This is misleading and leaves an unnecessary SQL branch.  
**Fix:** Remove the dead `if` block, or add a proper SQL filter (e.g., using JSON contains if `sensor_types` is indexed).

### M9 — `query_data` does not validate `start <= end`
**File:** `app/routers/data.py` (lines 28–32)  
**Severity:** Medium  
**Description:** If a client sends `start` after `end`, the query silently returns empty results. The client might not realize they made a mistake.  
**Fix:** Add a check: `if start and end and start > end: raise HTTPException(400, "start cannot be after end")`.

### M10 — `test_auth.py` has no refresh token test
**File:** `tests/test_auth.py`  
**Severity:** Medium  
**Description:** There is no test for `POST /api/v1/auth/refresh`. This allowed the missing `import uuid` (C2) to go undetected.  
**Fix:** Add a test that registers, logs in, calls refresh with the returned token, and asserts a new access token is returned.

### M11 — `test_auth.py` has no negative tests
**File:** `tests/test_auth.py`  
**Severity:** Medium  
**Description:** No tests for: duplicate email (409), weak password (400/422), wrong password (401), inactive/deleted user (401), missing token (401), or malformed token (401).  
**Fix:** Add parameterized negative tests for each boundary.

### M12 — `test_stations.py` missing update, delete, tier-limit, and unauthorized tests
**File:** `tests/test_stations.py`  
**Severity:** Medium  
**Description:** Tests only cover `POST /stations` and `GET /stations`. No tests for `PATCH`, `DELETE`, `status_filter`, tier limit enforcement, or 401/403 behavior.  
**Fix:** Expand test coverage to all CRUD operations and negative cases.

---

## Low Issues (8)

### L1 — `SensorStation` allows latitude without longitude (or vice versa)
**File:** `app/schemas.py` (lines 98–103); `app/routers/stations.py` (lines 47–54)  
**Severity:** Low  
**Description:** A station can be created with only `latitude` or only `longitude`. Such a station is useless for the `nearby` endpoint and produces a confusing data state.  
**Fix:** Add a `model_validator` that requires both or neither.

### L2 — `StationCreateRequest` allows duplicate sensor_types
**File:** `app/schemas.py` (line 102)  
**Severity:** Low  
**Description:** `sensor_types: List[str] = Field(..., min_length=1)` accepts `["temperature", "temperature"]`. The JSON column stores duplicates.  
**Fix:** Add a `field_validator` that deduplicates or rejects duplicates.

### L3 — `SensorReadingPayload.unit` is unvalidated
**File:** `app/schemas.py` (line 141)  
**Severity:** Low  
**Description:** `unit` accepts any string of length 1–20. No enum or pattern restricts it to valid units (e.g., `C`, `F`, `ppm`, `dB`).  
**Fix:** Add a `Literal` or `pattern` validator if a unit taxonomy is available.

### L4 — `ApiKey` and `Subscription` models lack `updated_at` column
**File:** `app/models.py` (lines 127, 163)  
**Severity:** Low  
**Description:** `User` and `SensorStation` have `updated_at` with `server_default` and `onupdate`. `ApiKey` and `Subscription` are missing this column, creating an inconsistency in audit trails.  
**Fix:** Add `updated_at` to both models.

### L5 — Retention and tier limits hardcoded in multiple files (DRY violation)
**File:** `app/routers/data.py` (line 39); `app/routers/ingest.py` (line 71); `app/routers/billing.py` (lines 19–47)  
**Severity:** Low  
**Description:** `retention_days`, `tier_limits`, and `PRICING_TIERS` are duplicated across routers. If a tier limit changes, multiple files must be updated.  
**Fix:** Extract these into a single `app/constants.py` or `app/config.py` module.

### L6 — `nearby` Python-side null checks are redundant after SQL filter
**File:** `app/routers/data.py` (lines 182–183)  
**Severity:** Low  
**Description:** The SQL query already filters `SensorStation.latitude.isnot(None)` and `SensorStation.longitude.isnot(None)`. The Python-side `if s.latitude is None or s.longitude is None: continue` is redundant.  
**Fix:** Remove the redundant checks or keep only one for defensive programming.

### L7 — `get_current_user_optional` is unused
**File:** `app/auth.py` (lines 155–162)  
**Severity:** Low  
**Description:** `get_current_user_optional` was refactored in Cycle 4 but is never referenced by any endpoint. It is dead code.  
**Fix:** Remove it or document the intended future use case.

### L8 — `SensorReading.value` has no upper/lower bounds validation
**File:** `app/schemas.py` (line 140); `app/models.py` (line 108)  
**Severity:** Low  
**Description:** `value` is `float` with no bounds. The database column is `Numeric(15, 6)` (max ~999,999,999,999.999). A client sending `1e308` will cause a database overflow/500 on insert.  
**Fix:** Add `Field(..., ge=-1e12, le=1e12)` or similar bounds to the schema.

---

## Cycle 4 Open Issues — Status

| Cycle 4 ID | Issue | Status |
|------------|-------|--------|
| C6 | API key permissions half-implemented | **Still open** (C4, C5 in this report) |
| H17 | In-memory rate limiter has no eviction / multi-process | **Partially fixed** — eviction added, but still in-memory; not addressed in this cycle |
| M14 | `create_all` instead of Alembic | **Still open** (M4 in this report) |
| L9 | Refresh token not revoked | **Still open** (M3 in this report) |
| N1 | API key read permissions on data/station endpoints | **Still open** (C4 in this report) |
| L3 | Alembic `env.py` unused imports | **Still open** — out of scope for this cycle but worth noting |
| L5 | `PRICING_TIERS` is a list | **Resolved** — lookup uses a set |

---

## New Issues Introduced Since Cycle 4

| ID | Issue | File | Likely Cause |
|----|-------|------|--------------|
| C1 | Missing `import uuid` in `app/auth.py` | `app/auth.py` | Refactor of `get_current_user_optional` → `_get_user_from_token` |
| C2 | Missing `import uuid` in `app/routers/auth.py` | `app/routers/auth.py` | Same refactor / import cleanup |
| C3 | Missing `import uuid` in `app/dependencies.py` | `app/dependencies.py` | Same refactor / import cleanup |
| C6 | `IdempotencyKey` `key_hash` column too short | `app/models.py`, `app/routers/ingest.py` | New `IdempotencyKey` model added without checking app value length |
| C7 | `IdempotencyKey` missing unique constraint | `app/models.py` | New model missing concurrency guard |
| H5 | Naive datetime in `SensorReadingPayload.timestamp` | `app/schemas.py` | New validator added for `expires_at` but not `timestamp` |
| H8 | `IdempotencyKey` clock-skew check constraint | `app/models.py` | New model using strict `>` with mixed app/DB timestamps |
| H9 | `refresh` endpoint no rate limit | `app/routers/auth.py` | Endpoint was rewritten (POST body) but rate limit was not added |
| H10 | `register` endpoint no rate limit | `app/routers/auth.py` | Endpoint was reviewed but rate limit was never added |
| H2 | Test ingest stale timestamp | `tests/test_ingest.py` | Timestamp validation added in Cycle 4; test was never updated |

---

## Summary

Cycle 5 **fixed** several long-standing issues: `IdempotencyKey` was moved to a database table (fixing the memory leak and non-transactional store from N3/N4), `nearby` got a proper pole guard and SQL bounding box (fixing N5), and the health endpoint now pings the database (fixing N6). However, **three critical `import uuid` regressions** were introduced during auth refactoring, which would completely break JWT authentication in production. The `IdempotencyKey` feature, while architecturally sound, shipped with a dangerously short column and a missing unique constraint, making it vulnerable to both crashes and race-condition duplicates.

The most alarming systemic finding is that **rate limiting and permission checking are still inconsistently applied**. `data.py` has rate limits but no read-permission checks; `stations.py` has permission checks but no rate limits; `billing.py` and `apikeys.py` have neither. This creates a Swiss-cheese security posture where an attacker can simply switch endpoints to bypass controls.

The test suite remains **critically incomplete**: no tests for `apikeys`, `billing`, `data`, or `refresh`; the single `ingest` test uses a stale timestamp that will fail; and there are no negative tests for any boundary condition.

### Priority Recommendations for Cycle 7

1. **Fix the `import uuid` regressions immediately.** These are show-stoppers.
2. **Fix `IdempotencyKey` schema:** widen `key_hash` (or hash it), add `UniqueConstraint`, and relax the `>` check constraint.
3. **Apply `rate_limit_dependency` and `require_permission` uniformly** across all routers. Consider a single combined dependency.
4. **Add an `HTTPException` handler** to enforce `StandardResponse` format for all errors.
5. **Fix the `test_ingest.py` timestamp** and add comprehensive tests for `apikeys`, `billing`, `data`, and `refresh`.
6. **Add database indexes** on `sensor_readings` and `sensor_stations` query columns.
7. **Normalize naive datetimes** in `SensorReadingPayload.timestamp` and `query_data.end`.
8. **Add password complexity validation** to `UserRegisterRequest` schema.
9. **Remove dead imports** and dead code.
10. **Implement refresh token blacklisting** (Redis or DB table keyed by `jti`).

---

*End of report.*
