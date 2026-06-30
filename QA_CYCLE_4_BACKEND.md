# ENViroSwarm Backend — QA Cycle 4 Re-Review Report

**Reviewer:** Senior QA Engineer (Sub-agent)  
**Scope:** `backend/app/` and `backend/tests/`  
**Date:** 2026-06-30  
**Repo:** `D:/photonbounce/enviroswarm`  
**Focus:** Re-review after Cycle 1 and Cycle 3 fixes. Verify each Cycle 2 issue. Report new issues introduced by fixes.

---

## Executive Summary

| Category | Count |
|----------|-------|
| **Issues RESOLVED** | 39 |
| **Issues STILL OPEN** | 15 |
| **NEW issues introduced by fixes** | 10 |
| **Total remaining issues** | **25** |

**Cycle 3 delivered significant fixes.** The most critical systemic issues—soft-delete bypasses, auth bypasses for deleted users, cross-tenant data leaks, and broken test passwords—are all resolved. However, **API key permissions are only half-implemented** (write checked in ingest, read never checked anywhere), and **several new issues were introduced by the fixes themselves** (non-transactional idempotency, unbounded memory store, daily limit counting deleted-station readings, and a pole-edge-case in the geo bounding box).

---

## Issues RESOLVED (39)

### Critical (9 of 10)

| ID | Issue | File | Verification |
|----|-------|------|------------|
| C1 | Deleted users can authenticate via `get_current_user` | `app/auth.py:134` | `User.deleted_at.is_(None)` added |
| C2 | Login endpoint doesn't check `is_active`/`deleted_at` | `app/routers/auth.py:75-80` | Both filters present in login query |
| C3 | Refresh token endpoint doesn't check `deleted_at` | `app/routers/auth.py:108-113` | Both filters present in refresh query |
| C4 | Ingest endpoint accepts data for soft-deleted stations | `app/routers/ingest.py:83` | `SensorStation.deleted_at.is_(None)` added |
| C5 | Data query endpoints return deleted stations/readings | `app/routers/data.py:65-67,109-111` | Both filters added to aggregate and raw paths |
| C7 | API key revocation performs hard-delete | `app/routers/apikeys.py:117` | Now sets `deleted_at = datetime.now(timezone.utc)` |
| C8 | `nearby` returns all stations to all users | `app/routers/data.py:152-154` | Filters by `user_id == user.id` and `deleted_at.is_(None)` |
| C9 | Default `SECRET_KEY` is a known weak string | `app/config.py:22` | Changed to `Field(..., min_length=32)` with no default; raises if missing |
| C10 | All test passwords fail `validate_password` | `tests/test_*.py` | All passwords changed to `"Password123"` (passes uppercase rule) |

### High (16 of 18)

| ID | Issue | File | Verification |
|----|-------|------|------------|
| H1 | Race condition on station creation tier limit | `app/routers/stations.py:24-25` | `with_for_update()` added on user row (serializes concurrent creates) |
| H2 | Race condition on API key creation tier limit | `app/routers/apikeys.py:41-42` | `with_for_update()` added on user row |
| H3 | Race condition on daily reading ingest limit | `app/routers/ingest.py:117-118` | `with_for_update()` added on user row |
| H4 | `nearby` loads all stations into Python memory | `app/routers/data.py:152-166` | SQL bounding box filter applied before haversine |
| H5 | Refresh token accepted as query parameter | `app/routers/auth.py:99` | Now uses `body: RefreshTokenRequest` (POST body) |
| H6 | `update_station` uses `StationCreateRequest` for PATCH | `app/routers/stations.py:115` | Now uses `StationUpdateRequest` with all optional fields |
| H7 | `query_data` aggregate query ignores `offset` | `app/routers/data.py:76` | `.offset(offset)` added to aggregation statement |
| H8 | Ingest endpoint has no idempotency support | `app/routers/ingest.py:69-74,158-159` | `X-Idempotency-Key` read, checked, and stored |
| H9 | `rate_limit_dependency` commits inside auth dependency | `app/dependencies.py:121-127` | `last_used_at` update moved to separate `AsyncSessionLocal()` session |
| H10 | `require_tier` only supports JWT | `app/dependencies.py:203-211` | Now depends on `get_current_user_or_api_key` |
| H11 | `query_data` aggregate returns wrong `meta.total` | `app/routers/data.py:102` | Returns `total: None` instead of misleading `len(data)` |
| H12 | `query_data` raw query doesn't filter `deleted_at` | `app/routers/data.py:109-111` | Both `SensorStation` and `SensorReading` `deleted_at` filters added |
| H13 | `subscribe` creates unlimited duplicate subscriptions | `app/routers/billing.py:68-80` | Active subscription check added before creation |
| H14 | `subscribe` has no transaction rollback | `app/routers/billing.py:96-104` | Wrapped in `try/except` with `await db.rollback()` |
| H15 | Ingest doesn't validate sensor_type against station config | `app/routers/ingest.py:103-108` | Validates `r.sensor_type in station_sensor_types` |
| H16 | Model `id` fields typed as `str` with `UUID(as_uuid=True)` | `app/models.py` | All `id` columns changed to `Mapped[uuid.UUID]` |
| H18 | `SensorReading` default timestamp uses client time | `app/models.py:111` | Changed to `server_default=func.now()` |

### Medium (9 of 14)

| ID | Issue | File | Verification |
|----|-------|------|------------|
| M1 | `effective_start` timezone comparison TypeError | `app/routers/data.py:43-45` | Naive datetimes normalized to UTC before `max()` |
| M2 | `list_api_keys` returns deleted/revoked keys | `app/routers/apikeys.py:91` | `ApiKey.deleted_at.is_(None)` filter added |
| M3 | `station_id` typed as `str` instead of `UUID` | `app/routers/stations.py`, `app/routers/data.py` | All route signatures changed to `UUID` |
| M4 | `StationCreateRequest` doesn't validate `status` | `app/schemas.py:121-126` | `validate_status` field validator added |
| M5 | `IngestRequest` allows unbounded batch size | `app/schemas.py:161` | `max_length=1000` added to `readings` field |
| M7 | Ingest allows backdated/future-dated readings | `app/routers/ingest.py:99-114` | Timestamp bounds enforced against retention + 5-min future limit |
| M8 | `nearby` doesn't validate `sensor_type` | `app/routers/data.py:141` | Regex pattern `^(air_quality|...|voc)$` added to Query param |
| M9 | `SensorReading` eagerly loads with `selectin` | `app/models.py:88` | Changed to `lazy="select"` |
| M10 | `User` relationships eagerly load with `selectin` | `app/models.py:48,51,54` | All changed to `lazy="select"` |

### Low (5 of 12)

| ID | Issue | File | Verification |
|----|-------|------|------------|
| L1 | Redundant `authorization` parameter | `app/dependencies.py:94` | Removed; only `request.headers` used now |
| L2 | `decode_token` doesn't verify `sub` claim | `app/auth.py:104-108` | Added `if not payload.get("sub")` raise |
| L6 | `check_rate_limit` window reset race condition | `app/dependencies.py:47-58` | `asyncio.Lock` added around store mutations |
| L8 | `delete_station` imports `datetime` locally | `app/routers/stations.py:2` | Moved to top of file |
| L12 | Tests use deprecated `AsyncClient(app=app)` | `tests/test_*.py` | All updated to `ASGITransport` |

---

## Issues STILL OPEN (15)

### Critical (1)

#### C6 — API key permissions are only half-implemented
**File:** `app/routers/ingest.py:62-67`, `app/routers/data.py`, `app/routers/stations.py`, `app/routers/apikeys.py`, `app/routers/billing.py`  
**Severity:** Critical  
**Status:** Partially fixed  
**Description:** The fix in Cycle 3 added write-permission checking to `ingest.py` (`api_key.permissions.get("write", False)`), but **read permission is never enforced**. A read-only API key can still call `GET /api/v1/data`, `GET /api/v1/data/nearby`, `GET /api/v1/stations`, etc. Conversely, a write-only API key can call all read endpoints. Every router that uses `rate_limit_dependency` or `get_current_user_or_api_key` must inspect `request.state.api_key.permissions` and raise 403 for disallowed operations.  
**Remaining fix:** Add read-permission checks to `data.py`, `stations.py`, `apikeys.py`, and `billing.py` endpoints; or add a centralized `require_permission` dependency.

### High (1)

#### H17 — In-memory rate-limit store has no eviction (partial fix)
**File:** `app/dependencies.py:27,47-58`  
**Severity:** High  
**Status:** Async-safe fixed; eviction & multi-process remain  
**Description:** Cycle 3 added `asyncio.Lock` (`_rate_limit_lock`), fixing the single-process async race condition. However, `_rate_limit_store` is still a global `dict` with **no TTL eviction**. It grows unbounded for every unique `(identifier, route)` pair ever seen. In a multi-process deployment, rate limits are still per-process and useless.  
**Remaining fix:** Replace with Redis + atomic `INCR`/`EXPIRE`, or add a periodic eviction task.

### Medium (5)

#### M6 — `get_current_user_optional` bypasses FastAPI dependency injection
**File:** `app/auth.py:143-150`  
**Severity:** Medium  
**Description:** Still calls `get_current_user(token, db)` directly with positional args. If `get_current_user` signature changes, this breaks.  
**Fix:** Refactor to a shared `_get_current_user(token: str, db: AsyncSession)` private function.

#### M11 — `SensorTypeValidator` class is dead code
**File:** `app/schemas.py:36-42`  
**Severity:** Medium  
**Description:** Still defined but never inherited. Every schema duplicates the sensor-type validation inline.  
**Fix:** Delete the class or refactor `SensorReadingPayload` and `StationCreateRequest` to inherit from it.

#### M12 — Duplicate `_hash_key` and `_extract_prefix` functions
**File:** `app/routers/apikeys.py:26-27`, `app/dependencies.py:81-87`  
**Severity:** Medium  
**Description:** Same hashing logic copied in two places. Divergence risk.  
**Fix:** Move shared helpers to `app/utils/crypto.py`.

#### M13 — `delete_station` soft-deletes but does not cascade to readings
**File:** `app/routers/stations.py:167`  
**Severity:** Medium  
**Description:** The endpoint sets `station.deleted_at` but does not touch the station's readings. While `data.py` now filters by `SensorStation.deleted_at`, the reading rows themselves remain with `deleted_at = None`. Any future query (admin reports, raw SQL, analytics) that queries `SensorReading` without joining `SensorStation` will see orphaned data.  
**Fix:** Cascade-soft-delete readings in the endpoint, or add a DB trigger.

#### M14 — `app/main.py` lifespan uses `create_all` instead of Alembic migrations
**File:** `app/main.py:26-27`  
**Severity:** Medium  
**Description:** Still calls `Base.metadata.create_all` on startup. Dangerous in production; does not handle schema migrations, renames, or data migrations.  
**Fix:** Run `alembic upgrade head` in the Docker entrypoint and remove `create_all` from lifespan.

### Low (8)

#### L3 — Alembic `env.py` imports unused models
**File:** `backend/alembic/env.py:10`  
**Severity:** Low  
**Description:** `from app.models import User, SensorStation, ...` is still present. Only `Base` is needed because `Base.metadata` already includes all registered models.  
**Fix:** Remove unused imports.

#### L4 — `global_exception_handler` doesn't log request path or ID
**File:** `app/main.py:71-72`  
**Severity:** Low  
**Description:** Still only logs `f"Unhandled exception: {exc}"`. No request path, method, or correlation ID.  
**Fix:** Include `request.url.path`, `request.method`, and a generated request ID in the log entry.

#### L7 — `ApiKey` `key_prefix` column length mismatch
**File:** `app/models.py:136`, `app/dependencies.py:87`  
**Severity:** Low  
**Description:** `_extract_prefix` returns 8 chars, but the column is `String(16)`. Still inconsistent.  
**Fix:** Align column length to 8 or document why 16 is reserved.

#### L9 — `refresh_token` endpoint does not revoke old refresh token
**File:** `app/routers/auth.py:98-128`  
**Severity:** Low  
**Description:** New refresh token is issued, but old one is not blacklisted. A stolen refresh token can be used until it expires.  
**Fix:** Maintain a token blacklist (Redis or DB table) keyed by `jti`.

#### L10 — `config.py` `.env` path is relative to CWD
**File:** `app/config.py:45`  
**Severity:** Low  
**Description:** `env_file = ".env"` is still relative to the working directory.  
**Fix:** Use `Path(__file__).resolve().parent.parent / ".env"`.

#### L11 — `database.py` engine created at module import time
**File:** `app/database.py:12-20`  
**Severity:** Low  
**Description:** `engine = create_async_engine(...)` still runs at import. Hard to override in tests.  
**Fix:** Use a factory function or `lru_cache`.

#### L5 — `PRICING_TIERS` is still a list (minor, lookup is now O(1))
**File:** `app/routers/billing.py:18-46`  
**Severity:** Low  
**Description:** The data structure is still a list, but the lookup was changed to a set (`{t.name for t in PRICING_TIERS}`), so the O(n) lookup concern is addressed. Kept here for completeness but effectively resolved. **Marked as resolved in the count above.**

---

## NEW Issues Introduced by Fixes (10)

### Critical (1)

#### N1 — API key read permissions never enforced on data/station endpoints
**File:** `app/routers/data.py`, `app/routers/stations.py`, `app/routers/apikeys.py`, `app/routers/billing.py`  
**Severity:** Critical  
**Introduced by:** Partial fix for C6  
**Description:** The fix added `if api_key and not api_key.permissions.get("write", False)` to `ingest.py`, creating an **inconsistent security boundary**. A write-only API key can now call `GET /api/v1/data` (read) without restriction, while a read-only API key is blocked from `POST /api/v1/ingest` (write). This inconsistency is worse than the previous uniform permissiveness because it gives a false sense of security. Every endpoint that uses `rate_limit_dependency` (which attaches `request.state.api_key`) must also check `request.state.api_key.permissions.get("read", False)` for GET operations.

### High (4)

#### N2 — Ingest daily limit counts readings from soft-deleted stations
**File:** `app/routers/ingest.py:123-131`  
**Severity:** High  
**Introduced by:** Fix for H3 (daily limit race condition)  
**Description:** The `today_count` query added to enforce the daily limit filters `SensorReading.deleted_at.is_(None)` but **does not filter `SensorStation.deleted_at.is_(None)`**. If a user deletes a station that had many readings today, those readings still count toward the daily limit. A malicious user could create a station, flood it with readings, delete it, and permanently consume their daily quota.  
**Fix:** Add `SensorStation.deleted_at.is_(None)` to the `today_count` join query.

#### N3 — Idempotency store is not transactional with the database
**File:** `app/routers/ingest.py:154-159`  
**Severity:** High  
**Introduced by:** Fix for H8 (idempotency)  
**Description:** The idempotency key is stored **after** `await db.commit()`. If the server crashes between `db.commit()` and `_store_idempotency`, the client receives no response and will retry. The retry will not find the idempotency key, so it will re-insert the same readings, creating duplicates. Conversely, if `_store_idempotency` is checked before the transaction but the transaction later fails, the cached result is stored even though the data was never committed.  
**Fix:** Make idempotency part of the same transaction (e.g., store idempotency keys in a DB table with the same `async` session) or use a two-phase pattern.

#### N4 — Idempotency store has unbounded memory growth
**File:** `app/routers/ingest.py:23,33-44,47-52`  
**Severity:** High  
**Introduced by:** Fix for H8 (idempotency)  
**Description:** `_idempotency_store` is a global `dict` with a 5-minute TTL. The eviction sweep only runs inside `_check_idempotency`, which is only called when a request supplies an `X-Idempotency-Key`. Under high-throughput ingest (e.g., 1M readings/day), the store accumulates entries faster than they expire. There is no maximum size, no periodic cleanup task, and no memory pressure handling. This is a **memory leak** that will eventually OOM the process.  
**Fix:** Use Redis with TTL, or add a periodic background cleanup task and a max-size LRU fallback.

#### N5 — `nearby` bounding box `lon_margin` approaches infinity at the poles
**File:** `app/routers/data.py:150,160-163`  
**Severity:** High  
**Introduced by:** Fix for H4 (SQL bounding box)  
**Description:** The bounding box formula `lon_margin = radius_km / (111.32 * math.cos(math.radians(lat)))` divides by `cos(lat)`. As `lat` approaches ±90°, `cos(lat)` approaches 0, making `lon_margin` approach infinity. The SQL query then becomes `longitude BETWEEN -inf AND +inf`, effectively scanning all of the user's stations without the intended performance benefit. At `lat = 90` exactly, `cos(90°)` is `~6.1e-17`, so `lon_margin` is astronomically large.  
**Fix:** Cap `lon_margin` to a reasonable maximum (e.g., 180°) or use a PostGIS `ST_DWithin` query.

### Medium (4)

#### N6 — `health` endpoint doesn't verify database connectivity
**File:** `app/main.py:64-66`  
**Severity:** Medium  
**Description:** Always returns `{"status": "ok"}` without attempting a DB ping. In a production deployment with a failed DB connection, the load balancer will keep routing traffic to a broken instance.  
**Fix:** Execute a lightweight `SELECT 1` via the engine inside the handler and return 503 on failure.

#### N7 — `auth.py` uses expensive `bcrypt.gensalt` for JWT `jti` generation
**File:** `app/auth.py:68,81`  
**Severity:** Medium  
**Description:** `create_access_token` and `create_refresh_token` use `bcrypt.gensalt(rounds=5)` to generate a unique token ID (`jti`). bcrypt is computationally expensive by design. At high throughput (many logins/refreshes), this unnecessarily burns CPU. `secrets.token_urlsafe(16)` or `uuid.uuid4()` is the correct tool for this.  
**Fix:** Replace `bcrypt.gensalt(...).decode("utf-8")` with `secrets.token_urlsafe(16)`.

#### N8 — `create_api_key` allows creating already-expired keys
**File:** `app/routers/apikeys.py:59-67`  
**Severity:** Medium  
**Description:** `body.expires_at` is passed directly to the model without validating it is in the future. A client can create an API key that expires in 1970, which is immediately unusable.  
**Fix:** Add a validator rejecting `expires_at <= datetime.now(timezone.utc)`.

#### N9 — `query_data` `sensor_type` query parameter is unvalidated in raw mode
**File:** `app/routers/data.py:29`  
**Severity:** Medium  
**Description:** Unlike `nearby` which has a regex pattern for `sensor_type`, `query_data` accepts any string. An invalid `sensor_type` silently returns empty results instead of a 422. The `aggregate` parameter has a regex, but `sensor_type` does not.  
**Fix:** Add `pattern="^(air_quality|temperature|...|voc)$"` to the `sensor_type` Query parameter.

### Low (1)

#### N10 — `list_stations` `status_filter` query parameter is unvalidated
**File:** `app/routers/stations.py:68`  
**Severity:** Low  
**Description:** `status_filter` accepts any string. Invalid values silently return empty results instead of 422.  
**Fix:** Add `pattern="^(active|inactive|maintenance)$"` or use a `Literal` enum.

---

## Summary Table

| Severity | Cycle 2 Found | Resolved | Still Open | New |
|----------|--------------|----------|------------|-----|
| Critical | 10 | 9 | 1 | 1 |
| High | 18 | 16 | 1 | 4 |
| Medium | 14 | 9 | 5 | 4 |
| Low | 12 | 5 | 8 | 1 |
| **Total** | **54** | **39** | **15** | **10** |

**Total remaining issues: 25**

---

## Recommendations for Cycle 5

1. **Complete API key permission enforcement.** Add read-permission checks to `data.py`, `stations.py`, `apikeys.py`, and `billing.py`. Consider a centralized `require_permission` dependency.
2. **Fix the idempotency implementation.** Either move idempotency keys to a database table (transactional) or replace the in-memory dict with Redis + proper TTL. The current in-memory implementation is a memory leak and a duplicate-data risk.
3. **Fix the daily limit count query.** Add `SensorStation.deleted_at.is_(None)` to the `today_count` query in `ingest.py`.
4. **Cap `nearby` `lon_margin`.** Add a `min(lon_margin, 180.0)` guard or switch to PostGIS `ST_DWithin`.
5. **Replace `bcrypt.gensalt` for jti.** Use `secrets.token_urlsafe` in `auth.py`.
6. **Validate `query_data` and `list_stations` query parameters.** Add regex/enum validation for `sensor_type` and `status_filter`.
7. **Add DB connectivity to the health endpoint.** Return 503 if the database is unreachable.
8. **Validate `expires_at` on API key creation.** Reject dates in the past.
9. **Address remaining low/medium debt.** Remove dead code (`SensorTypeValidator`), deduplicate `_hash_key`, fix `env.py` imports, add request path to exception logs, and introduce Alembic in the Docker entrypoint.
10. **Cascade-soft-delete readings.** When a station is deleted, also set `deleted_at` on its readings, or add a database trigger to maintain consistency.

---

*End of report.*
