# ENViroSwarm Backend — QA Cycle 10 Review Report

**Reviewer:** Senior QA Engineer  
**Scope:** `backend/app/` and `backend/tests/`  
**Date:** 2026-07-01  
**Repo:** `D:/photonbounce/enviroswarm` (branch `main`)  

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 2 |
| **Low** | 7 |
| **Total** | **9** |

All **Critical** and **High** issues from prior QA Cycles 1–9 are verified fixed. The remaining findings are 2 medium-severity issues (1 lingering from Cycle 8, 1 new) and 7 low-severity maintainability/style issues.

---

## Fix Verification (Cycles 1–9)

### Critical — All Verified Fixed (7 / 7)

| Cycle ID | Issue | Verification |
|----------|-------|------------|
| C1 | Missing `import uuid` in `app/auth.py` | `import uuid` present at line 5. ✅ |
| C2 | Missing `import uuid` in `app/routers/auth.py` | `from uuid import UUID` present at line 6. ✅ |
| C3 | Missing `import uuid` in `app/dependencies.py` | `import uuid` present at line 6. ✅ |
| C4 | `data.py` endpoints missing API key read permissions | `require_permission("read")` added to both `query_data` and `nearby`. ✅ |
| C5 | `apikeys.py` `create_api_key` missing write permission | `require_permission("write")` added. ✅ |
| C6 | `IdempotencyKey.key_hash` column too short for app value | Column is `String(64)`; app hashes with SHA-256 hex (64 chars). ✅ |
| C7 | `IdempotencyKey` missing unique constraint | `UniqueConstraint("user_id", "key_hash")` present. ✅ |

### High — All Verified Fixed (10 / 10)

| Cycle ID | Issue | Verification |
|----------|-------|------------|
| H1 | Missing rate limiting on `stations`, `apikeys`, `billing` | `rate_limit_dependency` applied to all endpoints in all routers. ✅ |
| H2 | `test_ingest.py` stale timestamp fails retention | Test uses `datetime.now(timezone.utc).isoformat()`. ✅ |
| H3 | Missing tests for `apikeys`, `billing`, `data` | `test_apikeys.py`, `test_billing.py`, `test_data.py` added with positive and negative cases. ✅ |
| H4 | Missing DB indexes on high-cardinality columns | Indexes added on `sensor_stations` and `sensor_readings` query columns. ✅ |
| H5 | `SensorReadingPayload.timestamp` accepts naive datetimes | `validate_timestamp` normalizes naive to UTC. ✅ |
| H6 | `UserRegisterRequest` schema missing password complexity | `validate_password_complexity` field validator added. ✅ |
| H7 | `HTTPException` responses not matching `StandardResponse` | Global `http_exception_handler` rewrites all HTTPExceptions. ✅ |
| H8 | `IdempotencyKey` check constraint can fail on clock skew | Constraint changed to `expires_at >= created_at`. ✅ |
| H9 | `refresh` endpoint missing rate limiting | `check_rate_limit` added before token issuance. ✅ |
| H10 | `register` endpoint missing rate limiting | `check_rate_limit` added before duplicate check. ✅ |

### Medium & Low — Verified Fixed

All remaining Medium and Low issues from previous cycles have been verified fixed, including: refresh-token blacklisting (`_refresh_token_blacklist` + `jti` revocation), transactional idempotency (DB `IdempotencyKey` table within same session), cascade soft-delete on readings (`update(SensorReading).values(deleted_at=now)`), shared crypto helpers (`app/utils/crypto.py`), lazy engine factory (`get_engine()` / `get_sessionmaker()`), dead code removal (`SensorTypeValidator`, `get_current_user_optional`), `key_prefix` length alignment (`String(8)`), request-ID middleware (`X-Request-ID`), rate-limit eviction (`_evict_rate_limit_entries`), `PRICING_TIERS` set lookup, `StationCreateRequest` deduplication, `unit` validation against `ACCEPTED_UNITS`, `value` bounds (`abs(v) < 1e9`), pole guard on `nearby` bounding box (`lon_margin` capped at `180.0`), `health` endpoint DB ping, `jti` generation using `secrets.token_urlsafe`, `expires_at` validation in `ApiKeyCreateRequest`, `query_data`/`list_stations` regex patterns on query params, and `create_all` guard (`if settings.environment == "development"`).

**Note:** Cycle 8 issue **N12** (double evaluation of `get_current_user_or_api_key`) is verified as a false positive — FastAPI caches sub-dependency results per request, and the code also caches on `request.state._cached_user`, so the user is resolved exactly once.

---

## Issues Found

### Medium

#### M1 — `ingest.py` `except IntegrityError` catch-all returns misleading 409 when no idempotency key is present
**File:** `app/routers/ingest.py` (lines 148–171)  
**Severity:** Medium  
**Lingering from:** Cycle 8 (N11)  
**Description:** The `except IntegrityError` block assumes the only possible integrity error is a duplicate idempotency key. If `idempotency_key` is not provided and an unexpected `IntegrityError` occurs (e.g., a future DB constraint violation or FK edge case), the bottom `raise HTTPException(409, "Idempotency conflict or duplicate key")` executes, returning a misleading status code and message to the client. The endpoint should return 500 for unexpected integrity errors when no idempotency key was supplied.

#### M2 — `logout` endpoint does not revoke the refresh token
**File:** `app/routers/auth.py` (lines 191–199)  
**Severity:** Medium  
**Description:** The `logout` endpoint clears `access_token` and `refresh_token` cookies from the response, but it does **not** read the refresh token (from cookies or body) and revoke its `jti` via `revoke_refresh_token()`. A stolen refresh token remains valid for its full 7-day lifespan after the user explicitly logs out, allowing token replay. The endpoint should extract the refresh token and add its `jti` to the blacklist before clearing cookies.

### Low

#### L1 — Redundant `return` ternary in `ingest` endpoint
**File:** `app/routers/ingest.py` (line 147)  
**Description:** `result_data` is already computed unconditionally at line 134 (`IngestResponse(inserted=len(readings)).model_dump(mode="json")`). The ternary `result_data if idempotency_key else IngestResponse(...)` is redundant; `result_data` can be returned directly in all cases.

#### L2 — Redundant Python-side `sensor_type` check in `nearby` endpoint
**File:** `app/routers/data.py` (lines 190–191)  
**Description:** The SQL query already filters stations with `SensorStation.sensor_types.contains([sensor_type])` (line 183). The subsequent Python loop checks `if sensor_type and sensor_type not in s.sensor_types: continue`, which is redundant and adds unnecessary overhead.

#### L3 — Unused `oauth2_scheme` in `dependencies.py`
**File:** `app/dependencies.py` (line 21)  
**Description:** `OAuth2PasswordBearer` is instantiated into `oauth2_scheme` but is never referenced inside the module. `app/auth.py` defines its own `oauth2_scheme` that is actually used. This is dead code.

#### L4 — Unused `ARRAY` import in `models.py`
**File:** `app/models.py` (line 9)  
**Description:** `ARRAY` is imported from `sqlalchemy` but is not referenced anywhere in the model definitions.

#### L5 — Hardcoded `secure=False` in cookie settings regardless of environment
**File:** `app/routers/auth.py` (lines 37 and 45)  
**Description:** `COOKIE_SETTINGS` and `REFRESH_COOKIE_SETTINGS` hardcode `secure=False`. While there is a comment instructing to set it to `True` in production, the code does not dynamically adjust based on `settings.is_production`. A deployment oversight could leave cookies transmitted over insecure HTTP in production.

#### L6 — Unreachable password validation in `register` endpoint
**File:** `app/routers/auth.py` (lines 71–74)  
**Description:** The `UserRegisterRequest` schema already validates password complexity via `validate_password_complexity` (Pydantic `field_validator`). Because FastAPI validates the request body before the endpoint function is invoked, the endpoint's `try/except validate_password` block is unreachable dead code. It also uses a 400 status code instead of the schema's 422, creating an API-contract inconsistency that can never be exercised.

#### L7 — Incorrect type hint on `get_current_user` parameter
**File:** `app/auth.py` (line 174)  
**Description:** `request: Request = None` declares the parameter type as `Request` but allows `None` as the default. The correct type hint is `request: Optional[Request] = None` (or `request: Request | None = None`).

---

*End of report.*
