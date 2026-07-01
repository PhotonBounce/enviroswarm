# ENViroSwarm Backend — QA Cycle 13 Review Report

**Reviewer:** Senior QA Engineer  
**Scope:** `backend/app/` and `backend/tests/`  
**Repo:** `D:/photonbounce/enviroswarm` (branch `main`)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 2 |
| **Medium** | 4 |
| **Low** | 11 |
| **Total** | **17** |

**Fix Verification:** All Critical and High issues from QA Cycles 1–10 are verified fixed. All Cycle 11–12 fixes were verified except **6 lingering issues** that remain open (2 High, 2 Medium, 2 Low). This cycle identifies **9 new issues**.

---

## Fix Verification (Cycles 1–12)

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

### High — All Verified Fixed (10 / 10 from Cycles 1–10; 4 / 6 from Cycle 12)

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
| H1 (C12) | SQLAlchemy `Numeric` columns with `Mapped[float]` but no `asdecimal=False` | `asdecimal=False` added to all three columns (models.py 73, 74, 113). ✅ |
| H2 (C12) | `register` rate-limit key uses raw email before normalization | Normalization moved before rate-limit check (auth.py 60). ✅ |
| H3 (C12) | `login` rate-limit key uses raw email before normalization | Normalization moved before rate-limit check (auth.py 99). ✅ |
| H4 (C12) | `DataQueryResponse.metadata` alias prevents ORM deserialization | Renamed to `reading_metadata` with `serialization_alias="metadata"` (schemas.py 234). ✅ |
| M1 (C12) | `login` timing side-channel leaks whether email is registered | Dummy hash check added when user is `None` (auth.py 117–119). ✅ |
| M2/M8 (C12) | `ingest.py` returns 409 for any `IntegrityError` when idempotency key present | Now specifically checks `exc.orig is not None and "uq_idempotency_user_key" in str(exc.orig)` (ingest.py 155). ✅ |
| M4 (C12) | `SensorReadingPayload.unit` rejects empty string | `min_length=1` removed from `unit` field (schemas.py 182). ✅ |
| M6 (C12) | `create_api_key` treats explicitly-empty `permissions` dict as falsy | Changed to `body.permissions if body.permissions is not None else ...` (apikeys.py 62). ✅ |
| L2 (C12) | `ingest` endpoint no maximum length validation on `X-Idempotency-Key` | `len(idempotency_key) > 256` check added (ingest.py 38). ✅ |
| L3 (C12) | `bcrypt` silently truncates passwords longer than 72 bytes | `max_length=72` added to `UserRegisterRequest.password` (schemas.py 42). ✅ |
| L4 (C12) | API key `last_used_at` update runs in unprotected side session | `try/except` block added around side session (dependencies.py 124–133). ✅ |
| L5 (C12) | Redundant `or 0` fallback on `COUNT(*)` in `data.py` | Removed; now `scalar_one()` without `or 0` (data.py 132). ✅ |
| L6 (C12) | Cascade soft-delete of readings bypasses ORM `onupdate` | `updated_at=now` included in bulk update (stations.py 179). ✅ |

### Lingering Issues from Previous Cycles (NOT Fixed)

| Cycle ID | Issue | Current Status |
|----------|-------|--------------|
| H5 (C12) | Refresh-token revocation list is in-memory only | **STILL OPEN** — `_refresh_token_blacklist` remains a global `set` (auth.py 137). ❌ |
| H6 (C12) | Rate-limiting store is in-memory only | **STILL OPEN** — `_rate_limit_store` remains a global `dict` (dependencies.py 28). ❌ |
| M5 (C12) | `query_data` aggregation uses PostgreSQL-specific `func.date_trunc` | **STILL OPEN** — No SQLite fallback added (data.py 64). ❌ |
| M7 (C12) | `billing.py` subscription duration uses fixed 30-day months | **STILL OPEN** — Still `timedelta(days=30 * body.duration_months)` (billing.py 92). ❌ |
| M3 (C12) | `subscribe` endpoint missing DB unique constraint on active subscriptions | **PARTIALLY FIXED** — `with_for_update()` on user row prevents race condition, but DB-level unique partial index still missing (billing.py 70–71). ⚠️ |
| L1 (C11) | Unused `OAuth2PasswordBearer` import in `dependencies.py` | **STILL OPEN** — Import at line 11 remains unused. ❌ |

---

## Issues Found

### High

#### H1 — Refresh-token revocation list is in-memory only; lost on restart or across workers (Lingering from Cycle 12)
**File:** `app/auth.py` (lines 129–145)  
**Severity:** High  
**Status:** Lingering from Cycle 12 — NOT FIXED  
**Description:** `_refresh_token_blacklist` is a global Python `set`. When the process restarts (deployment, crash, or scale-up), the set is empty. Any refresh token that was revoked before the restart becomes valid again. In a multi-worker deployment, a revocation in one worker is invisible to others. This breaks the security guarantee of token rotation. The code comment acknowledges this ("replace with Redis in production"), but the vulnerability is present in the current codebase.  
**Fix:** Replace the in-memory set with a Redis-backed store or a persistent database table keyed by `jti` with a TTL.

---

#### H2 — Rate-limiting store is in-memory only; not shared across workers or restarts (Lingering from Cycle 12)
**File:** `app/dependencies.py` (lines 21–28)  
**Severity:** High  
**Status:** Lingering from Cycle 12 — NOT FIXED  
**Description:** `_rate_limit_store` is a global `dict` with no persistence. Rate-limit counters are lost on every process restart and are not synchronized across workers. In a production deployment with multiple workers, a client could send `worker_count × limit` requests per minute without being throttled. Eviction logic exists, but the fundamental multi-process limitation remains.  
**Fix:** Replace with Redis `INCR`/`EXPIRE` or a shared cache backend.

---

### Medium

#### M1 — `query_data` aggregation uses PostgreSQL-specific `func.date_trunc`, incompatible with SQLite (Lingering from Cycle 12)
**File:** `app/routers/data.py` (line 64)  
**Severity:** Medium  
**Status:** Lingering from Cycle 12 — NOT FIXED  
**Description:** The aggregation branch uses `func.date_trunc(trunc_unit, SensorReading.timestamp)`. `date_trunc` is a PostgreSQL-specific function. `database.py` explicitly handles SQLite by omitting `pool_size` and `max_overflow` when `database_url.startswith("sqlite")`, implying SQLite is a supported backend. Calling `query_data?aggregate=hour` against a SQLite database will raise a database error.  
**Fix:** Use a database-portable expression (e.g., `func.strftime` for SQLite with a dialect fallback) or document that aggregation requires PostgreSQL.

---

#### M2 — `billing.py` subscription duration uses fixed 30-day months, causing inaccurate billing periods (Lingering from Cycle 12)
**File:** `app/routers/billing.py` (line 92)  
**Severity:** Medium  
**Status:** Lingering from Cycle 12 — NOT FIXED  
**Description:** `end_date = start_date + timedelta(days=30 * body.duration_months)`. A 12-month subscription ends after 360 days instead of 365 or 366. This under-delivers the service period by 5–6 days for annual subscriptions and creates customer-facing billing discrepancies.  
**Fix:** Use `relativedelta(months=body.duration_months)` from `dateutil`, or compute `end_date` by adding months to the calendar.

---

#### M3 — `register` endpoint allows soft-deleted users to attempt re-registration, causing unhandled IntegrityError (500)
**File:** `app/models.py` (line 31); `app/routers/auth.py` (lines 70–84)  
**Severity:** Medium  
**New in Cycle 13**  
**Description:** The `User` model has a hard DB-level unique constraint on `email` (`unique=True`) that does **not** consider `deleted_at`. The `register` endpoint’s application-level duplicate check filters out soft-deleted users (`User.deleted_at.is_(None)`), so a deleted user appears to be available for re-registration. However, the INSERT will violate the DB unique constraint and raise an unhandled `IntegrityError`, which propagates to the global exception handler and returns HTTP 500. The application code implies deleted users should be able to re-register, but the schema prevents it.  
**Fix:** Remove the blanket `unique=True` on `email` and add a partial unique index `CREATE UNIQUE INDEX uq_user_email ON users(email) WHERE deleted_at IS NULL`, or catch the `IntegrityError` in the register endpoint and return 409.

---

#### M4 — `update_station` endpoint cannot clear `latitude`/`longitude` once set
**File:** `app/routers/stations.py` (lines 137–142)  
**Severity:** Medium  
**New in Cycle 13**  
**Description:** `StationUpdateRequest` schema allows both `latitude` and `longitude` to be explicitly set to `null` (the validator `validate_latitude_longitude` passes when both are `None`). However, the endpoint uses `if body.latitude is not None:` and `if body.longitude is not None:` guards, which silently skip the update when `None` is passed. Once a station has coordinates, they can never be cleared via the API.  
**Fix:** Use sentinel values (e.g., `UNSET` singleton) to distinguish between "field not provided" and "field explicitly set to `null`", or remove the `is not None` guards and handle the pair validation in the endpoint logic.

---

### Low

#### L1 — Unused `OAuth2PasswordBearer` import remains in `dependencies.py` (Lingering from Cycle 11)
**File:** `app/dependencies.py` (line 10)  
**Severity:** Low  
**Status:** Lingering from Cycle 11 — NOT FIXED  
**Description:** The `OAuth2PasswordBearer` class is imported but never referenced in the module. The instantiation was removed in a prior cycle, but the import statement itself was left behind, creating dead code.  
**Fix:** Remove the unused import.

---

#### L2 — Missing DB unique constraint on active subscriptions (Lingering from Cycle 12, downgraded)
**File:** `app/routers/billing.py` (line 70)  
**Severity:** Low  
**Status:** Lingering from Cycle 12 — PARTIALLY FIXED  
**Description:** The `subscribe` endpoint uses `SELECT ... FOR UPDATE` on the user row to prevent application-level race conditions, which is effective. However, the TODO comment still acknowledges the missing DB-level unique partial index on `(user_id, deleted_at)` where `deleted_at IS NULL` and `end_date >= now()`. A database constraint is the final defense-in-depth against duplicate active subscriptions.  
**Fix:** Add a unique partial index or constraint at the migration level.

---

#### L3 — Redundant `or 0` fallback on `COUNT(*)` query result in `list_stations`
**File:** `app/routers/stations.py` (line 81)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** `total = count_result.scalar_one() or 0`. `scalar_one()` on a `COUNT(*)` query always returns a non-negative integer (`0` or greater). It can never be `None`. The `or 0` fallback is unnecessary and misleading.  
**Fix:** Use `total = count_result.scalar_one()`.

---

#### L4 — `query_data` uses raw `status_code=400` instead of `status.HTTP_400_BAD_REQUEST`
**File:** `app/routers/data.py` (line 54)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** `raise HTTPException(status_code=400, detail="start cannot be after end")` uses a raw integer. All other endpoints in the codebase consistently use `status.HTTP_...` constants (e.g., `status.HTTP_401_UNAUTHORIZED`). This inconsistency reduces readability and makes the code harder to audit.  
**Fix:** Use `status_code=status.HTTP_400_BAD_REQUEST`.

---

#### L5 — Redundant `or 0` fallback on `COUNT(*)` query result in `ingest`
**File:** `app/routers/ingest.py` (line 114)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** `today_count = count_result.scalar_one() or 0`. `scalar_one()` on a `COUNT(*)` query always returns a non-negative integer. It can never be `None`. The `or 0` fallback is unnecessary.  
**Fix:** Use `today_count = count_result.scalar_one()`.

---

#### L6 — Redundant `if not user_id:` check after `decode_access_token` in `get_current_user_or_api_key`
**File:** `app/dependencies.py` (lines 161–165)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** `decode_access_token` already validates that `payload.get("sub")` is truthy and raises `HTTPException(401, "Token missing sub claim")` if it is not. The subsequent `if not user_id:` check in `get_current_user_or_api_key` is unreachable dead code.  
**Fix:** Remove the redundant check.

---

#### L7 — `list_api_keys` endpoint has no `order_by`, causing non-deterministic ordering
**File:** `app/routers/apikeys.py` (line 89)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** `select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.deleted_at.is_(None))` does not specify an `order_by` clause. Without a deterministic sort order, paginated results can appear in different orders across requests, causing a poor user experience and flaky tests.  
**Fix:** Add `.order_by(ApiKey.created_at.desc())` or `.order_by(ApiKey.name)`.

---

#### L8 — `subscribe` endpoint `except Exception:` loses original exception chain
**File:** `app/routers/billing.py` (lines 108–113)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** The `except Exception:` block catches the original exception and raises a new `HTTPException` without `from exc`, severing the traceback chain. This makes production debugging significantly harder because the root cause of the database failure is hidden.  
**Fix:** Use `raise HTTPException(...) from exc` to preserve the exception chain.

---

#### L9 — `test_ingest.py` has insufficient test coverage
**File:** `backend/tests/test_ingest.py`  
**Severity:** Low  
**New in Cycle 13**  
**Description:** The file contains only one test (`test_ingest_data`) covering the basic happy path. The `ingest` endpoint contains complex business logic including: daily reading tier limits, sensor type validation against station configuration, timestamp bounds enforcement, idempotency key handling, API key write permission checks, and `IntegrityError` recovery. None of these paths are tested.  
**Fix:** Add tests for: daily limit exceeded, invalid sensor type, out-of-bounds timestamp, idempotency key replay, idempotency key too long, unauthorized access, and API key without write permission.

---

#### L10 — Redundant `str()` calls in `create_access_token` and `create_refresh_token`
**File:** `app/auth.py` (lines 66, 79); `app/routers/auth.py` (lines 128, 182)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** `create_access_token` and `create_refresh_token` both accept `user_id: str` and then call `str(user_id)` inside the function. The callers in `auth.py` also call `str(user.id)` before passing the argument. This double-`str()` wrapping is redundant and slightly confusing.  
**Fix:** Remove the inner `str()` calls in `create_access_token` and `create_refresh_token`, or remove the outer `str()` calls at the call sites.

---

#### L11 — `models.py` relationship declarations redundantly specify `lazy="select"`
**File:** `app/models.py` (lines 48, 51, 54, 88)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** `lazy="select"` is the default loading strategy for SQLAlchemy `relationship()` in modern versions. Explicitly specifying it on four relationships adds visual noise without changing behavior.  
**Fix:** Remove the redundant `lazy="select"` arguments.

---

#### L12 — `ingest` endpoint inconsistently performs API key permission check inline instead of using `require_permission` dependency
**File:** `app/routers/ingest.py` (lines 28–34)  
**Severity:** Low  
**New in Cycle 13**  
**Description:** All other write endpoints (`stations`, `apikeys`, `billing`) use the `require_permission("write")` dependency to enforce API key write permissions. The `ingest` endpoint performs the same check manually inside the handler body. This inconsistency makes the code harder to maintain and audit.  
**Fix:** Add `_authorized: User = Depends(require_permission("write"))` to the endpoint signature and remove the manual check, or extract the manual check into a reusable dependency for consistency.

---

*End of report.*
