# ENViroSwarm Backend — QA Cycle 14 Review Report

**Reviewer:** Senior QA Engineer  
**Scope:** `backend/app/` and `backend/tests/`  
**Repo:** `D:/photonbounce/enviroswarm` (branch `main`)  
**Date:** 2026-07-01  

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 1 |
| **Medium** | 3 |
| **Low** | 7 |
| **Total** | **11** |

**Fix Verification:** All Critical and High issues from QA Cycles 1–12 are verified fixed. The DB-backed infrastructure fixes from Cycle 13 (`RevokedToken` and `RateLimitEntry` models) are present and correct. However, this cycle identifies **1 new High-severity regression** introduced by a prior fix, **3 new Medium issues**, and **7 Low issues** (including 2 lingering from Cycle 13 and 5 new).

---

## Fix Verification (Cycles 1–13)

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
| H6 (C13) | Rate-limiting store is in-memory only | **FIXED** — `RateLimitEntry` DB model used; in-memory dict removed from production path. ✅ |
| M1 (C13) | `query_data` aggregation uses PostgreSQL-specific `func.date_trunc` | **FIXED** — `_date_trunc` helper with SQLite `func.strftime` fallback added. ✅ |
| M2 (C13) | `billing.py` subscription duration uses fixed 30-day months | **FIXED** — Uses `relativedelta(months=body.duration_months)`. ✅ |
| M4 (C13) | `update_station` endpoint cannot clear `latitude`/`longitude` once set | **FIXED** — Guards removed; coordinates can now be cleared. ⚠️ *(Regression identified — see H1 below)* |
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

### Lingering Issues from Previous Cycles (NOT Fully Fixed)

| Cycle ID | Issue | Current Status |
|----------|-------|--------------|
| M3 (C13) | `register` allows soft-deleted users to re-register; schema `unique=True` conflicts with app-level `deleted_at.is_(None)` filter | **PARTIALLY FIXED** — `except IntegrityError` prevents 500 crash, but catches ALL integrity errors and returns 409. The underlying business logic inconsistency remains. See M1 below. |
| L1 (C11) | Unused `OAuth2PasswordBearer` import in `dependencies.py` | **STILL OPEN** — Import at line 12 remains unused. See L1 below. |
| L2 (C12) | Missing DB unique constraint on active subscriptions | **STILL OPEN** — TODO comment at `billing.py:70` remains. See L2 below. |

---

## Issues Found

### High

#### H1 — `update_station` PATCH endpoint unconditionally overwrites `latitude`/`longitude`, causing unintended coordinate clearing on partial updates *(Regression)*
**File:** `app/routers/stations.py` (lines 137–140)  
**Severity:** High  
**New in Cycle 14**  
**Description:** The Cycle 13 fix for M4 removed the `if body.latitude is not None:` and `if body.longitude is not None:` guards to allow explicit coordinate clearing. However, because `StationUpdateRequest` uses `Optional[float] = Field(None, ...)` for both fields, a client sending a partial PATCH such as `{"name": "Updated Name"}` results in `body.latitude = None` and `body.longitude = None`. The endpoint unconditionally assigns these values, silently clearing the station's coordinates. This violates REST PATCH semantics (omitted fields should not be modified) and causes unintended data loss. The test `test_update_station` only asserts the name change and does not verify that coordinates are preserved.
**Fix:** Use a sentinel value (e.g., `UNSET`) to distinguish between "field not provided" and "field explicitly set to null", or inspect `body.model_fields_set` to only update fields that were present in the request payload.

---

### Medium

#### M1 — `register` endpoint `except IntegrityError` is overly broad, masking all DB constraint failures as "Email already registered"
**File:** `app/routers/auth.py` (lines 85–92)  
**Severity:** Medium  
**Status:** Lingering from Cycle 13 (M3) — Partially fixed, but underlying pattern remains  
**Description:** The `try/except IntegrityError` block added to prevent the 500 crash catches **any** `IntegrityError` — not just the unique constraint violation on `email`. If a `CheckConstraint`, `NOT NULL`, or future constraint fails, the client receives a misleading `409 "Email already registered"` instead of the actual error. The `ingest.py` endpoint correctly narrows its `IntegrityError` handling by inspecting `exc.orig` for the specific constraint name.
**Fix:** Narrow the `except` block to check `exc.orig` for the specific unique constraint name (e.g., `"uq_users_email"`), and return `500` for all other integrity errors.

#### M2 — Aggregation query bucket formatting crashes on SQLite backend
**File:** `app/routers/data.py` (line 105)  
**Severity:** Medium  
**New in Cycle 14**  
**Description:** The `_date_trunc` helper correctly falls back to `func.strftime(...)` for SQLite, but `func.strftime` returns a **string** (not a `datetime` object). The response formatting code then calls `r.bucket.isoformat()`, which raises `AttributeError: 'str' object has no attribute 'isoformat'`. No test coverage exists for the aggregation path (`?aggregate=hour|day|month`), so this bug is not caught by the test suite.
**Fix:** In the response builder, check `isinstance(r.bucket, datetime)` before calling `.isoformat()`. If it is a string, pass it through directly.

#### M3 — `check_rate_limit` has race conditions on initial insertion and increment due to lack of row locking
**File:** `app/dependencies.py` (lines 34–69)  
**Severity:** Medium  
**New in Cycle 14**  
**Description:** The `check_rate_limit` function performs a read-modify-write on `RateLimitEntry` without `SELECT ... FOR UPDATE` or an atomic `UPDATE`. Two distinct race conditions exist:
1. **Initial insertion:** Two concurrent requests both see `entry is None`, both attempt `session.add(RateLimitEntry(...))`. The second `commit()` raises an unhandled `IntegrityError` (primary key violation), causing HTTP 500.
2. **Increment:** Two concurrent requests both read `entry.count = 9` with `limit = 10`. Both increment to 10 and commit. The final count is 10, but 11 requests were actually allowed in the window.
**Fix:** Use `SELECT ... FOR UPDATE` when reading the existing entry, or use an atomic `UPDATE RateLimitEntry SET count = count + 1 WHERE key = :key` for increments.

---

### Low

#### L1 — Unused `OAuth2PasswordBearer` import remains in `dependencies.py` *(Lingering from Cycle 11)*
**File:** `app/dependencies.py` (line 12)  
**Severity:** Low  
**Status:** Lingering from Cycle 11 — NOT FIXED  
**Description:** The `OAuth2PasswordBearer` class is imported but never referenced in the module. The instantiation was removed in a prior cycle, but the import statement itself was left behind, creating dead code.
**Fix:** Remove the unused import.

#### L2 — Missing DB-level unique partial index on active subscriptions *(Lingering from Cycle 12, downgraded)*
**File:** `app/routers/billing.py` (line 70)  
**Severity:** Low  
**Status:** Lingering from Cycle 12 — PARTIALLY FIXED  
**Description:** The `subscribe` endpoint uses `SELECT ... FOR UPDATE` on the user row to prevent application-level race conditions, which is effective. However, the TODO comment still acknowledges the missing DB-level unique partial index on `(user_id)` where `deleted_at IS NULL` and `end_date >= now()`. A database constraint is the final defense-in-depth against duplicate active subscriptions.
**Fix:** Add a unique partial index or constraint at the migration level.

#### L3 — Dead code from old in-memory rate limiter remains in `dependencies.py`
**File:** `app/dependencies.py` (lines 24–28)  
**Severity:** Low  
**New in Cycle 14**  
**Description:** `_rate_limit_store: dict = {}`, `_rate_limit_lock = asyncio.Lock()`, and `_MAX_RATE_LIMIT_ENTRIES = 100_000` are never referenced by the production code. The `check_rate_limit` function now uses the DB-backed `RateLimitEntry` model. These globals are only referenced by test fixtures (`reset_db`) which call `_rate_limit_store.clear()` — a no-op since the production path no longer uses the dict.
**Fix:** Remove the dead globals and update the test fixtures to rely solely on `Base.metadata.drop_all` / `create_all`.

#### L4 — Health check endpoint return type annotation mismatch
**File:** `app/main.py` (lines 96–109)  
**Severity:** Low  
**New in Cycle 14**  
**Description:** The function is annotated `async def health() -> dict:`, but the `except` branch returns a `JSONResponse` object. FastAPI accepts this at runtime, but it violates the type contract and will cause type-checker warnings.
**Fix:** Change the return type annotation to `Union[dict, JSONResponse]` or use `raise HTTPException(503, ...)` and let the global exception handler format the response.

#### L5 — Missing DB indexes on cleanup-critical columns
**File:** `app/models.py` (lines 209–228)  
**Severity:** Low  
**New in Cycle 14**  
**Description:** `RevokedToken.expires_at` and `RateLimitEntry.window_start` are used in `DELETE` cleanup queries (`cleanup_revoked_tokens` and `cleanup_rate_limit_entries`) but have no indexes. As these tables grow, the cleanup queries will perform full table scans, causing unnecessary load.
**Fix:** Add `Index("ix_revoked_tokens_expires_at", "expires_at")` and `Index("ix_rate_limit_entries_window_start", "window_start")` to the respective models.

#### L6 — No test coverage for `query_data` aggregation path
**File:** `backend/tests/test_data.py`  
**Severity:** Low  
**New in Cycle 14**  
**Description:** The test suite does not exercise `GET /api/v1/data?aggregate=hour`, `day`, or `month`. As a result, the SQLite aggregation bug (M2) is not caught by CI.
**Fix:** Add tests for aggregation with each supported unit, asserting the shape of the bucket response.

#### L7 — Redundant `or 0` fallback on `COUNT(*)` in `create_station` endpoint
**File:** `app/routers/stations.py` (line 40)  
**Severity:** Low  
**New in Cycle 14**  
**Description:** `existing_count = result.scalar_one() or 0`. `scalar_one()` on a `COUNT(*)` query always returns a non-negative integer (`0` or greater). It can never be `None`. The `or 0` fallback is unnecessary and misleading.
**Fix:** Use `existing_count = result.scalar_one()`.

---

*End of report.*
