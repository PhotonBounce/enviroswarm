# ENViroSwarm Backend — QA Cycle 12 Review Report

**Reviewer:** Senior QA Engineer  
**Scope:** `backend/app/` and `backend/tests/`  
**Date:** 2026-07-02  
**Repo:** `D:/photonbounce/enviroswarm` (branch `main`)  

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 6 |
| **Medium** | 8 |
| **Low** | 6 |
| **Total** | **20** |

All **Critical** and **High** issues from prior QA Cycles 1–10 are verified fixed. Two issues from QA Cycle 11 remain open: **M1** (`ingest.py` `IntegrityError` catch-all) and **L1** (unused `OAuth2PasswordBearer` import). This cycle identifies **18 new issues** across all severity levels.

---

## Fix Verification (Cycles 1–11)

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

### High — All Verified Fixed (10 / 10)

| Cycle ID | Issue | Verification |
|----------|-------|------------|
| H1 | Missing rate limiting on `stations`, `apikeys`, `billing` | `rate_limit_dependency` applied to all endpoints in all routers. ✅ |
| H2 | `test_ingest.py` stale timestamp fails retention | Test uses `datetime.now(timezone.utc).isoformat()`. ✅ |
| H3 | Missing tests for `apikeys`, `billing`, `data` | `test_apikeys.py`, `test_billing.py`, `test_data.py` added. ✅ |
| H4 | Missing DB indexes on high-cardinality columns | Indexes added on `sensor_stations` and `sensor_readings`. ✅ |
| H5 | `SensorReadingPayload.timestamp` accepts naive datetimes | `validate_timestamp` normalizes naive to UTC. ✅ |
| H6 | `UserRegisterRequest` schema missing password complexity | `validate_password_complexity` field validator added. ✅ |
| H7 | `HTTPException` responses not matching `StandardResponse` | Global `http_exception_handler` rewrites all HTTPExceptions. ✅ |
| H8 | `IdempotencyKey` check constraint can fail on clock skew | Constraint changed to `expires_at >= created_at`. ✅ |
| H9 | `refresh` endpoint missing rate limiting | `check_rate_limit` added before token issuance. ✅ |
| H10 | `register` endpoint missing rate limiting | `check_rate_limit` added before duplicate check. ✅ |

### Medium & Low — Verified Fixed (All except 2 lingering)

All remaining Medium and Low issues from previous cycles have been verified fixed, including: refresh-token blacklisting (`_refresh_token_blacklist` + `jti` revocation), transactional idempotency (DB `IdempotencyKey` table within same session), cascade soft-delete on readings (`update(SensorReading).values(deleted_at=now)`), shared crypto helpers (`app/utils/crypto.py`), lazy engine factory (`get_engine()` / `get_sessionmaker()`), dead code removal (`SensorTypeValidator`, `get_current_user_optional`), `key_prefix` length alignment (`String(8)`), request-ID middleware (`X-Request-ID`), rate-limit eviction (`_evict_rate_limit_entries`), `PRICING_TIERS` set lookup, `StationCreateRequest` deduplication, `unit` validation against `ACCEPTED_UNITS`, `value` bounds (`abs(v) < 1e9`), pole guard on `nearby` bounding box (`lon_margin` capped at `180.0`), `health` endpoint DB ping, `jti` generation using `secrets.token_urlsafe`, `expires_at` validation in `ApiKeyCreateRequest`, `query_data`/`list_stations` regex patterns on query params, `create_all` guard (`if settings.environment == "development"`), cookie `secure` dynamic binding (`settings.is_production`), `get_current_user` parameter type hint (`Optional[Request]`), `nearby` sort fix (removed `or float("inf")`), `query_data` `avg_value` zero-fix (`is not None`), `register`/`login` email normalization (`lower().strip()`), `StationUpdateRequest` lat/lon pair validation, and `logout` refresh-token revocation.

### Lingering Issues from Cycle 11 (NOT Fixed)

| Cycle ID | Issue | Current Status |
|----------|-------|--------------|
| M1 | `ingest.py` `except IntegrityError` returns misleading 409 when idempotency key present but error is not from idempotency constraint | **STILL OPEN** — Code still returns 409 for any `IntegrityError` when `idempotency_key` is present, even if `exc.orig` does not contain `"uq_idempotency_user_key"`. ❌ |
| L1 | Unused `OAuth2PasswordBearer` import in `dependencies.py` | **STILL OPEN** — Import statement at line 11 remains; the instantiation was removed but the import was not. ❌ |

---

## Issues Found

### High

#### H1 — SQLAlchemy `Numeric` columns declared with `Mapped[float]` but return `Decimal` at runtime
**File:** `app/models.py` (lines 73, 74, 113)  
**Severity:** High  
**New in Cycle 12**  
**Description:** `SensorStation.latitude` and `.longitude` are typed as `Mapped[Optional[float]]`, and `SensorReading.value` is typed as `Mapped[float]`. All three columns use `Numeric(...)` with no `asdecimal=False`. SQLAlchemy's `Numeric` type returns `Decimal` objects by default. This contradicts the type annotations, causing type-checking failures, IDE confusion, and silent precision-related bugs when code expects `float` behavior (e.g., `isinstance(station.latitude, float)` returns `False`). The application code explicitly casts to `float` in some places (e.g., `data.py`), but the model contract is fundamentally wrong.  
**Fix:** Change type hints to `Mapped[Optional[Decimal]]` and `Mapped[Decimal]`, or add `asdecimal=False` to the `mapped_column` calls to match the `float` annotation.

---

#### H2 — `register` endpoint rate-limit key uses raw email before normalization, allowing case-based bypass
**File:** `app/routers/auth.py` (lines 59, 67)  
**Severity:** High  
**New in Cycle 12**  
**Description:** `check_rate_limit` is called with `f"register:{body.email}"` **before** `body.email = body.email.lower().strip()`. An attacker can send `User@Example.com`, `user@example.com`, `USER@EXAMPLE.COM`, etc. Each variant gets a separate rate-limit counter, but the duplicate-email check sees them as identical after normalization. This trivially bypasses the 3-per-minute registration limit.  
**Fix:** Normalize `body.email` before computing the rate-limit key: `normalized_email = body.email.lower().strip(); if not await check_rate_limit(f"register:{normalized_email}", ...)`.

---

#### H3 — `login` endpoint rate-limit key uses raw email before normalization, allowing case-based brute-force bypass
**File:** `app/routers/auth.py` (lines 99, 107)  
**Severity:** High  
**New in Cycle 12**  
**Description:** Identical to H2. The login rate-limit key `f"login:{body.email}"` is computed before email normalization. An attacker can try 5 passwords with `user@example.com`, then 5 with `User@example.com`, then 5 with `USER@EXAMPLE.COM`, etc., indefinitely bypassing the 5-per-minute brute-force protection.  
**Fix:** Normalize `body.email` before computing the rate-limit key.

---

#### H4 — `DataQueryResponse.metadata` alias prevents correct ORM deserialization; metadata always `None` in API responses
**File:** `app/schemas.py` (line 234); `app/routers/data.py` (line 138)  
**Severity:** High  
**New in Cycle 12**  
**Description:** `DataQueryResponse` declares `metadata: Optional[Dict[str, Any]] = Field(default=None, alias="reading_metadata")`. With `from_attributes=True`, Pydantic v2 looks up the ORM attribute using the **field name** (`metadata`), not the alias. The `SensorReading` model has the attribute `reading_metadata`, not `metadata`. Since `getattr(obj, "metadata")` raises `AttributeError`, Pydantic falls back to the default `None`. Every data query response therefore returns `"metadata": null` even when the database row contains actual metadata. The tests do not assert on the `metadata` field, so this bug is silent.  
**Fix:** Rename the field to `reading_metadata` and use `serialization_alias="metadata"` (or add `validation_alias="reading_metadata"`), or use a `@model_validator(mode="before")` to map the attribute.

---

#### H5 — Refresh-token revocation list is in-memory only; lost on restart or across workers
**File:** `app/auth.py` (lines 133–141)  
**Severity:** High  
**New in Cycle 12**  
**Description:** `_refresh_token_blacklist` is a global Python `set`. When the process restarts (deployment, crash, or scale-up), the set is empty. Any refresh token that was revoked before the restart becomes valid again. In a multi-worker deployment, a revocation in one worker is invisible to others. This breaks the security guarantee of token rotation. The code comment acknowledges this ("replace with Redis in production"), but the vulnerability is present in the current codebase.  
**Fix:** Replace the in-memory set with a Redis-backed store or a persistent database table keyed by `jti` with a TTL.

---

#### H6 — Rate-limiting store is in-memory only; not shared across workers or restarts
**File:** `app/dependencies.py` (lines 25–27)  
**Severity:** High  
**New in Cycle 12**  
**Description:** `_rate_limit_store` is a global `dict` with no persistence. Rate-limit counters are lost on every process restart and are not synchronized across workers. In a production deployment with multiple workers, a client could send `worker_count × limit` requests per minute without being throttled. Eviction logic exists, but the fundamental multi-process limitation remains.  
**Fix:** Replace with Redis `INCR`/`EXPIRE` or a shared cache backend.

---

### Medium

#### M1 — `login` endpoint timing side-channel leaks whether an email is registered
**File:** `app/routers/auth.py` (line 117)  
**Severity:** Medium  
**New in Cycle 12**  
**Description:** `if not user or not verify_password(body.password, user.hashed_password):` short-circuits: when `user` is `None`, `verify_password` (which performs slow bcrypt) is **not** called. When `user` exists but the password is wrong, `verify_password` **is** called. The measurable time difference (~50–100 ms) allows an attacker to enumerate registered email addresses without hitting rate limits.  
**Fix:** Always execute a dummy `bcrypt.checkpw` when the user is not found, using a constant-time comparison path.

---

#### M2 — `ingest.py` `except IntegrityError` string matching is brittle and driver-dependent (Lingering from Cycle 11)
**File:** `app/routers/ingest.py` (lines 148–165)  
**Severity:** Medium  
**Status:** Lingering from Cycle 11 — **NOT FIXED**  
**Description:** The `except IntegrityError` block checks `if "uq_idempotency_user_key" in str(exc.orig):`. If `exc.orig` is `None` (some drivers wrap exceptions differently), or if the driver does not include the constraint name in the error message (e.g., `asyncpg` vs `psycopg2`), the match fails and the code falls through to a generic 500 error. More importantly, when `idempotency_key` is present but the error is **not** from the idempotency constraint, the endpoint still returns `409 "Idempotency conflict or duplicate key"`, which is misleading and hinders debugging.  
**Fix:** Narrow the `if` to only return 409 when the constraint name is explicitly matched; otherwise return 500. Consider using a nested `try/except` around only the `IdempotencyKey` insertion.

---

#### M3 — `subscribe` endpoint has a race condition allowing duplicate active subscriptions
**File:** `app/routers/billing.py` (lines 71–83)  
**Severity:** Medium  
**New in Cycle 12**  
**Description:** The endpoint queries for an existing active subscription (`select(Subscription).where(...)`) and then inserts a new one. There is no database unique constraint enforcing one active subscription per user. Two concurrent requests can both find no existing subscription and both insert a new row, creating duplicate active subscriptions.  
**Fix:** Add a unique partial index on `(user_id, deleted_at)` where `deleted_at IS NULL` and `end_date >= now()`, or use `SELECT ... FOR UPDATE` on the user row before the check.

---

#### M4 — `SensorReadingPayload.unit` rejects empty string despite `ACCEPTED_UNITS` permitting unitless readings
**File:** `app/schemas.py` (line 182); `app/constants.py` (line 37)  
**Severity:** Medium  
**New in Cycle 12**  
**Description:** `ACCEPTED_UNITS` includes `""` (unitless / dimensionless) as a valid unit. However, `SensorReadingPayload.unit` is declared as `str = Field(..., min_length=1, max_length=20)`. The `min_length=1` validator rejects the empty string before the `validate_unit` field validator ever runs. Clients cannot submit truly unitless readings even though the backend constants and database schema support them.  
**Fix:** Remove `min_length=1` from the `unit` field, or remove `""` from `ACCEPTED_UNITS` if unitless readings are not intended.

---

#### M5 — `query_data` aggregation uses PostgreSQL-specific `func.date_trunc`, incompatible with SQLite
**File:** `app/routers/data.py` (line 62)  
**Severity:** Medium  
**New in Cycle 12**  
**Description:** The aggregation branch uses `func.date_trunc(trunc_unit, SensorReading.timestamp)`. `date_trunc` is a PostgreSQL-specific function. `database.py` explicitly handles SQLite by omitting `pool_size` and `max_overflow` when `database_url.startswith("sqlite")`, implying SQLite is a supported backend (e.g., for lightweight tests). Calling `query_data?aggregate=hour` against a SQLite database will raise a database error.  
**Fix:** Use a database-portable expression (e.g., `func.strftime` for SQLite with a dialect fallback) or document that aggregation requires PostgreSQL.

---

#### M6 — `create_api_key` treats explicitly-empty `permissions` dict as falsy and applies defaults
**File:** `app/routers/apikeys.py` (line 62)  
**Severity:** Medium  
**New in Cycle 12**  
**Description:** `permissions=body.permissions or {"read": True, "write": False}`. If a client explicitly sends `"permissions": {}`, the expression evaluates to `False` and the default permissions are silently applied. A user who intends to create a key with **no** permissions (empty set) gets read/write defaults instead.  
**Fix:** Use `permissions=body.permissions if body.permissions is not None else {"read": True, "write": False}`.

---

#### M7 — `billing.py` subscription duration uses fixed 30-day months, causing inaccurate billing periods
**File:** `app/routers/billing.py` (line 86)  
**Severity:** Medium  
**New in Cycle 12**  
**Description:** `end_date = start_date + timedelta(days=30 * body.duration_months)`. A 12-month subscription ends after 360 days instead of 365 or 366. This under-delivers the service period by 5–6 days for annual subscriptions and creates customer-facing billing discrepancies.  
**Fix:** Use `relativedelta(months=body.duration_months)` from `dateutil`, or compute `end_date` by adding months to the calendar.

---

#### M8 — `ingest.py` returns 409 for any `IntegrityError` when idempotency key is present, even if unrelated to idempotency (Lingering from Cycle 11)
**File:** `app/routers/ingest.py` (lines 160–165)  
**Severity:** Medium  
**Status:** Lingering from Cycle 11 — **NOT FIXED**  
**Description:** When `idempotency_key` is present and any `IntegrityError` occurs (not just the idempotency unique constraint), the code raises `HTTPException(409, "Idempotency conflict or duplicate key")`. This misleads the client and makes debugging actual database constraint failures extremely difficult.  
**Fix:** Return 500 for unexpected integrity errors when `idempotency_key` is present but the constraint violation is not `uq_idempotency_user_key`.

---

### Low

#### L1 — Unused `OAuth2PasswordBearer` import remains in `dependencies.py` (Lingering from Cycle 11)
**File:** `app/dependencies.py` (line 11)  
**Severity:** Low  
**Status:** Lingering from Cycle 11 — **NOT FIXED**  
**Description:** The `OAuth2PasswordBearer` class is imported but never referenced in the module. The instantiation was removed in a prior cycle, but the import statement itself was left behind, creating dead code and a minor maintenance burden.  
**Fix:** Remove the unused import.

---

#### L2 — `ingest` endpoint has no maximum length validation on `X-Idempotency-Key` header
**File:** `app/routers/ingest.py` (line 37)  
**Severity:** Low  
**New in Cycle 12**  
**Description:** The `X-Idempotency-Key` header value is read directly from the request without any length or format validation. An attacker could send a multi-megabyte header value, causing the SHA-256 hash to consume CPU and memory. While FastAPI/Starlette has its own header size limits, explicit validation provides defense in depth.  
**Fix:** Reject idempotency keys longer than a reasonable limit (e.g., 256 characters) before hashing.

---

#### L3 — `bcrypt` silently truncates passwords longer than 72 bytes
**File:** `app/auth.py` (line 46); `app/schemas.py` (line 42)  
**Severity:** Low  
**New in Cycle 12**  
**Description:** `bcrypt` has a maximum input length of 72 bytes. Passwords longer than this are silently truncated before hashing. A user who believes they have a 100-character password actually only has a 72-character hash. The `UserRegisterRequest.password` schema has no `max_length` constraint, so this truncation is possible.  
**Fix:** Add `max_length=72` to the `password` field in `UserRegisterRequest`, or document the bcrypt limitation.

---

#### L4 — API key `last_used_at` update runs in an unprotected side session
**File:** `app/dependencies.py` (lines 121–127)  
**Severity:** Low  
**New in Cycle 12**  
**Description:** The `last_used_at` update for API keys is performed in a separate `async with get_sessionmaker()() as session:` block with no `try/except`. If the side session fails (e.g., database deadlock, network timeout), the exception propagates up and aborts the entire request, even though the API key authentication itself succeeded.  
**Fix:** Wrap the side session in a `try/except` block to silently fail the audit update without affecting the main request.

---

#### L5 — Redundant `or 0` fallback on `COUNT(*)` query result
**File:** `app/routers/data.py` (line 131)  
**Severity:** Low  
**New in Cycle 12**  
**Description:** `total = count_result.scalar_one() or 0`. `scalar_one()` on a `COUNT(*)` query always returns a non-negative integer (`0` or greater). It can never be `None`. The `or 0` fallback is unnecessary and slightly misleading.  
**Fix:** Use `total = count_result.scalar_one()`.

---

#### L6 — Cascade soft-delete of readings bypasses ORM `onupdate`, leaving `updated_at` stale
**File:** `app/routers/stations.py` (lines 176–179)  
**Severity:** Low  
**New in Cycle 12**  
**Description:** `delete_station` uses a bulk Core `update(SensorReading).values(deleted_at=now)` to soft-delete readings. Because this is a Core-level operation, SQLAlchemy's ORM `onupdate=func.now()` is not triggered. The `SensorReading.updated_at` column remains unchanged while `deleted_at` is set, leaving an inconsistent audit trail.  
**Fix:** Include `.values(updated_at=now)` in the bulk update, or iterate the readings in ORM and set both fields.

---

*End of report.*
