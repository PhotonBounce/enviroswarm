# ENViroSwarm Backend — QA Cycle 15 Review Report

**Reviewer:** Senior QA Engineer  
**Scope:** `backend/app/` and `backend/tests/`  
**Repo:** `D:/photonbounce/enviroswarm` (branch `main`)  
**Date:** 2026-07-02

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 6 |
| **Low** | 8 |
| **Total** | **14** |

**Fix Verification:** All Critical and High issues from QA Cycles 1–12 are verified fixed. All Cycle 13–14 fixes are verified present and correct **except** where noted below. This cycle identifies **6 new Medium issues** and **8 new Low issues**, including **3 lingering issues** from earlier cycles that remain unaddressed.

---

## Fix Verification (Cycles 1–14)

### Critical — All Verified Fixed (7 / 7)

| Cycle ID | Issue | Verification |
|----------|-------|------------|
| C1 | Missing `import uuid` in `app/auth.py` | `import uuid` present at line 5. ✅ |
| C2 | Missing `import uuid` in `app/routers/auth.py` | `from uuid import UUID` present at line 6. ✅ |
| C3 | Missing `import uuid` in `app/dependencies.py` | `import uuid` present at line 6. ✅ |
| C4 | `data.py` endpoints missing API key read permissions | `require_permission("read")` added to `query_data` and `nearby`. ✅ |
| C5 | `apikeys.py` `create_api_key` missing write permission | `require_permission("write")` added. ✅ |
| C6 | `IdempotencyKey.key_hash` column too short for app value | Column is `String(64)`; app hashes with SHA-256 hex (64 chars). ✅ |
| C7 | `IdempotencyKey` missing unique constraint | `UniqueConstraint("user_id", "key_hash")` present. ✅ |

### High — All Verified Fixed (14 / 14)

| Cycle ID | Issue | Verification |
|----------|-------|------------|
| H1 | Missing rate limiting on `stations`, `apikeys`, `billing` | `rate_limit_dependency` applied to all endpoints. ✅ |
| H2 | `test_ingest.py` stale timestamp fails retention | Test uses `datetime.now(timezone.utc).isoformat()`. ✅ |
| H3 | Missing tests for `apikeys`, `billing`, `data` | `test_apikeys.py`, `test_billing.py`, `test_data.py` added. ✅ |
| H4 | Missing DB indexes on high-cardinality columns | Indexes added on `sensor_stations` and `sensor_readings`. ✅ |
| H5 | `SensorReadingPayload.timestamp` accepts naive datetimes | `validate_timestamp` normalizes naive to UTC. ✅ |
| H6 | `UserRegisterRequest` schema missing password complexity | `validate_password_complexity` field validator added. ✅ |
| H7 | `HTTPException` responses not matching `StandardResponse` | Global `http_exception_handler` rewrites all HTTPExceptions. ✅ |
| H8 | `IdempotencyKey` check constraint can fail on clock skew | Constraint changed to `expires_at >= created_at`. ✅ |
| H9 | `refresh` endpoint missing rate limiting | `check_rate_limit` added before token issuance. ✅ |
| H10 | `register` endpoint missing rate limiting | `check_rate_limit` added before duplicate check. ✅ |
| H1 (C12) | SQLAlchemy `Numeric` columns with `Mapped[float]` but no `asdecimal=False` | `asdecimal=False` added to all three columns. ✅ |
| H2 (C12) | `register` rate-limit key uses raw email before normalization | Normalization moved before rate-limit check. ✅ |
| H3 (C12) | `login` rate-limit key uses raw email before normalization | Normalization moved before rate-limit check. ✅ |
| H4 (C12) | `DataQueryResponse.metadata` alias prevents ORM deserialization | Renamed to `reading_metadata` with `serialization_alias="metadata"`. ✅ |
| M1 (C12) | `login` timing side-channel leaks whether email is registered | Dummy hash check added when user is `None`. ✅ |
| M2/M8 (C12) | `ingest.py` returns 409 for any `IntegrityError` when idempotency key present | Now specifically checks `exc.orig` for `uq_idempotency_user_key`. ✅ |
| M4 (C12) | `SensorReadingPayload.unit` rejects empty string | `min_length=1` removed from `unit` field. ✅ |
| M6 (C12) | `create_api_key` treats explicitly-empty `permissions` dict as falsy | Changed to `body.permissions if body.permissions is not None else ...`. ✅ |
| L2 (C12) | `ingest` endpoint no maximum length validation on `X-Idempotency-Key` | `len(idempotency_key) > 256` check added. ✅ |
| L3 (C12) | `bcrypt` silently truncates passwords longer than 72 bytes | `max_length=72` added to `UserRegisterRequest.password`. ✅ |
| L4 (C12) | API key `last_used_at` update runs in unprotected side session | `try/except` block added around side session. ✅ |
| L5 (C12) | Redundant `or 0` fallback on `COUNT(*)` in `data.py` | Removed. ✅ |
| L6 (C12) | Cascade soft-delete of readings bypasses ORM `onupdate` | `updated_at=now` included in bulk update. ✅ |
| H5 (C13) | Refresh-token revocation list is in-memory only | **FIXED** — `RevokedToken` DB model used; in-memory set removed. ✅ |
| H6 (C13) | Rate-limiting store is in-memory only | **FIXED** — `RateLimitEntry` DB model used; in-memory dict removed. ✅ |
| M1 (C13) | `query_data` aggregation uses PostgreSQL-specific `func.date_trunc` | **FIXED** — `_date_trunc` helper with SQLite `func.strftime` fallback added. ✅ |
| M2 (C13) | `billing.py` subscription duration uses fixed 30-day months | **FIXED** — Uses `relativedelta(months=body.duration_months)`. ✅ |
| M4 (C13) | `update_station` endpoint cannot clear `latitude`/`longitude` once set | **FIXED** — Uses `model_fields_set` to distinguish omitted vs. explicit null. ✅ |
| L1 (C13) | `list_api_keys` endpoint has no `order_by` | **FIXED** — `.order_by(ApiKey.created_at.desc())` added. ✅ |
| L2 (C13) | `list_stations` redundant `or 0` on `COUNT(*)` | **FIXED** — `scalar_one()` without `or 0`. ✅ |
| L3 (C13) | `ingest` redundant `or 0` on `COUNT(*)` | **FIXED** — `scalar_one()` without `or 0`. ✅ |
| L4 (C13) | `query_data` uses raw `status_code=400` | **FIXED** — Uses `status.HTTP_400_BAD_REQUEST`. ✅ |
| L5 (C13) | `get_current_user_or_api_key` redundant `if not user_id:` check | **FIXED** — Removed. ✅ |
| L6 (C13) | `subscribe` endpoint `except Exception:` loses original exception chain | **FIXED** — Uses `raise HTTPException(...) from exc`. ✅ |
| L7 (C13) | `test_ingest.py` insufficient test coverage | **FIXED** — 8 tests now cover limits, timestamps, idempotency, auth, permissions. ✅ |
| L8 (C13) | Redundant `str()` calls in `create_access_token` / `create_refresh_token` | **FIXED** — Inner `str()` wrappers removed. ✅ |
| L9 (C13) | `models.py` redundant `lazy="select"` on relationships | **FIXED** — Removed. ✅ |
| L10 (C13) | `ingest` endpoint inconsistently performs API key permission check inline | **FIXED** — Uses `require_permission("write")` dependency. ✅ |
| H1 (C14) | `update_station` PATCH regression unconditionally clears coordinates | **FIXED** — `model_fields_set` guards now preserve omitted fields. ✅ |
| M1 (C14) | `register` `except IntegrityError` overly broad, masks all DB failures as 409 | **FIXED** — Now checks `exc.orig` for `uq_users_email`; returns 500 for others. ✅ |
| M2 (C14) | Aggregation query bucket formatting crashes on SQLite | **FIXED** — Checks `isinstance(r.bucket, datetime)` before `.isoformat()`. ✅ |
| L3 (C14) | Dead code from old in-memory rate limiter in `dependencies.py` | **FIXED** — `_rate_limit_store` globals removed. ✅ |
| L4 (C14) | Health check endpoint return type annotation mismatch | **FIXED** — `except` branch now raises `HTTPException`; `-> dict` is correct. ✅ |
| L5 (C14) | Missing DB indexes on cleanup-critical columns | **FIXED** — Indexes added on `RevokedToken.expires_at` and `RateLimitEntry.window_start`. ✅ |
| L6 (C14) | No test coverage for `query_data` aggregation path | **FIXED** — Tests added for `hour`, `day`, and `month` aggregation. ✅ |
| L7 (C14) | Redundant `or 0` fallback on `COUNT(*)` in `create_station` | **FIXED** — Removed. ✅ |

### Lingering Issues from Previous Cycles (STILL OPEN)

| Cycle ID | Issue | Current Status |
|----------|-------|--------------|
| L1 (C11) | Unused `OAuth2PasswordBearer` import in `dependencies.py` | **STILL OPEN** — Import at line 12 remains unused. See L1 below. |
| L2 (C12) | Missing DB unique constraint on active subscriptions | **STILL OPEN** — TODO comment at `billing.py:70` remains. See L2 below. |
| M3 (C13) | `register` allows soft-deleted users to re-register; schema `unique=True` conflicts with app-level `deleted_at.is_(None)` filter | **STILL OPEN** — `except IntegrityError` now returns 409 cleanly, but the DB-level hard unique constraint on `email` still prevents re-registration of soft-deleted users. The application-level duplicate check implies deleted users should be able to re-register, but the schema contradicts this. See M6 below. |
| M3 (C14) | `check_rate_limit` initial insertion race condition (remaining from Cycle 14 M3) | **PARTIALLY FIXED** — `with_for_update()` was added, eliminating the increment race. However, the **initial insertion race** remains: two concurrent requests can both see `entry is None`, both attempt `session.add(RateLimitEntry(...))`, and the second commit raises an unhandled `IntegrityError` → HTTP 500. See M1 below. |

---

## Issues Found

### Medium

#### M1 — `check_rate_limit` initial insertion race condition causes unhandled IntegrityError under concurrent load
**File:** `app/dependencies.py` (lines 40–42)  
**Severity:** Medium  
**Status:** Remaining from Cycle 14 M3 — increment race fixed by `with_for_update()`, initial insertion race still open  
**Description:** When two concurrent requests hit a new `(identifier, route)` pair for the first time, both see `entry is None` and both attempt `session.add(RateLimitEntry(...))`. Because the row does not yet exist, `with_for_update()` provides no lock. The second `commit()` raises an unhandled `IntegrityError` (primary key violation), which propagates as HTTP 500.  
**Fix:** Wrap the initial insertion in a `try/except IntegrityError` and retry the select, or use `INSERT ... ON CONFLICT DO UPDATE` (upsert) to make the insertion atomic.

#### M2 — CORS `allow_methods` missing `OPTIONS` causes browser preflight failures
**File:** `app/main.py` (line 67)  
**Severity:** Medium  
**New in Cycle 15**  
**Description:** The `CORSMiddleware` is configured with `allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"]`. Browsers send an `OPTIONS` preflight request for non-simple CORS operations (e.g., requests with `Authorization` or `Content-Type: application/json` headers). Because `OPTIONS` is not in the allowed methods, the preflight response will be rejected by the browser, breaking the frontend.  
**Fix:** Add `"OPTIONS"` to `allow_methods`.

#### M3 — `IdempotencyKey` table has no cleanup mechanism and will grow unbounded
**File:** `app/main.py` (lifespan, lines 40–46); `app/models.py` (lines 239–261)  
**Severity:** Medium  
**New in Cycle 15**  
**Description:** The `IdempotencyKey` model stores a row for every unique `X-Idempotency-Key` used in ingest requests. Rows have `expires_at` (5 minutes after creation), but the `lifespan` startup cleanup only purges `RevokedToken` and `RateLimitEntry`. There is no scheduled or startup cleanup for `IdempotencyKey`. Over time this table grows without bound, consuming storage and degrading query performance. Additionally, there is no index on `expires_at`, so any future cleanup query would perform a full table scan.  
**Fix:** Add `cleanup_idempotency_keys()` to the lifespan startup routine, and add `Index("ix_idempotency_keys_expires_at", "expires_at")` to the model.

#### M4 — `StationUpdateRequest` latitude/longitude pair validation is bypassed when only one field is sent
**File:** `app/routers/stations.py` (lines 137–142); `app/schemas.py` (lines 111–119)  
**Severity:** Medium  
**New in Cycle 15**  
**Description:** The `validate_latitude_longitude` validator is attached only to the `longitude` field. When a client sends a PATCH with only `{"latitude": null}` (or any value for `latitude` without `longitude`), the validator never runs. The endpoint then updates `station.latitude` via `model_fields_set` but leaves `station.longitude` unchanged, potentially leaving the station in an inconsistent state (one coordinate set without the other).  
**Fix:** Add a `@model_validator(mode="after")` on `StationUpdateRequest` that validates the pair regardless of which fields are present, or add a symmetric field validator on `latitude`.

#### M5 — `rate_limit_dependency` uses `request.url.path`, allowing rate-limit circumvention by varying resource IDs
**File:** `app/dependencies.py` (line 197)  
**Severity:** Medium  
**New in Cycle 15**  
**Description:** `rate_limit_dependency` builds the rate-limit key using `route = f"{request.method}:{request.url.path}"`. Because `request.url.path` includes the actual path parameter value (e.g., `/api/v1/stations/123` vs `/api/v1/stations/456`), each resource ID gets its own independent rate-limit counter. A user can bypass the per-endpoint limit by cycling through different IDs (e.g., deleting 10 stations, then 10 more, then 10 more). The intended behavior is to rate-limit by endpoint pattern, not by individual resource.  
**Fix:** Use the route's endpoint pattern or a fixed route identifier (e.g., `request.scope["route"].name` or a manually maintained mapping) instead of `request.url.path`.

#### M6 — `User.email` hard `unique=True` constraint conflicts with soft-delete re-registration logic
**File:** `app/models.py` (line 31); `app/routers/auth.py` (lines 70–76)  
**Severity:** Medium  
**Status:** Lingering from Cycle 13 M3 — underlying schema inconsistency remains  
**Description:** The `User` model declares `email` with `unique=True`, which does not consider `deleted_at`. The `register` endpoint’s application-level duplicate check filters out soft-deleted users (`User.deleted_at.is_(None)`), implying that a deleted user should be able to re-register. However, the INSERT will always violate the DB unique constraint, causing an `IntegrityError`. While the endpoint now catches this and returns 409, the business logic is inconsistent: the app says "this email is available" but the schema says "it is not." This also prevents legitimate re-registration of deleted users.  
**Fix:** Remove the blanket `unique=True` on `email` and add a partial unique index `CREATE UNIQUE INDEX uq_user_email ON users(email) WHERE deleted_at IS NULL`, or change the duplicate check to include soft-deleted users and return a different message.

---

### Low

#### L1 — Unused `OAuth2PasswordBearer` import remains in `dependencies.py`
**File:** `app/dependencies.py` (line 12)  
**Severity:** Low  
**Status:** Lingering from Cycle 11 — NOT FIXED  
**Description:** The `OAuth2PasswordBearer` class is imported but never referenced in the module. The instantiation was removed in a prior cycle, but the import statement itself was left behind, creating dead code.  
**Fix:** Remove the unused import.

#### L2 — Missing DB-level unique partial index on active subscriptions
**File:** `app/routers/billing.py` (line 70)  
**Severity:** Low  
**Status:** Lingering from Cycle 12 — PARTIALLY FIXED  
**Description:** The `subscribe` endpoint uses `SELECT ... FOR UPDATE` on the user row to prevent application-level race conditions, which is effective. However, the TODO comment still acknowledges the missing DB-level unique partial index on `(user_id)` where `deleted_at IS NULL` and `end_date >= now()`. A database constraint is the final defense-in-depth against duplicate active subscriptions.  
**Fix:** Add a unique partial index or constraint at the migration level.

#### L3 — `get_current_user` type hint `request: Request = None` is incorrect
**File:** `app/auth.py` (line 189)  
**Severity:** Low  
**New in Cycle 15**  
**Description:** The parameter is declared as `request: Request = None`, which violates the type contract (a `Request` object cannot be `None`). While FastAPI injects the request at runtime, static type checkers will flag this, and it is inconsistent with the `Optional[str]` annotation used for `token`.  
**Fix:** Change to `request: Optional[Request] = None`.

#### L4 — `extract_api_key` function signature uses `Header(None)` as a regular parameter default
**File:** `app/dependencies.py` (line 81)  
**Severity:** Low  
**New in Cycle 15**  
**Description:** `extract_api_key` is a plain utility function, not a FastAPI route handler or dependency. Declaring `x_api_key: Optional[str] = Header(None)` in its signature is misleading because `Header` defaults have no effect when the function is called as a regular Python function. The caller (`get_current_user_or_api_key`) passes the resolved string value anyway.  
**Fix:** Change to `x_api_key: Optional[str] = None`.

#### L5 — `test_auth.py` module-scoped `client` fixture retains cookies across tests
**File:** `backend/tests/test_auth.py` (line 11)  
**Severity:** Low  
**New in Cycle 15**  
**Description:** The `client` fixture has `scope="module"`, meaning the same `httpx.AsyncClient` instance is reused across all tests in the module. The `login` endpoint sets `httpOnly` cookies on the response. Subsequent tests (e.g., `test_me_malformed_token`) may inadvertently send these stale cookies. Because `get_current_user` falls back to the cookie when the header token is invalid, a test that expects 401 could instead receive 200 if a valid cookie from a prior test is still present. This is a test-flakiness risk.  
**Fix:** Change `scope="module"` to `scope="function"`, or add a `client.cookies.clear()` call in an autouse fixture.

#### L6 — Pydantic v2 `Config` class is deprecated in favor of `model_config`
**File:** `app/schemas.py` (multiple locations: lines 71–72, 171–172, 236–237, 279–280, 291–292, 320–321)  
**Severity:** Low  
**New in Cycle 15**  
**Description:** Six response models use `class Config: from_attributes = True`. Pydantic v2 recommends `model_config = ConfigDict(from_attributes=True)` instead. While the `Config` class still works, it is legacy syntax and may be removed in a future major version.  
**Fix:** Replace all `class Config: from_attributes = True` with `model_config = ConfigDict(from_attributes=True)`.

#### L7 — SQLAlchemy 2.0 `declarative_base()` is legacy; `DeclarativeBase` subclass is preferred
**File:** `app/database.py` (line 7)  
**Severity:** Low  
**New in Cycle 15**  
**Description:** `Base = declarative_base()` is the SQLAlchemy 1.x style. SQLAlchemy 2.0 recommends defining an explicit `class Base(DeclarativeBase): pass` for better type safety and future compatibility.  
**Fix:** Replace `from sqlalchemy.orm import declarative_base` and `Base = declarative_base()` with `from sqlalchemy.orm import DeclarativeBase` and `class Base(DeclarativeBase): pass`.

#### L8 — `test_update_station` does not verify coordinate preservation or partial update validation
**File:** `backend/tests/test_stations.py` (lines 111–127)  
**Severity:** Low  
**New in Cycle 15**  
**Description:** The test only asserts that the `name` field is updated. It does not verify that coordinates are preserved when only `name` is sent (regression coverage for Cycle 14 H1), nor does it test that sending only one coordinate without the other is rejected (coverage for M4 above).  
**Fix:** Add assertions for coordinate preservation on a partial PATCH, and add a test case that sends `{"latitude": null}` without `longitude` and expects 422.

---

*End of report.*
