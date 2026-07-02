# QA Cycle 24 — Backend Review

**Status**: ❌ FAIL — Critical + High issues found
**Total issues**: 5 (2 Critical, 3 High)
**Scope**: All Python files in `backend/app/`
**Date**: 2026-07-01
**Reviewer**: Senior QA Engineer — Zero-Defect Review

---

## Critical Issues

### C1: Cookie-based authentication completely broken for all non-auth endpoints
- **Severity**: Critical
- **File**: `backend/app/dependencies.py`, `backend/app/auth.py`
- **Issue**: `get_current_user_or_api_key` (the auth dependency used by `rate_limit_dependency` on every protected endpoint) only checks the `Authorization` header and the `X-API-Key` header. It never reads the `access_token` httpOnly cookie. The `get_current_user` function in `auth.py` does implement cookie fallback, but it is **dead code** — imported in `routers/auth.py` but never wired as a dependency in any endpoint. Therefore, web clients that authenticate via cookies (set by `/login` and `/refresh`) cannot access any protected endpoint except `/auth/login`, `/auth/refresh`, and `/auth/logout`.
- **Fix**: Add cookie fallback to `get_current_user_or_api_key` in `dependencies.py` (lines 122–211), mirroring the logic in `auth.py:get_current_user` (lines 197–216):
  ```python
  cookie_token = request.cookies.get("access_token")
  if cookie_token:
      return await _get_user_from_token(cookie_token, db)
  ```
  Or, better yet, remove the dead `get_current_user` and merge cookie support into `get_current_user_or_api_key` to ensure all auth paths support cookies consistently.

### C2: Refresh token rotation race condition allows concurrent replay
- **Severity**: Critical
- **File**: `backend/app/routers/auth.py` (lines 179–242)
- **Issue**: The `/auth/refresh` endpoint decodes the refresh token (line 193), creates new tokens (lines 222–223), and only then revokes the old token (lines 225–231). Because revocation happens in a separate session and is not part of a transaction that locks the token, two concurrent requests with the same valid refresh token can both:
  1. Pass `decode_refresh_token` before either revocation is committed.
  2. Both issue new token pairs.
  3. Both attempt to revoke; the second gets `IntegrityError` (already revoked) and handles it gracefully.
  This allows an attacker with a stolen refresh token to obtain multiple valid access/refresh token pairs from a single refresh token, breaking the token rotation security guarantee.
- **Fix**: Wrap the entire refresh flow (decode → user lookup → create new tokens → revoke old token) in a single database transaction with a `SELECT ... FOR UPDATE` on the user row or a dedicated token-rotation lock row. Ensure the old token is revoked **before** the new tokens are returned to the client. Alternatively, store a `rotation_jti` counter on the `User` model and atomically increment it during refresh.

---

## High Issues

### H1: Rate-limiting `FOR UPDATE` lock held without explicit release on rejection
- **Severity**: High
- **File**: `backend/app/dependencies.py` (lines 33–77)
- **Issue**: In `check_rate_limit`, when the limit is exceeded (`entry.count >= limit`), the function returns `False` at line 73 without calling `session.commit()` or `session.rollback()`. The session context manager will eventually close and release the PostgreSQL `FOR UPDATE` lock, but under high concurrency this causes unnecessary lock contention and can lead to connection-pool starvation or deadlocks as many requests queue on the same row lock.
- **Fix**: Add an explicit `await session.rollback()` before returning `False` at line 73, or better yet, avoid `SELECT ... FOR UPDATE` entirely for rate limiting and use an atomic `INSERT ... ON CONFLICT` or `UPDATE ... RETURNING` pattern to reduce lock contention.

### H2: `ingest` endpoint allows readings for stations deleted during request
- **Severity**: High
- **File**: `backend/app/routers/ingest.py` (lines 59–78)
- **Issue**: The `ingest` endpoint validates station ownership and status at lines 62–68 but does not acquire row locks (`with_for_update()`) on the matched `SensorStation` rows. A concurrent `delete_station` request (which soft-deletes the station and its readings) can execute between the validation and the `db.commit()` at line 153. Because the `SensorStation` row still exists (only `deleted_at` is set), the foreign key constraint on `SensorReading.station_id` is not violated, and readings are successfully inserted for a station that the user no longer owns. The `ingest` count query later excludes soft-deleted stations, but the damage (orphan readings for a deleted station) is already done.
- **Fix**: Add `.with_for_update()` to the `select(SensorStation)` query at line 62, or acquire the user row lock earlier and move the station validation after it. Example:
  ```python
  result = await db.execute(
      select(SensorStation).where(
          SensorStation.id.in_(station_ids),
          SensorStation.user_id == user.id,
          SensorStation.status == "active",
          SensorStation.deleted_at.is_(None),
      ).with_for_update()
  )
  ```

### H3: Missing IP-based rate limiting on login endpoint
- **Severity**: High
- **File**: `backend/app/routers/auth.py` (lines 128–176)
- **Issue**: The `/auth/login` endpoint only applies per-email rate limiting (`check_rate_limit(f"login:{body.email}", "/auth/login", 5)`). There is no IP-based rate limiting. An attacker can distribute a credential-stuffing attack across thousands of email addresses (or proxy IPs) and make an unbounded number of login attempts without ever hitting a rate limit, because each email gets its own 5-attempt bucket per minute. This completely undermines the brute-force protection.
- **Fix**: Add an IP-based rate limit check before the email-based check, similar to the registration endpoint:
  ```python
  client_ip = request.client.host if request.client else "unknown"
  forwarded = request.headers.get("X-Forwarded-For")
  if forwarded:
      from ipaddress import ip_address
      try:
          addr = ip_address(client_ip)
          if addr.is_private or addr.is_loopback:
              client_ip = forwarded.split(",")[0].strip()
      except ValueError:
          pass
  if not await check_rate_limit(f"login:ip:{client_ip}", "/auth/login", 20):
      raise HTTPException(
          status_code=status.HTTP_429_TOO_MANY_REQUESTS,
          detail="Too many login attempts from this IP.",
      )
  ```
  (Tune the IP limit threshold to your risk model; a value of 20–60 per minute is typical.)

---

## Medium / Low Issues (Noted for completeness)

No Medium or Low issues are reported in this cycle, as the primary goal is Zero Critical + High. The issues above must be addressed before the backend can pass QA.

---

## Summary

| # | Severity | File | Issue | Owner |
|---|----------|------|-------|-------|
| C1 | Critical | `dependencies.py`, `auth.py` | Cookie auth never checked in `get_current_user_or_api_key`; `get_current_user` is dead code | Auth |
| C2 | Critical | `routers/auth.py` | Refresh token rotation race allows concurrent replay | Auth |
| H1 | High | `dependencies.py` | Rate-limit `FOR UPDATE` lock not released on rejection | Rate Limiting |
| H2 | High | `routers/ingest.py` | Station validation without row lock allows ingest to deleted stations | Ingest |
| H3 | High | `routers/auth.py` | No IP-based rate limit on login enables credential stuffing | Auth |

**Action Required**: Fix all Critical and High issues, re-run this QA review, and confirm Zero Critical/High before release.
