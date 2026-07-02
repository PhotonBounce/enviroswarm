# QA Cycle 25 — Backend Review

**Status**: 🔴 FAIL — Critical + High issues found.
**Total issues**: 9 (1 Critical, 1 High, 5 Medium, 1 Low)
**Scope**: All Python files in `backend/app/`
**Date**: 2026-07-01

---

## Critical Issues

### 1. Billing endpoint upgrades users without payment verification
- **Severity**: Critical
- **File**: `backend/app/routers/billing.py`, lines 59–112
- **Issue**: The `/subscribe` endpoint creates a `Subscription` with `payment_status="completed"` and immediately upgrades `user.tier` without any payment gateway integration, webhook verification, or transaction check. Any authenticated user can call `POST /api/v1/subscribe` with `"tier": "enterprise"` and instantly gain enterprise privileges (more stations, higher rate limits, longer retention).
- **Impact**: Tier escalation vulnerability — free privilege escalation to paid tiers.
- **Fix**: Integrate a real payment provider (e.g., Stripe). Do not set `payment_status="completed"` until the payment gateway confirms success via a webhook or synchronous API call. Mark the subscription as `pending` until verified.

---

## High Issues

### 2. Timing attack on login enables user enumeration
- **Severity**: High
- **File**: `backend/app/auth.py`, line 39
- **Issue**: The login endpoint uses a dummy bcrypt hash with `rounds=4` for non-existent users (`_DUMMY_HASH`), while real user hashes are generated with `rounds=12` (`hash_password`). `bcrypt.checkpw` on a `rounds=4` hash is significantly faster than on a `rounds=12` hash. An attacker measuring response times can distinguish between "user exists" (slow, ~100ms) and "user does not exist" (fast, ~1ms), enabling email enumeration.
- **Impact**: Email enumeration → targeted password attacks.
- **Fix**: Generate the dummy hash with the same cost factor as production hashes:
  ```python
  _DUMMY_HASH = hash_password("dummy")  # uses rounds=12
  ```

---

## Medium Issues

### 3. `check_rate_limit` may leak 500 on impossible race condition
- **Severity**: Medium
- **File**: `backend/app/dependencies.py`, lines 50–57
- **Issue**: In the `except IntegrityError` retry block inside `check_rate_limit`, if the re-query returns `entry is None`, the code executes bare `raise` which re-raises `IntegrityError` as an unhandled 500 error instead of a controlled rate-limit response.
- **Fix**: Replace `raise` with a retry loop or return `True` (allow the request) rather than leaking a database exception.

### 4. Registration endpoint allows targeted user enumeration
- **Severity**: Medium
- **File**: `backend/app/routers/auth.py`, lines 95–102
- **Issue**: The `register` endpoint returns `409 CONFLICT` with `detail="Email already registered"` when an email exists. Although rate-limited (3 per IP), an attacker can still probe specific email addresses to confirm registration.
- **Fix**: Return a generic `400` or `200` response (e.g., "If this email is not registered, a confirmation has been sent") regardless of whether the email exists.

### 5. Daily reading limit uses `updated_at` instead of `created_at`
- **Severity**: Medium
- **File**: `backend/app/routers/ingest.py`, line 114
- **Issue**: The daily reading count query filters on `SensorReading.updated_at >= today_start`. Because `updated_at` has `onupdate=func.now()`, any future update to a reading (e.g., soft-delete, metadata patch) would bump its `updated_at` and cause it to be re-counted against the daily limit. The `SensorReading` model lacks a `created_at` column.
- **Fix**: Add a `created_at` column to `SensorReading` (or use `timestamp` if it represents ingestion time) and query against that immutable column.

### 6. `request_id` middleware does not sanitize header input
- **Severity**: Medium
- **File**: `backend/app/main.py`, lines 79–87
- **Issue**: The `request_id_middleware` takes the raw `X-Request-ID` header value and echoes it back in `response.headers["X-Request-ID"]`. If a client injects a newline or control character, it could facilitate HTTP response splitting or header injection on older proxies.
- **Fix**: Sanitize the header before echoing, e.g.:
  ```python
  request_id = re.sub(r"[^\w\-]", "", request_id)
  ```

### 7. `X-Forwarded-For` first-IP selection is spoofable
- **Severity**: Medium
- **File**: `backend/app/dependencies.py`, lines 248–258
- **Issue**: When the direct client is a private IP, the code uses `forwarded.split(",")[0].strip()` as the client IP. The first IP in the `X-Forwarded-For` chain is the easiest to forge (the client can prepend arbitrary IPs). A trusted proxy should append the real client IP, so the correct value is typically the **last** IP added by the trusted proxy (or the second-to-last in the chain), not the first.
- **Fix**: Maintain a `TRUSTED_PROXY_COUNT` config and use the Nth IP from the end of the chain, or use a dedicated proxy library (e.g., `ProxyHeadersMiddleware` from Uvicorn/Traefik) rather than custom parsing.

---

## Low Issues

### 8. `get_current_user` cookie fallback may not inject `Request`
- **Severity**: Low
- **File**: `backend/app/auth.py`, lines 198–217
- **Issue**: `get_current_user` declares `request: Optional[Request] = None`. FastAPI may not inject `Request` when it is typed as `Optional` with a default of `None`. If this dependency is used anywhere, the cookie fallback branch (`if request:`) would be silently skipped, breaking cookie-based authentication for that endpoint. (Note: not currently used in reviewed endpoints, but it is exported.)
- **Fix**: Change the signature to `request: Request` (remove `Optional` and default) so FastAPI always injects it.

---

## Notes

- **Race conditions on tier limits** (`apikeys.py`, `stations.py`, `ingest.py`, `billing.py`) were carefully analyzed. Each endpoint acquires a `SELECT ... FOR UPDATE` lock on the `users` row before checking the child-table count. In PostgreSQL, this serializes concurrent requests for the same user, so the count is accurate by the time the insert occurs. No separate HIGH issue was raised for this pattern.
- **No N+1 queries** were found; all list endpoints use single-query `select()` with explicit pagination counts.
- **No missing transactions** were found; all write endpoints commit appropriately and use rollback on integrity errors.
- **No auth bypass** was found; JWT type checks, revoked-token checks, and soft-delete checks are all correctly implemented.
- **No SQL injection** vectors were found; all queries use SQLAlchemy parameterized expressions.
