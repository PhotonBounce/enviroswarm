# QA Cycle 26 — Backend Review

**Status**: ❌ FAIL — Critical and High issues found
**Total issues**: 8 (3 Critical + 5 High)
**Scope**: All Python files in `backend/app/`
**Date**: 2026-07-01

---

## Critical Issues

### 1. Missing import causes complete `/me` endpoint breakage
- **Severity**: Critical
- **File**: `backend/app/routers/auth.py`, line 324
- **Issue**: The `/me` endpoint depends on `rate_limit_dependency`, but `routers/auth.py` only imports `check_rate_limit` from `app.dependencies`. At runtime, `NameError: name 'rate_limit_dependency' is not defined` will be raised on the first request to `GET /api/v1/auth/me`, making the endpoint completely unusable.
- **Fix**: Add `rate_limit_dependency` to the import:
  ```python
  from app.dependencies import check_rate_limit, rate_limit_dependency
  ```
  Or change the endpoint to use `get_current_user` (already imported):
  ```python
  async def me(user: User = Depends(get_current_user)) -> StandardResponse:
  ```

### 2. Subscription tier upgrade is silently lost (detached ORM object)
- **Severity**: Critical
- **File**: `backend/app/routers/billing.py`, line 122
- **Issue**: `user` is the cached `User` instance from `rate_limit_dependency`'s `db` session. After that dependency finishes, its session is closed and the `user` object becomes **detached**. Inside the `subscribe` endpoint, `db` is a *new* session from `get_db`. Setting `user.tier = body.tier` on the detached object is **not tracked** by the new session, so `await db.commit()` only persists the new `Subscription` row — the user's `tier` column is never updated in the database. The customer pays but never receives the upgraded tier.
- **Fix**: Use the locked user row fetched within the router's session:
  ```python
  result = await db.execute(select(User).where(User.id == user.id).with_for_update())
  locked_user = result.scalar_one_or_none()
  locked_user.tier = body.tier
  await db.commit()
  ```

### 3. Payment verification is a stub — subscription fraud possible
- **Severity**: Critical
- **File**: `backend/app/routers/billing.py`, line 59
- **Issue**: `_verify_payment_intent` only checks `payment_intent_id.startswith("pi_")`. It does **not** verify with the actual payment gateway (Stripe or otherwise). An attacker can create a subscription with any fake string like `"pi_fake_123"` and immediately gain paid-tier privileges without paying.
- **Fix**: Integrate real payment gateway verification. For Stripe, replace the stub with:
  ```python
  import stripe
  stripe.api_key = settings.stripe_secret_key
  try:
      intent = stripe.PaymentIntent.retrieve(payment_intent_id)
      return intent.status == "succeeded"
  except stripe.error.InvalidRequestError:
      return False
  ```
  Gate the entire subscription creation on this returning `True`.

---

## High Issues

### 4. X-Forwarded-For uses leftmost (spoofable) IP — rate limit bypass
- **Severity**: High
- **File**: `backend/app/dependencies.py`, lines 249–258
- **Issue**: When the direct client is a private/loopback IP (i.e., behind a reverse proxy), the code takes `forwarded.split(",")[0].strip()` — the **leftmost** IP in the chain. This is the client-supplied, easily spoofed value. An attacker can send `X-Forwarded-For: 1.2.3.4` and get a fresh IP-based rate limit bucket on every request, effectively bypassing rate limits on unauthenticated endpoints (e.g., `/login`, `/register`).
- **Fix**: Use the **rightmost** untrusted IP (or the last IP before your known proxy). For a single known proxy, use the last element:
  ```python
  if forwarded:
      client_ip = forwarded.split(",")[-1].strip()
  ```
  If you have multiple proxies, maintain a `TRUSTED_PROXIES` list and walk backwards from the right.

### 5. Refresh token rate limit applied after decode — invalid tokens bypass it
- **Severity**: High
- **File**: `backend/app/routers/auth.py`, lines 198–265
- **Issue**: The `/refresh` endpoint calls `decode_refresh_token` (expensive JWT crypto + DB revocation check) **before** applying `check_rate_limit`. An attacker can flood the endpoint with forged/expired refresh tokens and never hit the rate limit, causing a CPU-intensive DoS.
- **Fix**: Apply a cheap pre-auth rate limit (e.g., IP-based or raw-token-hash based) **before** decoding:
  ```python
  client_ip = request.client.host if request.client else "unknown"
  if not await check_rate_limit(f"refresh:ip:{client_ip}", "/auth/refresh", 20):
      raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many refresh attempts")
  ```
  Keep the existing user-level limit after successful decode for rotation safety.

### 6. Email unique constraint blocks re-registration of soft-deleted users
- **Severity**: High
- **File**: `backend/app/models.py`, line 60
- **Issue**: `UniqueConstraint("email", name="uq_users_email")` does not exclude soft-deleted users. The `register` endpoint also checks all users (including `deleted_at IS NOT NULL`) and returns 409. Once a user is soft-deleted, their email can never be reused — a permanent data lockout / business logic bug.
- **Fix**: Replace the blanket unique constraint with a partial unique index that excludes soft-deleted users:
  ```python
  from sqlalchemy import func, Index
  __table_args__ = (
      Index("ix_users_email_active", func.lower(email), unique=True, postgresql_where=deleted_at.is_(None)),
  )
  ```
  And update the `register` check to only look at non-deleted users.

### 7. Stale `user.tier` used after row lock — race condition on tier limits
- **Severity**: High
- **Files / Lines**:
  - `backend/app/routers/stations.py`, line 42
  - `backend/app/routers/ingest.py`, line 120
  - `backend/app/routers/apikeys.py`, line 47
- **Issue**: In all three endpoints, a `SELECT ... FOR UPDATE` is acquired on the user row to prevent race conditions, but then the code uses `user.tier` from the **cached/detached** `User` object (from `rate_limit_dependency`) instead of the freshly locked row. If the user's tier was changed between the initial auth fetch and the lock acquisition, the wrong limit is enforced (e.g., old free-tier limit applied even though the user just upgraded to pro).
- **Fix**: Store the locked user result and read `tier` from it:
  ```python
  result = await db.execute(select(User).where(User.id == user.id).with_for_update())
  locked_user = result.scalar_one_or_none()
  # ... use locked_user.tier instead of user.tier ...
  ```

### 8. JWT algorithm accepts `"none"` — potential auth bypass if misconfigured
- **Severity**: High
- **File**: `backend/app/config.py`, line 30
- **Issue**: `algorithm: str = "HS256"` has no validation. If an operator or attacker sets `ALGORITHM=none` in the environment, PyJWT will accept **unsigned** tokens, leading to complete authentication bypass.
- **Fix**: Add a Pydantic validator to reject `"none"` and whitelist only secure algorithms:
  ```python
  from pydantic import field_validator

  @field_validator("algorithm", mode="after")
  @classmethod
  def validate_algorithm(cls, v: str) -> str:
      v_lower = v.lower()
      if v_lower == "none":
          raise ValueError("JWT algorithm 'none' is insecure and not allowed")
      allowed = {"HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "ES256", "ES384", "ES512"}
      if v_lower not in allowed:
          raise ValueError(f"Unsupported JWT algorithm: {v}")
      return v_lower
  ```

---

## Summary

| Severity | Count | Summary |
|----------|-------|---------|
| Critical | 3 | Broken `/me` endpoint, lost subscription tier upgrade, stub payment verification |
| High | 5 | XFF spoofing, refresh pre-rate-limit, email re-registration lockout, stale tier race condition, algorithm misconfig |
| **Total** | **8** | |

**Next steps**: Address all Critical issues before the next release. The High issues should be fixed in the same sprint; they affect security, rate-limiting correctness, and data integrity.
