# ENViroSwarm Backend — QA Cycle 19 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 1 |
| **Medium** | 3 |
| **Low** | 13 |
| **Total** | **17** |

## Issues Found

### High

**1. Immediate tier upgrade without payment validation (`app/routers/billing.py:111`)**
The `subscribe` endpoint updates `user.tier = body.tier` before any payment is confirmed (`payment_status="pending"`). Because there is no payment processor integration or webhook validation, a free-tier user can immediately gain pro/enterprise features by calling `/subscribe` without ever paying. This is a business-logic bypass of the entire billing boundary.

---

### Medium

**2. Refresh-token revocation race condition causes 500 (`app/auth.py:140-143`)**
`revoke_refresh_token()` inserts a `RevokedToken` row using the JTI as the primary key. If two concurrent requests present the same valid refresh token, both pass `decode_refresh_token()` before either commits; the second insert raises `IntegrityError`, which propagates uncaught and results in a 500 Internal Server Error instead of a graceful "already revoked" response.

**3. Blind trust of `X-Forwarded-For` header (`app/dependencies.py:237-239`)**
The IP-based rate-limit fallback trusts the first IP in `X-Forwarded-For` without verifying that the request originates from a trusted proxy. When the service is not behind a controlled ingress, an attacker can rotate spoofed IPs to evade the per-IP rate limit on unauthenticated requests.

**4. Rate-limit dependency evaluated after auth checks on multiple endpoints**
`rate_limit_dependency` is designed to apply rate limiting *before* authentication, but on the following endpoints it is placed *after* `require_permission` / `require_tier` in the dependency chain, allowing unauthenticated requests to hit 401 **without ever being rate limited**:
- `app/routers/stations.py:21,66,95,120,157` (`create_station`, `list_stations`, `get_station`, `update_station`, `delete_station`)
- `app/routers/apikeys.py:32,85,102` (`create_api_key`, `list_api_keys`, `revoke_api_key`)
- `app/routers/billing.py:61` (`subscribe`)

---

### Low

**5. `refresh_token` endpoint does not read from httpOnly cookie (`app/routers/auth.py:165`)**
The `login` and `logout` endpoints support cookie-based tokens, but `refresh_token` only accepts the token from the JSON body. This breaks the cookie-only web-client flow and is inconsistent with the rest of the auth router.

**6. `register` returns HTTP 200 instead of 201 (`app/routers/auth.py:60`)**
RFC 9110 recommends `201 Created` for successful resource creation. The endpoint returns `200 OK`.

**7. Registration lacks global/IP-based rate limiting (`app/routers/auth.py:69`)**
Rate limiting on `/register` is keyed only by email (`register:{email}`). An attacker can bypass the 3-per-minute limit by cycling through different email addresses, enabling mass account creation.

**8. Registration leaks account state via error messages (`app/routers/auth.py:80-84`)**
The endpoint returns `"Account exists but was deleted. Contact support to restore."` for soft-deleted accounts versus `"Email already registered"` for active accounts. This allows an attacker to enumerate which emails have active vs deleted accounts.

**9. Empty `X-Idempotency-Key` treated as valid (`app/routers/ingest.py:31`)**
An empty string (`""`) passes the length check and is hashed and stored as a valid idempotency key. It should be treated as absent (`None`) when empty.

**10. API key permissions are not validated against a known schema (`app/routers/apikeys.py:62`)**
`ApiKeyCreateRequest.permissions` accepts an arbitrary `Dict[str, bool]`. The endpoint stores keys such as `{"admin": True}` even though the permission system only checks `"read"` and `"write"`. Best practice is to reject unknown permission keys at the schema level.

**11. 429 responses missing `Retry-After` header (`app/dependencies.py:244-246`)**
`rate_limit_dependency` raises `HTTPException(status_code=429)` without a `Retry-After` header, which hinders client retry logic and violates RFC 6585 best practice.

**12. API key authentication discloses key state (`app/dependencies.py:144-169`)**
Different error messages are returned for:
- Invalid key → `"Invalid API key"`
- Expired key → `"API key expired"`
- Inactive/deleted owner → `"API key owner not found or inactive"`
This allows an attacker with a suspected key to determine whether the key is expired or the owner is disabled.

**13. CORS `allow_headers` missing `X-Request-ID` (`app/main.py:70`)**
The request-ID middleware accepts and propagates `X-Request-ID`, but the CORS middleware does not list it in `allow_headers`. Cross-origin clients sending this header may be blocked by the browser's preflight check.

**14. Missing composite index on `ApiKey` (`app/models.py:174`)**
Queries such as `select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.deleted_at.is_(None))` lack a composite index on `(user_id, deleted_at)`. At scale this results in a sequential scan.

**15. Missing composite index on `Subscription` (`app/models.py:204`)**
The billing query `select(Subscription).where(user_id, deleted_at, end_date >= now)` lacks a composite index on `(user_id, deleted_at, end_date)`.

**16. Compiled Python cache files present in repository (`backend/app/__pycache__/`, `backend/tests/__pycache__/`)**
`__pycache__` directories and `.pyc` files should be excluded from version control via `.gitignore`.

**17. Weak test assertion in `test_refresh_token` (`backend/tests/test_auth.py:90`)**
```python
assert data["data"]["access_token"] != refresh_token
```
This compares the **new access token** against the **old refresh token**, which is always true and therefore meaningless. It should assert that the new access token differs from the **old access token** to verify token rotation.

---

## Previous Fixes Verification

All known defensive patterns introduced across QA Cycles 1–18 are present and correctly implemented in the current codebase. No regressions were detected:

- **Soft-delete hygiene** — `deleted_at.is_(None)` filters are applied consistently in every data-access query.
- **Rate limiting** — Database-backed per-route rate limiting with `RateLimitEntry`, `with_for_update()` serialization, and startup cleanup are present.
- **Idempotency** — Transactional idempotency key handling with SHA-256 hashing, TTL enforcement, and `IntegrityError` recovery in `ingest`.
- **API key security** — Prefix-indexed lookup, SHA-256 hashing, `hmac.compare_digest` verification, and permission gating are implemented.
- **JWT hardening** — Short-lived access tokens, refresh-token JTI revocation, `auto_error=False` OAuth2 scheme, and httpOnly cookie support.
- **Auth robustness** — Email normalization, case-insensitive duplicate handling, `bcrypt` dummy-hash timing-equalization, and password complexity validation.
- **Production safety** — Global exception handler sanitizes errors in production, `docs_url`/`redoc_url` are hidden in production, CORS is origin-restricted, and `secure`/`samesite` cookie flags are set dynamically.
- **Race-condition mitigation** — `with_for_update()` is used in tier-limit checks (stations, API keys, readings, billing).
- **Input validation** — Pydantic v2 schemas enforce bounds, regex patterns, and sensor-type/unit whitelists.

