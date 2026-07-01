# ENViroSwarm Backend — QA Cycle 17 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 2 |
| **Low** | 6 |
| **Total** | **8** |

---

## Fix Verification (QA Cycles 1–16)

All **Critical** fixes from Cycles 1–16 are verified present and structurally correct.  
All **High** fixes from Cycles 1–16 are verified present and structurally correct.  
The majority of **Medium** and **Low** fixes are verified present and correct.  
One lingering **Low** issue from prior cycles remains open (see L‑1 below).

---

## Issues Found

### Medium

#### M‑1: Expired idempotency keys block legitimate reinsertion
- **Location**: `app/routers/ingest.py`, lines 37–48 and 148–162  
- **Description**: The initial idempotency check and the `IntegrityError` catch block both filter by `IdempotencyKey.expires_at > datetime.now(timezone.utc)`. If an old idempotency key has expired (TTL = 5 minutes) but has not yet been cleaned up, the initial check returns `None`, so the request proceeds to insert a new key. The `INSERT` violates the unique constraint `uq_idempotency_user_key`. The catch block also filters by `expires_at > now`, fails to find the expired key, and raises `HTTPException(409, "Idempotency conflict or duplicate key")`. A client reusing a key after its TTL therefore receives a spurious 409 instead of normal processing.  
- **Impact**: Legitimate retry requests are rejected after the idempotency TTL expires.  
- **Fix**: In the `IntegrityError` catch block, also check for an **expired** key with `expires_at <= now`; if found, delete it and retry the transaction. Alternatively, delete expired keys proactively before the initial lookup.

#### M‑2: `StationUpdateRequest` model validator allows partial coordinates when both fields are present but one is null
- **Location**: `app/schemas.py`, lines 111–117  
- **Description**: The `validate_latitude_longitude` model validator on `StationUpdateRequest` only checks whether `"latitude"` and `"longitude"` are present in `model_fields_set`. It does **not** validate the actual values. A client sending `{"latitude": 40.0, "longitude": null}` passes validation because both fields are in `model_fields_set`, then the endpoint sets `station.latitude = 40.0` and `station.longitude = None`, leaving the station in an inconsistent geographic state. By contrast, `StationCreateRequest` has a field validator on `longitude` that enforces `(lat is not None) == (lon is not None)`.  
- **Impact**: PATCH requests can corrupt station data with partial coordinates.  
- **Fix**: Add a value check inside the `StationUpdateRequest` model validator (or a separate field validator) to ensure that when both fields are present, they are both non‑null or both null: `if lat_set and lon_set and (self.latitude is not None) != (self.longitude is not None): raise ValueError(...)`.

---

### Low

#### L‑1: Lingering — Missing DB-level unique partial index on active subscriptions
- **Location**: `app/routers/billing.py`, line 72  
- **Description**: The TODO comment `CREATE UNIQUE INDEX uq_active_subscription ON subscriptions(user_id) WHERE deleted_at IS NULL AND end_date >= NOW()` remains. Application-level locking (`with_for_update()` on the user row) and `MultipleResultsFound` handling prevent most race conditions, but the database lacks a final defense-in-depth constraint against duplicate active subscriptions.  
- **Fix**: Add the unique partial index in an Alembic migration.

#### L‑2: `except Exception:` catches intentionally raised `HTTPException` from `except IntegrityError` block
- **Location**: `app/routers/ingest.py`, lines 167–169  
- **Description**: The `except IntegrityError` block raises `HTTPException(409)` or `HTTPException(500)` when an idempotency conflict or unexpected database error occurs. The outer `except Exception:` block immediately catches these `HTTPException` instances and calls `await db.rollback()` again before re-raising. This is redundant (the session was already rolled back inside the `IntegrityError` handler) and violates the principle that broad exception handlers should not swallow specific HTTP exceptions.  
- **Fix**: Change `except Exception:` to `except Exception as exc:` and short-circuit `if isinstance(exc, HTTPException): raise` before the redundant rollback.

#### L‑3: `logout` endpoint does not clear expired access token cookies when no refresh token is present
- **Location**: `app/routers/auth.py`, lines 223–264  
- **Description**: If the access token (from header or cookie) is expired, `decode_access_token` raises `HTTPException`, which is caught and `token_found` remains `False`. If no refresh token is available, the function reaches the final `return` without ever calling `response.delete_cookie()`. The stale `access_token` cookie therefore remains in the browser.  
- **Fix**: Clear cookies whenever `access_token` or `refresh_token` is present in the request, regardless of whether the tokens are valid or expired.

#### L‑4: Authenticated endpoints do not rate-limit unauthenticated requests
- **Location**: `app/dependencies.py`, lines 214–236  
- **Description**: `rate_limit_dependency` depends on `get_current_user_or_api_key`, which raises `401` before the rate limit is ever evaluated. An attacker can send unlimited unauthenticated requests to authenticated endpoints (e.g., `/api/v1/data`, `/api/v1/stations`) without triggering any rate-limit counter. While `/register` and `/login` have their own `check_rate_limit` guards, the remaining authenticated surface is unprotected against unauthenticated abuse.  
- **Fix**: Apply rate limiting independently of authentication (e.g., by IP address for unauthenticated requests) or ensure `check_rate_limit` is invoked before the auth dependency.

#### L‑5: `request_id_middleware` does not validate `X-Request-ID` header length
- **Location**: `app/main.py`, lines 76–84  
- **Description**: The middleware accepts any client-provided `X-Request-ID` string and propagates it directly into logs and the response header. A client could send a multi-kilobyte request ID, causing log bloat and unnecessarily large response headers.  
- **Fix**: Reject or truncate request IDs exceeding a reasonable length (e.g., 64 characters) before storing them in `request.state`.

#### L‑6: `logout` endpoint uses case-sensitive `Bearer` check for Authorization header
- **Location**: `app/routers/auth.py`, lines 233–234  
- **Description**: `auth_header.startswith("Bearer ")` and `auth_header.replace("Bearer ", "")` are case-sensitive. If a client sends `Authorization: bearer <token>` (lowercase), the logout endpoint fails to extract the access token, while all other endpoints (`get_current_user_or_api_key`, `get_current_user`) handle the scheme case-insensitively. This creates an inconsistent API contract.  
- **Fix**: Use `auth_header.lower().startswith("bearer ")` and `auth_header[7:].strip()` to match the pattern used in the rest of the codebase.

---

*End of report.*
