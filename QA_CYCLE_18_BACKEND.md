# ENViroSwarm Backend — QA Cycle 18 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 1 |
| **High** | 0 |
| **Medium** | 1 |
| **Low** | 4 |
| **Total** | **6** |

---

## Fix Verification (QA Cycles 1–17)

| Cycle | Issue | Status | Verification |
|-------|-------|--------|------------|
| C1 | Missing `import uuid` in `app/auth.py` | ✅ Fixed | `import uuid` present at line 5 |
| C2 | Missing `import uuid` in `app/routers/auth.py` | ✅ Fixed | `from uuid import UUID` present at line 6 |
| C3 | Missing `import uuid` in `app/dependencies.py` | ⚠️ Regressed | Import present but **now unused** (see L‑3) |
| C4 | `data.py` endpoints missing API key read permissions | ✅ Fixed | `require_permission("read")` present on `query_data` and `nearby` |
| C5 | `apikeys.py` `create_api_key` missing write permission | ✅ Fixed | `require_permission("write")` present |
| C6 | `IdempotencyKey.key_hash` column too short | ✅ Fixed | `String(64)` matches SHA‑256 hex output |
| C7 | `IdempotencyKey` missing unique constraint | ✅ Fixed | `UniqueConstraint("user_id", "key_hash")` present |
| C8 H1–H10 | Various fixes (rate limiting, tests, indexes, timestamp, password, HTTPException handler, idempotency constraint, refresh/register rate limits) | ✅ Fixed | All verified present and structurally correct |
| C8 L1–L6 | Various fixes (sensor_type regex, cookie max_age, sub check, NaN, logout, cascade update) | ✅ Fixed | All verified present |
| C9–C11 | All fixes verified present | ✅ Fixed | No regressions detected |
| C12 | All fixes verified present (Numeric `asdecimal=False`, email normalization, DataQueryResponse alias, timing side-channel, IntegrityError specificity, unit length, permissions, idempotency length, bcrypt max_length, side session try/except, or 0 removal, cascade updated_at) | ✅ Fixed | All verified present |
| C13 | All fixes verified present (revoked token DB model, rate limit DB model, `_date_trunc` SQLite fallback, `relativedelta`, `model_fields_set` guards, `order_by`, `or 0` removals, `status.HTTP_400`, redundant checks, `from exc`, test coverage, `str()` removal, `lazy="select"` removal, inline permission check) | ✅ Fixed | All verified present |
| C14 | All fixes verified present (PATCH coordinate preservation, IntegrityError specificity, aggregation bucket format, dead code removal, health check type, DB indexes, aggregation tests, `or 0` removal) | ✅ Fixed | All verified present |
| C15 | All fixes verified present (initial insertion race `try/except IntegrityError`, CORS OPTIONS, idempotency cleanup + index, `model_fields_set` validator, route name rate limiting, `unique=True` removal, `Optional[Request]`, `extract_api_key` plain default, client fixture scope, `ConfigDict`, `DeclarativeBase`, partial coordinate test) | ✅ Fixed | All verified present |
| C16 | All fixes verified present (valid dummy bcrypt hash, `model_fields_set` + value validator, `MultipleResultsFound` handling, `postgresql_where` removal, dynamic sensor_type regex, dynamic cookie max_age, redundant sub check removal, NaN check, logout without `get_current_user`) | ✅ Fixed | All verified present |
| C17 M‑1 | Expired idempotency keys block reinsertion | ✅ Fixed | Proactive `delete` of expired keys before lookup + `IntegrityError` retry path present |
| C17 M‑2 | `StationUpdateRequest` partial coordinate nullification | ✅ Fixed | `model_fields_set` + value null check present in validator |
| C17 L‑1 | Missing DB unique partial index on active subscriptions | ⚠️ Lingering | TODO comment still present in `billing.py:72`; no migration added |
| C17 L‑2 | `except Exception:` catches `HTTPException` | ✅ Fixed | `isinstance(exc, HTTPException)` short‑circuit present |
| C17 L‑3 | Logout does not clear expired cookies | ✅ Fixed | `had_cookies` check + unconditional `delete_cookie` present |
| C17 L‑4 | Authenticated endpoints do not rate‑limit unauthenticated requests | ⚠️ **Regression** | Rate limiting moved before auth, but **broke `X‑API‑Key` header auth** for `ingest` and `data` endpoints (see Critical C‑1) |
| C17 L‑5 | `request_id_middleware` header length | ✅ Fixed | Truncation to 64 chars present |
| C17 L‑6 | Logout case‑sensitive Bearer | ✅ Fixed | `.lower().startswith("bearer ")` present |

---

## Issues Found

### Critical

#### C‑1: Cycle 17 L‑4 fix regression — `rate_limit_dependency` breaks `X‑API‑Key` header authentication for `ingest` and `data` endpoints
- **Location**: `app/dependencies.py`, lines 250–251; `app/routers/ingest.py`, line 25; `app/routers/data.py`, lines 42 and 159
- **Description**: The Cycle 17 fix for unauthenticated rate limiting changed `rate_limit_dependency` to call `get_current_user_or_api_key(request, x_api_key=None, db=db)` directly instead of using it as a FastAPI dependency. Because `x_api_key` is explicitly passed as `None`, the utility `extract_api_key` never inspects the `X‑API‑Key` header (it only checks the `x_api_key` parameter and the `Authorization` header). Endpoints where `rate_limit_dependency` is listed **before** `require_permission` — namely `POST /api/v1/ingest`, `GET /api/v1/data`, and `GET /api/v1/data/nearby` — therefore return **401** for all requests that authenticate via `X‑API‑Key` header, even though `create_api_key` returns the key and the tests expect 200/403 for these flows. This is a **functional regression** that disables API‑key ingestion and querying.
- **Impact**: API key authentication is completely non‑functional for core read/write data endpoints. Clients using `X‑API‑Key` (the documented mechanism) cannot ingest or query data.
- **Fix**: Pass `request.headers.get("X-API-Key")` when calling `get_current_user_or_api_key` from `rate_limit_dependency`, or modify `extract_api_key` to fall back to `request.headers.get("X-API-Key")` when the parameter is `None`.

### Medium

#### M‑1: `RequestValidationError` (422) responses do not conform to `StandardResponse` format
- **Location**: `app/main.py`, lines 115–120
- **Description**: The custom `http_exception_handler` catches only `HTTPException` (and its subclasses). Pydantic validation errors raise `RequestValidationError`, which is **not** an `HTTPException`. FastAPI's default handler returns `{"detail": [{"loc": [...], "msg": ...}]}` — a completely different shape from the application's `StandardResponse` format (`{"success": false, "data": null, "error": ...}`). This creates an inconsistent API contract and breaks client parsers that expect the standard envelope.
- **Impact**: Any malformed request (e.g., invalid email format, missing required field, out‑of‑range numeric) returns a 422 body that does not match the documented response schema.
- **Fix**: Register a dedicated `@app.exception_handler(RequestValidationError)` that wraps the error detail into the `StandardResponse` format and returns status 422.

### Low

#### L‑1: Unused imports lingering in `app/dependencies.py`
- **Location**: `app/dependencies.py`, lines 4, 5, 12
- **Description**: Three imports are dead code:
  - `import time` (line 4) — never referenced; leftover from the removed in‑memory rate limiter.
  - `import uuid` (line 5) — never referenced; leftover from removed code.
  - `from fastapi.security import OAuth2PasswordBearer` (line 12) — never referenced; the `OAuth2PasswordBearer` instantiation was removed in a prior cycle but the import statement was never cleaned up. This was previously reported as Cycle 11 L‑1 and Cycle 15 L‑1 and remains open.
- **Impact**: Minor code clutter; no runtime effect.
- **Fix**: Remove the three unused import statements.

#### L‑2: `haversine` formula does not clamp intermediate value `a` to [0, 1]
- **Location**: `app/routers/data.py`, lines 216–225
- **Description**: The `_haversine` function computes `a = sin²(dφ/2) + cos(φ₁)cos(φ₂)sin²(dλ/2)`. Due to floating‑point rounding, `a` can become slightly greater than 1 for antipodal points (e.g., `1.0000000000000002`). The subsequent `math.sqrt(1 - a)` then raises `ValueError: math domain error`. While the `nearby` endpoint limits `radius_km` to ≤ 500, making antipodal points unreachable in practice, the function is a general utility and lacks defensive clamping.
- **Impact**: Edge‑case crash if the radius limit is ever increased or the function is reused elsewhere.
- **Fix**: Clamp `a` before the square root: `a = min(1.0, max(0.0, a))`.

#### L‑3: `extract_api_key` performs redundant `token.lower()` on every character iteration
- **Location**: `app/dependencies.py`, line 109
- **Description**: `all(c in "0123456789abcdef" for c in token.lower())` calls `token.lower()` 64 times (once per character) instead of once. For a 64‑character token this is 63 redundant string allocations.
- **Impact**: Negligible micro‑performance overhead, but violates zero‑tolerance best‑practice standards.
- **Fix**: Hoist `token_lower = token.lower()` before the generator expression.

#### L‑4: `global_exception_handler` omits `X-Request-ID` from error responses
- **Location**: `app/main.py`, lines 124–143
- **Description**: The `request_id_middleware` sets `response.headers["X-Request-ID"]` on successful responses. However, when an unhandled exception occurs, the `global_exception_handler` constructs a brand‑new `JSONResponse` and does **not** copy the `request_id` into the response headers. This breaks request correlation for 500‑class errors in production debugging.
- **Impact**: Log‑to‑response correlation is lost for unhandled exceptions.
- **Fix**: Add `response.headers["X-Request-ID"] = request_id` before returning the `JSONResponse` in the global exception handler.

---

*End of report.*
