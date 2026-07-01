# ENViroSwarm Backend — QA Cycle 20 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 1 |
| **Medium** | 1 |
| **Low** | 5 |
| **Total** | **7** |

---

## Issues Found

### High

**1. Missing `IntegrityError` import breaks refresh-token revocation race-condition fix (`app/auth.py:145`)**

`revoke_refresh_token()` wraps `session.commit()` in `try/except IntegrityError:` to gracefully handle concurrent refresh-token revocation (QA Cycle 19 Medium issue #2). However, `IntegrityError` is imported only in `app/dependencies.py` and `app/routers/ingest.py`, **not** in `app/auth.py`. When the race condition occurs and `session.commit()` raises `IntegrityError`, Python attempts to match the exception against the `except` clause type; because `IntegrityError` is undefined in `auth.py` scope, a `NameError` is raised instead, masking the original exception and still producing a 500 Internal Server Error. The structural fix is present but is **functionally broken** at runtime.

- **Location**: `app/auth.py:140–148`
- **Root cause**: `from sqlalchemy.exc import IntegrityError` is missing from `auth.py` imports.
- **Impact**: Concurrent refresh-token usage still crashes with 500 instead of the intended graceful "already revoked" handling.

---

### Medium

**2. `/subscribe` endpoint returns 402 for all requests, breaking multiple tests that expect 200 (`app/routers/billing.py:111`)**

The QA Cycle 19 fix for the unpaid tier-upgrade bypass correctly added a payment-status gate before `user.tier = body.tier`. However, because `payment_status` is hardcoded to `"pending"` at creation and the check is `if sub.payment_status != "completed"`, the endpoint **always** raises `402 Payment Required`. The subscription row is committed to the database before the 402 is raised, so subsequent retries hit the duplicate-subscription check and return `409 Conflict`. The fix is **correct** from a security standpoint, but the test suite was never updated to match the new behavior, causing a broad test regression.

Affected tests that assert `status_code == 200` for `/subscribe`:
- `backend/tests/test_billing.py:51` (`test_subscribe`)
- `backend/tests/test_billing.py:63` (`test_subscribe_duplicate` — first call)
- `backend/tests/test_apikeys.py:53` (`pro_client` fixture — all `pro_client` tests fail)
- `backend/tests/test_data.py:136` (`test_query_data_with_api_key`)
- `backend/tests/test_ingest.py:188` (`test_ingest_api_key_without_write_permission`)

- **Location**: `app/routers/billing.py:111–118`, plus the five test locations above.
- **Impact**: Any test run or CI pipeline will fail on the billing and pro-tier fixtures. No user can ever reach pro/enterprise tier in the current test environment.

---

### Low

**3. `__pycache__` and `.pyc` files still tracked in the repository**

`.gitignore` correctly excludes `__pycache__` and `*.pyc`, but the compiled cache directories (`backend/app/__pycache__/`, `backend/tests/__pycache__/`, and various `.pyc` files) remain in the working tree and are tracked by Git. This was reported as QA Cycle 19 issue #16 and is **still not fixed**.

- **Location**: `backend/app/__pycache__/`, `backend/tests/__pycache__/`

**4. `HTTPException` handler omits `X-Request-ID` response header (`app/main.py:116`)**

The `request_id_middleware` injects `X-Request-ID` into successful responses. The `global_exception_handler` also adds it for unhandled 500 errors. However, the `http_exception_handler` (for 4xx errors) constructs a bare `JSONResponse` without copying the request ID, breaking log-to-response correlation for client errors.

- **Location**: `app/main.py:116–121`

**5. `RequestValidationError` handler omits `X-Request-ID` response header (`app/main.py:124`)**

Same omission as issue #4: the 422 validation-error handler does not propagate the request ID header.

- **Location**: `app/main.py:124–129`

**6. `RefreshTokenRequest` schema requires `refresh_token`, preventing true cookie-only refresh (`app/routers/auth.py:179`, `app/schemas.py:56`)**

The QA Cycle 19 fix added cookie fallback (`body.refresh_token or request.cookies.get("refresh_token")`), but the Pydantic schema still declares `refresh_token: str` as a **required** field. A web client sending `POST /api/v1/auth/refresh` with no JSON body (cookie-only flow) will receive `422 Unprocessable Entity` before the endpoint logic is ever reached. The client must send an empty body (`{}`) or `{"refresh_token": ""}` to bypass the schema and trigger the cookie fallback. The fix is **incomplete**.

- **Location**: `app/routers/auth.py:181`, `app/schemas.py:56–57`
- **Fix**: Make `refresh_token` optional in the schema: `refresh_token: Optional[str] = None`.

**7. `Subscription.payment_status` constraint and billing logic use mismatched values (`app/models.py:207`, `app/routers/billing.py:112`)**

The database `CheckConstraint` allows `('pending', 'active', 'failed', 'cancelled')`. The billing endpoint checks `if sub.payment_status != "completed"`. Because `"completed"` is **not** in the allowed set, the condition is tautologically always true. This latent mismatch will cause a database integrity error if any future code attempts to set `payment_status = "completed"`.

- **Location**: `app/models.py:207`, `app/routers/billing.py:112`

---

## Previous Fixes Verification

### Fixes from QA Cycles 1–18 — Verified Present ✅

| Category | Fix | Status |
|----------|-----|--------|
| **Soft-delete hygiene** | `deleted_at.is_(None)` filters on all data-access queries | ✅ Correct |
| **Rate limiting** | Database-backed `RateLimitEntry`, `with_for_update()`, startup cleanup | ✅ Correct |
| **Idempotency** | Transactional idempotency with SHA-256 hashing, TTL, `IntegrityError` recovery | ✅ Correct |
| **API key security** | Prefix-indexed lookup, SHA-256 hashing, `hmac.compare_digest`, permission gating | ✅ Correct |
| **JWT hardening** | Short-lived access tokens, refresh-token JTI revocation, `auto_error=False`, httpOnly cookies | ✅ Correct |
| **Auth robustness** | Email normalization, case-insensitive duplicate handling, bcrypt dummy-hash timing-equalization, password complexity | ✅ Correct |
| **Production safety** | Global exception handler sanitizes 500s, `docs_url`/`redoc_url` hidden in production, CORS origin restriction, dynamic `secure`/`samesite` cookies | ✅ Correct |
| **Race-condition mitigation** | `with_for_update()` on user row in station/API-key/reading/billing limit checks | ✅ Correct |
| **Input validation** | Pydantic v2 schemas enforce bounds, regex patterns, sensor-type/unit whitelists, NaN rejection, partial-coordinate rejection | ✅ Correct |
| **Cycle 18 Critical** | `rate_limit_dependency` passes `X-API-Key` header to `get_current_user_or_api_key` | ✅ Correct |
| **Cycle 18 Medium** | `RequestValidationError` handler returns `StandardResponse` envelope | ✅ Correct |
| **Cycle 18 Low** | Unused imports removed from `dependencies.py`, haversine `a` clamped, `token_lower` hoisted, `X-Request-ID` in global handler | ✅ Correct |
| **Cycles 1–17** | All defensive patterns (imports, schema bounds, indexes, side sessions, cookie max_age, aggregation buckets, etc.) | ✅ Correct |

### Fixes from QA Cycle 19 — Partial / Broken ⚠️

| Cycle 19 Issue | Description | Status | Notes |
|----------------|-------------|--------|-------|
| **H-1** | Unpaid tier upgrade prevented | ✅ **Present** | `402` gate added before `user.tier = body.tier`. Correct. |
| **M-2** | Refresh-token revocation race condition | ⚠️ **Broken** | `try/except IntegrityError` structure is present, but `IntegrityError` is **not imported** in `auth.py`, causing `NameError` on race. |
| **M-3** | Blind trust of `X-Forwarded-For` | ✅ **Present** | Code now uses last IP in chain and checks `is_private`/`is_loopback`. Improved from Cycle 19 description. |
| **M-4** | Rate-limit dependency order | ✅ **Present** | `rate_limit_dependency` is now first in every endpoint dependency chain. |
| **L-5** | Refresh token cookie fallback | ⚠️ **Incomplete** | Endpoint reads cookie, but `RefreshTokenRequest` schema still requires `refresh_token` in body, blocking true cookie-only flow. |
| **L-6** | Register returns 200 instead of 201 | ✅ **Present** | `@router.post(..., status_code=status.HTTP_201_CREATED)` is present. |
| **L-7** | Registration lacks IP-based rate limiting | ✅ **Present** | `register:global:{client_ip}` limit is present. |
| **L-8** | Registration leaks account state | ✅ **Present** | Unified `"Email already registered"` message for all duplicate cases. |
| **L-9** | Empty `X-Idempotency-Key` treated as valid | ✅ **Present** | `if not idempotency_key:` rejects empty string. |
| **L-10** | API key permissions not validated | ✅ **Present** | Schema validator rejects unknown permission keys. |
| **L-11** | 429 missing `Retry-After` header | ✅ **Present** | `headers={"Retry-After": "60"}` is present. |
| **L-12** | API key auth discloses key state | ✅ **Present** | Single generic `"Invalid or expired API key"` message. |
| **L-13** | CORS missing `X-Request-ID` | ✅ **Present** | Included in `allow_headers`. |
| **L-14** | Missing composite index on `ApiKey` | ✅ **Present** | `Index("ix_apikeys_user_deleted", "user_id", "deleted_at")` present. |
| **L-15** | Missing composite index on `Subscription` | ✅ **Present** | `Index("ix_subscriptions_user_deleted_end", "user_id", "deleted_at", "end_date")` present. |
| **L-16** | `__pycache__` in repository | ❌ **Not fixed** | Files still present in working tree despite `.gitignore` exclusion. |
| **L-17** | Weak test assertion in `test_refresh_token` | ✅ **Present** | Correctly asserts `new_access_token != old_access_token`. |

---

*End of report.*
