# ENViroSwarm Backend — QA Cycle 2 Review Report

**Reviewer:** Senior QA Engineer (Sub-agent)  
**Scope:** `backend/app/` and `backend/tests/`  
**Date:** 2025-07-01  
**Repo:** `D:/photonbounce/enviroswarm`  

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Critical** | 10 |
| **High** | 18 |
| **Medium** | 14 |
| **Low** | 12 |
| **Total** | **54** |

Cycle 1 appears to have focused on basic scaffolding (async SQLAlchemy, Pydantic v2, JWT auth, rate-limit skeleton). However, **soft-delete semantics are almost entirely unimplemented**—`deleted_at` exists on every model but is checked in almost zero queries. This creates auth bypass, data leaks, and incorrect business logic across the board. Race conditions on tier limits, a major data leak in the geo-query endpoint, and broken test passwords are also prominent.

---

## Critical Issues (10)

### C1 — Deleted users can still authenticate and use the API
**File:** `app/auth.py` (lines 129, 135), `app/dependencies.py` (lines 121, 149)  
**Severity:** Critical  
**Description:** `get_current_user` and the JWT fallback in `get_current_user_or_api_key` query `User.is_active == True` but never filter `User.deleted_at.is_(None)`. A soft-deleted user (with `deleted_at` set) can log in, refresh tokens, and call all authenticated endpoints.  
**Fix:** Add `User.deleted_at.is_(None)` to every user lookup in auth dependencies.

### C2 — Login endpoint does not check `is_active` or `deleted_at`
**File:** `app/routers/auth.py` (lines 72–76)  
**Severity:** Critical  
**Description:** `login` only verifies the password hash. It does not verify `is_active` or `deleted_at`. An inactive or deleted user with a valid password can still obtain tokens.  
**Fix:** Add `User.is_active == True` and `User.deleted_at.is_(None)` to the login query.

### C3 — Refresh token endpoint does not check `deleted_at`
**File:** `app/routers/auth.py` (lines 99–100)  
**Severity:** Critical  
**Description:** The refresh endpoint checks `is_active` but ignores `deleted_at`. A deleted user can perpetually refresh tokens indefinitely.  
**Fix:** Add `User.deleted_at.is_(None)` to the refresh query.

### C4 — Ingest endpoint accepts data for soft-deleted stations
**File:** `app/routers/ingest.py` (lines 26–29)  
**Severity:** Critical  
**Description:** The ownership check queries `SensorStation` by `id` and `user_id` but does not filter `deleted_at.is_(None)`. A user can continue pushing readings to a station they have "deleted" because the station is still in the DB with a `deleted_at` timestamp.  
**Fix:** Add `SensorStation.deleted_at.is_(None)` to the ownership query.

### C5 — Data query endpoints return deleted stations and readings
**File:** `app/routers/data.py` (lines 99–103, 126–139)  
**Severity:** Critical  
**Description:** Neither `query_data` nor `nearby` filters `SensorStation.deleted_at` or `SensorReading.deleted_at`. Deleted stations and their readings remain visible in the API. The `nearby` endpoint also loads **all** stations (see H5) without any ownership filter, leaking data across users.  
**Fix:** Add `deleted_at.is_(None)` filters to both `SensorStation` and `SensorReading` in every query. For `nearby`, add `SensorStation.user_id == user.id` (or decide on public station policy).

### C6 — API key permissions are never enforced
**File:** `app/dependencies.py` (lines 91–155), `app/routers/ingest.py`, `app/routers/data.py`  
**Severity:** Critical  
**Description:** `ApiKey.permissions` stores `{"read": bool, "write": bool}`, but `get_current_user_or_api_key` never inspects this field. A read-only API key can call `POST /api/v1/ingest` (write) and a write-only key (if ever created) can call `GET /api/v1/data` (read).  
**Fix:** After resolving the API key, inspect `api_key.permissions`. Raise `403` if the route's required permission is absent. Attach `required_permission` to route decorators or check the request method.

### C7 — API key revocation performs hard-delete instead of soft-delete
**File:** `app/routers/apikeys.py` (lines 106–107)  
**Severity:** Critical  
**Description:** The model defines `deleted_at` for soft-delete semantics, but `revoke_api_key` calls `await db.delete(key)`, permanently removing the row. This breaks audit trails and is inconsistent with the station soft-delete pattern.  
**Fix:** Set `key.deleted_at = datetime.now(timezone.utc)` and commit, matching station deletion.

### C8 — `nearby` geo-query endpoint returns every station in the database to every user
**File:** `app/routers/data.py` (lines 138–161)  
**Severity:** Critical  
**Description:** `nearby` executes `select(SensorStation)` with **no ownership filter** and returns all stations from all users. This is a cross-tenant data leak. It also loads every row into Python memory before filtering.  
**Fix:** Add `SensorStation.user_id == user.id` and `SensorStation.deleted_at.is_(None)` to the query. If the intent is public discovery, add an explicit `is_public` flag.

### C9 — Default `SECRET_KEY` is a known weak string
**File:** `app/config.py` (line 22)  
**Severity:** Critical  
**Description:** The default `secret_key` is a hard-coded, well-known string (`"CHANGE-ME-IN-PRODUCTION-32CHARS-MIN"`). If an admin forgets to override it (e.g., missing `.env` in a staging deploy), attackers can forge JWTs.  
**Fix:** Remove the default and raise `RuntimeError` if `SECRET_KEY` is not provided in the environment.

### C10 — All test files use passwords that fail `validate_password`
**File:** `tests/test_auth.py` (line 33), `tests/test_stations.py` (line 23), `tests/test_ingest.py` (line 23)  
**Severity:** Critical  
**Description:** Every test uses `"password123"` (no uppercase letter). The `register` endpoint calls `validate_password`, which raises `ValueError`. The endpoint converts this to `HTTPException(400)`. The tests assert `status_code == 200`, so **all registration tests will fail at runtime**.  
**Fix:** Change test passwords to something like `"Password123"` that satisfies all complexity rules.

---

## High Issues (18)

### H1 — Race condition on station creation tier limit
**File:** `app/routers/stations.py` (lines 23–34)  
**Severity:** High  
**Description:** The endpoint counts existing stations, then inserts a new one. Two concurrent requests can both read the same count and both insert, exceeding the tier limit.  
**Fix:** Use a `SELECT ... FOR UPDATE` on the user row, or enforce a unique partial index and catch `IntegrityError`.

### H2 — Race condition on API key creation tier limit
**File:** `app/routers/apikeys.py` (lines 41–48)  
**Severity:** High  
**Description:** Same pattern as H1: count existing keys, then insert. Concurrent requests can exceed the tier limit.  
**Fix:** Same approach: row-level lock or database constraint.

### H3 — Race condition on daily reading ingest limit
**File:** `app/routers/ingest.py` (lines 41–56)  
**Severity:** High  
**Description:** `today_count` is read via `COUNT()`, then the batch is inserted. Concurrent ingests can overshoot the daily limit.  
**Fix:** Use a `SELECT ... FOR UPDATE` on a user daily-usage summary row, or enforce a database trigger/constraint.

### H4 — `nearby` loads all stations into Python memory
**File:** `app/routers/data.py` (line 138)  
**Severity:** High  
**Description:** `select(SensorStation)` fetches every row, then Python applies the haversine formula. At scale this is an OOM risk.  
**Fix:** Use a SQL bounding box query first (e.g., `lat ± (radius_km / 111)`) or install PostGIS and use `ST_DWithin`.

### H5 — `refresh_token` endpoint accepts token as a query parameter
**File:** `app/routers/auth.py` (line 91)  
**Severity:** High  
**Description:** `refresh_token: str` in a POST handler becomes a query parameter by default. Refresh tokens are long-lived credentials and should never appear in URLs (query params are logged by proxies, web servers, and browser history).  
**Fix:** Create a `RefreshTokenRequest` body model with `refresh_token: str`.

### H6 — `update_station` uses `StationCreateRequest` for PATCH, requiring all fields
**File:** `app/routers/stations.py` (line 105)  
**Severity:** High  
**Description:** A `PATCH` endpoint should allow partial updates. Using `StationCreateRequest` forces the client to send every field (name, lat, lon, sensor_types, status).  
**Fix:** Create a `StationUpdateRequest` with all fields optional (`Optional`).

### H7 — `query_data` aggregate query ignores `offset` parameter
**File:** `app/routers/data.py` (lines 44–95)  
**Severity:** High  
**Description:** The `offset` parameter is accepted but never applied in the `aggregate != "none"` branch. Pagination is broken for aggregated queries.  
**Fix:** Add `.offset(offset)` to the aggregation statement.

### H8 — Ingest endpoint has no idempotency support despite header being declared
**File:** `app/routers/ingest.py`, `app/main.py` (line 48)  
**Severity:** High  
**Description:** CORS exposes `X-Idempotency-Key`, but the ingest endpoint does not read or enforce it. Retries will create duplicate readings.  
**Fix:** Read `X-Idempotency-Key` header, store a hash of `(idempotency_key, user_id)` with a TTL, and reject duplicates.

### H9 — `rate_limit_dependency` commits inside an auth dependency
**File:** `app/dependencies.py` (lines 119–120)  
**Severity:** High  
**Description:** When authenticating via API key, `get_current_user_or_api_key` calls `await db.commit()` to update `last_used_at`. This commits any pending changes in the shared session before the endpoint runs, potentially persisting partial state or causing confusing errors.  
**Fix:** Use a separate `async with AsyncSessionLocal()` session for the `last_used_at` update, or use a background task / Redis stream.

### H10 — `require_tier` decorator only supports JWT, not API key auth
**File:** `app/dependencies.py` (lines 186–194)  
**Severity:** High  
**Description:** `require_tier` depends on `get_current_user` (JWT only). An API key user cannot create API keys because the `create_api_key` endpoint uses `require_tier`, which will reject API key auth.  
**Fix:** Change `require_tier` to depend on `get_current_user_or_api_key`.

### H11 — `query_data` aggregate query returns wrong `meta.total`
**File:** `app/routers/data.py` (lines 94–95)  
**Severity:** High  
**Description:** In aggregation mode, `meta.total` is set to `len(data)`, which is the number of buckets *after* `limit` is applied. The client cannot determine the true total number of buckets.  
**Fix:** Run a separate `COUNT(DISTINCT date_trunc(...))` query, or omit `total` for aggregates and document it.

### H12 — `query_data` raw query doesn't filter `deleted_at` on readings or stations
**File:** `app/routers/data.py` (lines 98–123)  
**Severity:** High  
**Description:** Even though the aggregate path also has this issue, the raw query path is the primary data retrieval path. Deleted readings and readings from deleted stations are returned.  
**Fix:** Add `SensorReading.deleted_at.is_(None)` and `SensorStation.deleted_at.is_(None)` to the base statement.

### H13 — `subscribe` endpoint creates unlimited duplicate subscriptions
**File:** `app/routers/billing.py` (lines 54–85)  
**Severity:** High  
**Description:** A user can call `POST /api/v1/subscribe` repeatedly, creating an unlimited number of `Subscription` rows. There is no check for an existing active subscription.  
**Fix:** Query for an active subscription (`deleted_at.is_(None)`, `end_date >= now()`) and reject or update-in-place.

### H14 — `subscribe` endpoint has no transaction rollback on failure
**File:** `app/routers/billing.py` (lines 76–81)  
**Severity:** High  
**Description:** `db.commit()` is called without a try/except. If the commit fails (e.g., constraint violation, DB disconnect), `user.tier` has already been mutated in the session but no rollback is guaranteed.  
**Fix:** Wrap the add+update+commit in a `try/except` with `await db.rollback()`.

### H15 — Ingest endpoint doesn't validate that sensor_type matches station's configured types
**File:** `app/routers/ingest.py` (lines 58–69)  
**Severity:** High  
**Description:** A station created with `sensor_types: ["temperature"]` can receive a reading with `sensor_type: "radiation"`. This corrupts the data model contract.  
**Fix:** After verifying ownership, check `r.sensor_type in station.sensor_types` for each reading.

### H16 — Model `id` fields typed as `str` but mapped to `UUID(as_uuid=True)`
**File:** `app/models.py` (multiple lines)  
**Severity:** High  
**Description:** Every model declares `id: Mapped[str] = mapped_column(UUID(as_uuid=True), ...)`. SQLAlchemy returns `uuid.UUID` objects at runtime, contradicting the type hint. This causes type-checking failures and confusion when calling `str(user.id)` vs `user.id`.  
**Fix:** Change all `Mapped[str]` for `id` columns to `Mapped[uuid.UUID]`.

### H17 — In-memory rate-limit store has no eviction and is not async-safe
**File:** `app/dependencies.py` (lines 26, 39–55)  
**Severity:** High  
**Description:** `_rate_limit_store` is a global `dict`. It grows unbounded (memory leak). It is also not protected by locks, so concurrent async tasks can race on increments and window resets. In a multi-process deployment, rate limits are per-process and useless.  
**Fix:** Replace with Redis + `asyncio.Lock` or `aioredis`'s atomic `INCR`/`EXPIRE`.

### H18 — `SensorReading` default `timestamp` uses client time instead of DB server time
**File:** `app/models.py` (line 111)  
**Severity:** High  
**Description:** `default=datetime.now(timezone.utc)` is evaluated on the application server. If the app server clock is skewed, data ordering is inconsistent. It also bypasses the DB's monotonic clock.  
**Fix:** Use `server_default=func.now()` and let the application provide an explicit timestamp only when needed.

---

## Medium Issues (14)

### M1 — `effective_start` timezone comparison can raise `TypeError`
**File:** `app/routers/data.py` (line 42)  
**Severity:** Medium  
**Description:** If the client passes a naive `start` datetime (e.g., `2024-01-01T00:00:00`), `max(start, earliest_allowed)` will crash because `earliest_allowed` is timezone-aware. FastAPI returns a 500 instead of a 400.  
**Fix:** Normalize `start` to UTC before comparison, or reject naive datetimes in a validator.

### M2 — `list_api_keys` returns deleted/revoked keys
**File:** `app/routers/apikeys.py` (lines 85–86)  
**Severity:** Medium  
**Description:** If C7 is fixed to soft-delete, this query will start returning revoked keys because it lacks `ApiKey.deleted_at.is_(None)`. Even with hard-delete today, the inconsistency is noteworthy.  
**Fix:** Add `ApiKey.deleted_at.is_(None)` to the filter (or hard-delete consistently everywhere).

### M3 — `station_id` path/query parameters typed as `str` instead of `UUID`
**File:** `app/routers/stations.py` (lines 81, 104, 136), `app/routers/data.py` (line 28)  
**Severity:** Medium  
**Description:** `station_id` is declared as `str` but the DB column is `UUID`. SQLAlchemy usually coerces, but it is an API contract mismatch and can cause subtle query failures.  
**Fix:** Use `UUID` type annotations in route signatures.

### M4 — `StationCreateRequest` doesn't validate `status` field
**File:** `app/schemas.py` (line 81)  
**Severity:** Medium  
**Description:** `status` accepts any string. Invalid values (e.g., `"hacked"`) pass Pydantic validation and only fail at the DB check-constraint level, resulting in a 500 instead of a 422.  
**Fix:** Add a `field_validator` or `Literal["active", "inactive", "maintenance"]`.

### M5 — `SensorReadingPayload` and `IngestRequest` allow unbounded batch size
**File:** `app/schemas.py` (lines 123–124)  
**Severity:** Medium  
**Description:** `readings: List[SensorReadingPayload] = Field(..., min_length=1)` has no `max_length`. A client can send millions of readings in one request, causing OOM or timeout.  
**Fix:** Add `max_length=1000` (or tier-based limit) to the `readings` field.

### M6 — `get_current_user_optional` bypasses FastAPI's dependency injection
**File:** `app/auth.py` (lines 138–145)  
**Severity:** Medium  
**Description:** `get_current_user_optional` calls `get_current_user(token, db)` directly, passing the resolved values positionally. While it works, it couples the implementation to `get_current_user`'s signature. If `get_current_user` adds a new parameter, this breaks.  
**Fix:** Refactor to share a private `_get_current_user` function that takes explicit positional args.

### M7 — `ingest` endpoint allows backdated and future-dated readings without limits
**File:** `app/routers/ingest.py` (lines 59–69)  
**Severity:** Medium  
**Description:** No validation that `timestamp` is within the retention window or not arbitrarily far in the future. A malicious client can pollute historical data or pre-date readings.  
**Fix:** Validate `timestamp` is within `[now - retention_days, now + 5_minutes]`.

### M8 — `nearby` endpoint doesn't validate `sensor_type` against `SENSOR_TYPES`
**File:** `app/routers/data.py` (line 131)  
**Severity:** Medium  
**Description:** `sensor_type` query parameter is optional but unvalidated. An invalid string silently excludes all results rather than returning a 422.  
**Fix:** Add a regex pattern or enum validation to the `Query(...)` parameter.

### M9 — `SensorStation.readings` eagerly loads with `selectin`
**File:** `app/models.py` (lines 87–89)  
**Severity:** Medium  
**Description:** `lazy="selectin"` on `readings` means loading a station fetches ALL its readings. For a station with millions of readings, this is a performance disaster.  
**Fix:** Change to `lazy="select"` or use a custom query for reading counts.

### M10 — `User` relationships eagerly load with `selectin`
**File:** `app/models.py` (lines 47–55)  
**Severity:** Medium  
**Description:** `stations`, `api_keys`, and `subscriptions` all use `lazy="selectin"`. Loading a user fetches all related objects.  
**Fix:** Change to `lazy="select"` or use explicit joined loads only where needed.

### M11 — `SensorTypeValidator` class is dead code
**File:** `app/schemas.py` (lines 36–42)  
**Severity:** Medium  
**Description:** `SensorTypeValidator` is defined but never inherited by any schema. Every schema that needs sensor validation duplicates the logic inline.  
**Fix:** Delete it or refactor schemas to inherit from it.

### M12 — Duplicate `_hash_key` and `_extract_prefix` functions
**File:** `app/routers/apikeys.py` (lines 26–32), `app/dependencies.py` (lines 78–84)  
**Severity:** Medium  
**Description:** The same hashing and prefix logic is copy-pasted. Divergence risk.  
**Fix:** Move shared helpers to a `utils/crypto.py` module.

### M13 — `delete_station` soft-deletes but does not cascade to readings
**File:** `app/routers/stations.py` (lines 152–154)  
**Severity:** Medium  
**Description:** The model defines `cascade="all, delete-orphan"`, but that only triggers on hard-delete. Soft-deleting a station leaves its readings visible via `query_data` (and `data.py` doesn't filter `deleted_at`).  
**Fix:** Either cascade-soft-delete readings in the endpoint, or add a `station.deleted_at` filter to all reading queries.

### M14 — `app/main.py` lifespan uses `create_all` instead of Alembic migrations
**File:** `app/main.py` (lines 26–27)  
**Severity:** Medium  
**Description:** `Base.metadata.create_all` on startup is convenient for dev but dangerous in production. It does not handle schema migrations, renames, or data migrations.  
**Fix:** Run `alembic upgrade head` in the Docker entrypoint instead.

---

## Low Issues (12)

### L1 — `get_current_user_or_api_key` has redundant `authorization` parameter
**File:** `app/dependencies.py` (line 94)  
**Severity:** Low  
**Description:** Both `authorization: Optional[str] = Header(None)` and `request.headers.get("Authorization", "")` read the same header. This is unnecessary duplication.  
**Fix:** Remove the `authorization` parameter and rely solely on `request.headers`.

### L2 — `decode_token` does not verify `sub` claim presence
**File:** `app/auth.py` (lines 87–104)  
**Severity:** Low  
**Description:** `decode_token` returns the payload without verifying that `"sub"` exists. Callers (`decode_access_token`, `decode_refresh_token`) do not check it either. The refresh endpoint checks manually, but it would be safer to validate at the decoding layer.  
**Fix:** Add a check in `decode_token` that `payload.get("sub")` is a non-empty string.

### L3 — Alembic `env.py` imports unused models
**File:** `backend/alembic/env.py` (line 10)  
**Severity:** Low  
**Description:** `User, SensorStation, ...` are imported but only `Base` is used. The imports are unnecessary because `Base.metadata` already includes all registered models.  
**Fix:** Remove the unused imports.

### L4 — `global_exception_handler` doesn't log request path or ID
**File:** `app/main.py` (lines 70–81)  
**Severity:** Low  
**Description:** `logger.error` only logs the exception message. Without the request path or a correlation ID, debugging production 500s is harder.  
**Fix:** Include `request.url.path`, `request.method`, and a generated request ID in the log.

### L5 — `PRICING_TIERS` is a list, making tier lookup O(n)
**File:** `app/routers/billing.py` (lines 18–46)  
**Severity:** Low  
**Description:** `tier_names = [t.name for t in PRICING_TIERS]` rebuilds the list every request. For 3 tiers it's negligible, but a dict is cleaner.  
**Fix:** Use a `dict` keyed by tier name.

### L6 — `check_rate_limit` window reset race condition
**File:** `app/dependencies.py` (lines 45–49)  
**Severity:** Low  
**Description:** If multiple requests hit the window boundary simultaneously, they can all see the expired window and all set count=1, briefly allowing a burst equal to the number of concurrent requests.  
**Fix:** Use Redis atomic `INCR`/`EXPIRE` or an `asyncio.Lock` around the window-reset logic.

### L7 — `ApiKey` `key_prefix` column length mismatch
**File:** `app/models.py` (line 136), `app/dependencies.py` (line 84)  
**Severity:** Low  
**Description:** `_extract_prefix` returns 8 chars, but the column is `String(16)`. Harmless but inconsistent.  
**Fix:** Align column length to 8 or document why 16 is reserved.

### L8 — `delete_station` imports `datetime` locally inside the function
**File:** `app/routers/stations.py` (lines 152–153)  
**Severity:** Low  
**Description:** `from datetime import datetime, timezone` is inside the function body. This is a style/code smell issue.  
**Fix:** Move the import to the top of the file.

### L9 — `refresh_token` endpoint does not revoke old refresh token
**File:** `app/routers/auth.py` (lines 89–113)  
**Severity:** Low  
**Description:** Token rotation is implemented (new refresh token issued), but the old one is not blacklisted. A stolen refresh token can be used indefinitely until it expires.  
**Fix:** Maintain a token blacklist (Redis or DB table) keyed by `jti`.

### L10 — `config.py` `.env` path is relative to CWD
**File:** `app/config.py` (line 45)  
**Severity:** Low  
**Description:** `env_file = ".env"` is resolved relative to the working directory. If the app is launched from a different directory, settings fall back to defaults.  
**Fix:** Use an absolute path based on the file location: `Path(__file__).resolve().parent.parent / ".env"`.

### L11 — `database.py` engine created at module import time
**File:** `app/database.py` (lines 12–20)  
**Severity:** Low  
**Description:** `engine = create_async_engine(...)` runs at import time, making it hard to override settings in tests or to mock the engine.  
**Fix:** Use a factory function or `lru_cache` to create the engine lazily.

### L12 — Tests use deprecated `AsyncClient(app=app)` pattern
**File:** `tests/test_auth.py` (line 15), `tests/test_stations.py` (line 20), `tests/test_ingest.py` (line 20)  
**Severity:** Low  
**Description:** Modern `httpx` recommends `AsyncClient(transport=ASGITransport(app=app))`. The old `app=app` kwarg is deprecated.  
**Fix:** Update to `ASGITransport`.

---

## What Was Fixed in Cycle 1 (Inferred)

Based on the current code quality, Cycle 1 likely addressed the following:

1. **Basic async SQLAlchemy setup** — Engine, session, and `AsyncSession` dependencies are properly wired.
2. **Pydantic v2 migration** — Schemas use `BaseModel`, `field_validator`, `model_dump`, and `model_validate` correctly.
3. **JWT auth scaffold** — `create_access_token`, `create_refresh_token`, `decode_token`, and `get_current_user` are implemented with `jti` and expiration.
4. **Password hashing** — `bcrypt` is used with 12 rounds.
5. **API key auth skeleton** — Prefix + hash lookup, expiration check, and `last_used_at` update are present.
6. **Rate limit scaffold** — In-memory store with per-route limits is wired up (though not production-ready).
7. **Standard response envelope** — `StandardResponse` is used consistently across routers.
8. **CORS / GZip middleware** — Configured with explicit origins and allowed headers.
9. **Global exception handler** — Catches unhandled exceptions and hides details in production.
10. **Tier-based limits** — Station counts, API key counts, and daily reading counts are enforced (but with race conditions).
11. **Retention policy** — `query_data` enforces `earliest_allowed` based on tier.
12. **Data aggregation** — `date_trunc` aggregation for hour/day/month is implemented.

---

## What Remains Unfixed / New in Cycle 2

The following major gaps were **not** addressed in Cycle 1 and are new findings for Cycle 2:

1. **Soft-delete semantics are completely broken.** `deleted_at` exists on every model but is checked in almost zero queries. This is the single biggest systemic issue.
2. **Cross-tenant data leak in `nearby` endpoint.** Returns all stations to all users.
3. **Auth bypass for deleted/inactive users.** Login, refresh, and dependency auth don't check `deleted_at` or `is_active` consistently.
4. **API key permissions are stored but never enforced.** Read-only keys can write.
5. **Race conditions on all tier limits.** No atomic counters or database constraints.
6. **Test suite is broken.** All registration tests use passwords that fail complexity validation.
7. **Refresh token sent as query param.** Security issue for long-lived credentials.
8. **No idempotency on ingest.** Despite `X-Idempotency-Key` in CORS.
9. **Hard-delete on API key revocation.** Inconsistent with station soft-delete.
10. **PATCH station requires all fields.** No partial update support.
11. **Missing pagination in aggregate queries.** `offset` is ignored.
12. **Model type hints mismatch.** `Mapped[str]` vs `UUID(as_uuid=True)`.
13. **Eager loading on large relationships.** `selectin` on `readings`/`stations` can OOM.
14. **No input validation on `status` and `sensor_type` in some routes.**
15. **Daily limit and batch size lack upper bounds.**

---

## Recommendations for Cycle 3

1. **Fix soft-delete holistically.** Add a `deleted_at.is_(None)` filter to every query, or introduce a SQLAlchemy query filter mixin.
2. **Fix auth first.** Add `is_active` and `deleted_at` checks to `login`, `refresh`, `get_current_user`, and `get_current_user_or_api_key`.
3. **Fix the test suite.** Update passwords to pass validation, add tests for `deleted_at`, `is_active`, tier limits, API key permissions, and the `nearby` endpoint.
4. **Replace in-memory rate limiter with Redis.** This fixes race conditions, memory leaks, and multi-process issues.
5. **Add database constraints for tier limits.** Use partial unique indexes or check constraints to prevent race-condition overflows.
6. **Implement idempotency.** Use `X-Idempotency-Key` with a Redis/DB dedup store.
7. **Refactor `nearby` to SQL-only.** Add a bounding box filter or use PostGIS.
8. **Add API key permission checks.** Middleware or dependency that inspects `request.state.api_key.permissions`.
9. **Use Alembic for migrations.** Remove `create_all` from lifespan.
10. **Fix model type hints.** `Mapped[uuid.UUID]` for all `id` columns.

---

*End of report.*
