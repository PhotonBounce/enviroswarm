# QA Cycle 23 — Backend Review

**Status**: ❌ FAIL — Issues found.

**Scope**: All Python files in `backend/app/`
**Date**: 2026-07-01
**Reviewer**: Senior QA Engineer (Zero-Defect Review)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 3 |
| Medium   | 8 |
| Low      | 7 |
| **Total** | **21** |

---

## Critical Issues

### 1. Subscribe endpoint is completely non-functional (always returns 402)
- **Severity**: Critical
- **File**: `backend/app/routers/billing.py`
- **Line**: 108
- **Issue**: `sub.payment_status` is hardcoded to `"pending"` in the `Subscription` constructor, and the very next line checks `if sub.payment_status != "completed"`. This condition is **always true**, so the endpoint **always** raises `402 Payment Required`. The `return StandardResponse(...)` on line 116 is unreachable.
- **Fix**: Implement a real payment flow (e.g., payment gateway integration) or remove the immediate `402` check. If payment is synchronous, set `payment_status="completed"` after successful processing. If async, do not raise `402` inside this endpoint.

### 2. User tier is never updated after subscription
- **Severity**: Critical
- **File**: `backend/app/routers/billing.py`
- **Line**: 99–118
- **Issue**: The `subscribe` endpoint creates a `Subscription` record but never updates `user.tier`. The application uses `user.tier` for rate limits, station limits, and API key limits. The user pays for a tier but never receives any benefits because `user.tier` remains at its original value (e.g., `"free"`).
- **Fix**: After successful payment, update `user.tier = body.tier` and persist the change before returning the response. Also add a downgrade/cancel mechanism to restore the tier when the subscription expires.

### 3. Hardcoded database credentials in default config
- **Severity**: Critical
- **File**: `backend/app/config.py`
- **Line**: 22
- **Issue**: `database_url` has a hardcoded default value containing the username and password (`enviroswarm:enviroswarm`). If the `DATABASE_URL` environment variable is unset in production, the application falls back to these credentials, exposing the database.
- **Fix**: Remove the default value. Set `database_url: str = Field(...)` to require explicit configuration. Alternatively, use `Field(default=None)` and validate it at startup, failing fast if unset.

---

## High Issues

### 4. X-Forwarded-For rate limiting uses wrong IP (last instead of first)
- **Severity**: High
- **File**: `backend/app/dependencies.py`
- **Line**: 249
- **Issue**: When behind a reverse proxy, the code uses `forwarded.split(",")[-1].strip()` (the IP closest to the server). This means all requests routed through the same proxy share the same rate-limit bucket, effectively disabling per-client rate limiting.
- **Fix**: Use the **first** IP in the chain: `forwarded.split(",")[0].strip()`. This is the original client IP added by the outermost proxy. Add a trusted-proxy allowlist for production to prevent spoofing.

### 5. Engine/sessionmaker lazy init is not thread-safe
- **Severity**: High
- **File**: `backend/app/database.py`
- **Line**: 18–49
- **Issue**: `get_engine()` and `get_sessionmaker()` use a check-then-act pattern on module-level globals (`_engine`, `_AsyncSessionLocal`). Under concurrent async tasks, multiple tasks can see `None`, race to `create_async_engine`, and leak engines.
- **Fix**: Use an `asyncio.Lock` to protect initialization:
```python
import asyncio
_init_lock = asyncio.Lock()

async def get_engine():
    global _engine
    if _engine is None:
        async with _init_lock:
            if _engine is None:
                settings = get_settings()
                ...
                _engine = create_async_engine(...)
    return _engine
```

### 6. Logout endpoint decodes access token but discards the result
- **Severity**: High
- **File**: `backend/app/routers/auth.py`
- **Line**: 277–282
- **Issue**: The code calls `await decode_access_token(access_token)` but does not use the decoded payload. The only side effect is wasted CPU; `token_found` is already `True`. If the intention was to revoke the access token, there is no access-token revocation table or logic.
- **Fix**: Remove the useless `decode_access_token` call and its `try/except` block. If access-token revocation is required, implement a token blacklist (e.g., `RevokedAccessToken` model) or use shorter-lived access tokens.

---

## Medium Issues

### 7. PostgreSQL `JSON` type may not support `.contains()` operator
- **Severity**: Medium
- **File**: `backend/app/models.py` (line 76) and `backend/app/routers/data.py` (line 193)
- **Issue**: `SensorStation.sensor_types` uses SQLAlchemy's generic `JSON` type, which maps to PostgreSQL `json` (not `jsonb`). The `nearby` endpoint queries with `.contains([sensor_type])`, which generates the `@>` operator — a `JSONB` operator. On plain `json` columns, this will fail with a PostgreSQL error.
- **Fix**: Change the column type to `JSONB`:
```python
from sqlalchemy.dialects.postgresql import JSONB
sensor_types: Mapped[List[str]] = mapped_column(JSONB, nullable=False)
```

### 8. Sensor types hardcoded in DB constraint instead of shared constant
- **Severity**: Medium
- **File**: `backend/app/models.py`
- **Line**: 132
- **Issue**: The `CheckConstraint` in `SensorReading` hardcodes the sensor types list as an f-string. The same list exists in `schemas.py` as `SENSOR_TYPES`. If one is updated without the other, the application schema and DB constraint diverge.
- **Fix**: Define `SENSOR_TYPES` once (e.g., in `constants.py`) and import it in both `models.py` and `schemas.py`. In `models.py`, build the constraint dynamically from the shared list.

### 9. Fragile field-validator for latitude/longitude in create schema
- **Severity**: Medium
- **File**: `backend/app/schemas.py`
- **Line**: 151–159
- **Issue**: `StationCreateRequest.validate_latitude_longitude` uses `mode="after"` on `longitude` and accesses `info.data.get("latitude")`. In Pydantic v2, `info.data` in `mode="after"` contains only fields validated so far, and validation order depends on definition order. This is fragile and may break if field order changes.
- **Fix**: Use a `model_validator(mode="after")` (like `StationUpdateRequest` does) so all fields are guaranteed to be present and no ordering dependency exists.

### 10. `get_db()` does not explicitly rollback on exception
- **Severity**: Medium
- **File**: `backend/app/database.py`
- **Line**: 52–53
- **Issue**: `get_db()` yields a session but relies on `async with` to close it. `AsyncSession.__aexit__` calls `close()`, which does **not** automatically rollback. If an endpoint raises an exception after adding objects but before committing, uncommitted changes may not be rolled back, potentially leaking dirty state to the connection pool.
- **Fix**: Wrap the yield with explicit rollback:
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with get_sessionmaker()() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
```

### 11. Cookie settings lack explicit `path="/"`
- **Severity**: Medium
- **File**: `backend/app/routers/auth.py`
- **Line**: 43–57
- **Issue**: `COOKIE_SETTINGS` and `REFRESH_COOKIE_SETTINGS` do not specify `path`. While Starlette currently defaults to `/`, this is implementation-dependent. If the default changes, cookies scoped to the auth sub-path would not be sent to other endpoints, breaking cookie-based authentication.
- **Fix**: Add `"path": "/"` to both cookie settings dictionaries.

### 12. String-based `order_by` in SQLAlchemy 2.0 aggregate query
- **Severity**: Medium
- **File**: `backend/app/routers/data.py`
- **Line**: 91
- **Issue**: The aggregate query uses `order_by("bucket")`, which is a legacy SQLAlchemy pattern. In SQLAlchemy 2.0, string ordering is discouraged and may not work consistently across dialects or future versions.
- **Fix**: Use the expression directly: `order_by(_date_trunc(trunc_unit, SensorReading.timestamp))` or `order_by(_date_trunc(...).label("bucket"))`.

### 13. Rate-limit fallback regex doesn't match UUID paths
- **Severity**: Medium
- **File**: `backend/app/dependencies.py`
- **Line**: 226
- **Issue**: `re.sub(r"/\d+", "/{id}", request.url.path)` is designed for numeric IDs. The API uses UUIDs everywhere, so the regex never matches. If the route-name fallback is ever triggered, each unique UUID path gets its own rate-limit bucket, bypassing the limit.
- **Fix**: Replace the regex with a UUID pattern: `re.sub(r"/[0-9a-fA-F\-]{36}", "/{id}", request.url.path)`.

### 14. Validation exception handler returns `list` for `error: str`
- **Severity**: Medium
- **File**: `backend/app/main.py`
- **Line**: 127–135
- **Issue**: `StandardResponse.error` is typed as `Optional[str]`. However, the `RequestValidationError` handler sets `error = exc.errors()`, which is a `list` of dicts. This violates the API contract and may break strongly typed clients.
- **Fix**: Change `StandardResponse.error` to `Optional[Any]` or `Optional[Union[str, List]]`, or serialize the errors to a string (e.g., `json.dumps(exc.errors())`).

---

## Low Issues

### 15. `get_current_user` is dead code
- **Severity**: Low
- **File**: `backend/app/auth.py`
- **Line**: 197–216
- **Issue**: `get_current_user` is defined but never imported or used anywhere in the backend. The application exclusively uses `get_current_user_or_api_key`.
- **Fix**: Remove `get_current_user` or use it in endpoints that do not need API-key support (e.g., web-only routes).

### 16. `ip_address` imported inside hot-path functions
- **Severity**: Low
- **File**: `backend/app/dependencies.py` (line 241), `backend/app/routers/auth.py` (line 73)
- **Issue**: `from ipaddress import ip_address` is imported inside request-handling functions, adding unnecessary per-request overhead.
- **Fix**: Move the import to the top of each module.

### 17. `environment` setting lacks enum validation
- **Severity**: Low
- **File**: `backend/app/config.py`
- **Line**: 41
- **Issue**: `environment: str = "development"` accepts any string. A typo like `"prdouction"` would silently disable production safeguards (e.g., `docs_url`, `redoc_url`, cookie `secure`).
- **Fix**: Use `Literal["development", "staging", "production"]` or a Pydantic enum.

### 18. Redundant `user_id is None` check in `_get_user_from_token`
- **Severity**: Low
- **File**: `backend/app/auth.py`
- **Line**: 176–177
- **Issue**: `_decode_token` already enforces `payload.get("sub")` is truthy (line 112). The `if user_id is None` check in `_get_user_from_token` is unreachable dead code.
- **Fix**: Remove the redundant check or keep it for defense-in-depth with a comment.

### 19. SQLite timezone hack in rate limiter may be inaccurate
- **Severity**: Low
- **File**: `backend/app/dependencies.py`
- **Line**: 60–64
- **Issue**: `check_rate_limit` normalizes aware datetimes to naive for SQLite. If SQLite `func.now()` returns local time (not UTC), the comparison is wrong.
- **Fix**: Use `func.datetime('now')` for SQLite, which returns UTC, or ensure SQLite is configured for UTC.

### 20. Refresh token not revoked if `exp` claim is missing
- **Severity**: Low
- **File**: `backend/app/routers/auth.py`
- **Line**: 228–231
- **Issue**: Old refresh token revocation is guarded by `if old_jti and old_exp`. If a malformed token lacks `exp`, it is not revoked during rotation, allowing potential replay.
- **Fix**: Revoke the token based on `jti` alone. If `expires_at` is unknown, set a reasonable default (e.g., `now + timedelta(days=7)`).

### 21. Code duplication across modules
- **Severity**: Low
- **Files**: `backend/app/schemas.py`, `backend/app/routers/auth.py`, `backend/app/dependencies.py`
- **Issue**: 
  - `StationUpdateRequest.validate_sensor_types` and `StationCreateRequest.validate_sensor_types` are identical.
  - `StationUpdateRequest.validate_status` and `StationCreateRequest.validate_status` are identical.
  - IP extraction / X-Forwarded-For parsing logic is duplicated in `dependencies.py` and `auth.py`.
  - `body.email = body.email.lower().strip()` is duplicated in `register` and `login`.
- **Fix**: Extract shared validators into helper functions or base classes in `schemas.py` and `utils/`.

---

## Appendix: Files Reviewed

- `backend/app/__init__.py`
- `backend/app/auth.py`
- `backend/app/config.py`
- `backend/app/constants.py`
- `backend/app/database.py`
- `backend/app/dependencies.py`
- `backend/app/main.py`
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/routers/__init__.py`
- `backend/app/routers/apikeys.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/billing.py`
- `backend/app/routers/data.py`
- `backend/app/routers/ingest.py`
- `backend/app/routers/stations.py`
- `backend/app/utils/__init__.py`
- `backend/app/utils/crypto.py`
