# ENViroSwarm Backend — QA Cycle 21 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 2 |
| **Low** | 6 |
| **Total** | **8** |

---

## Previous Fixes Verification (QA Cycles 1–20)

All **Critical** fixes from Cycles 1–20 are verified present and structurally correct.  
All **High** fixes from Cycles 1–20 are verified present and structurally correct.  
The majority of **Medium** and **Low** fixes from Cycles 1–20 are verified present and correct.

### Fixes from QA Cycle 20 — Verified Present ✅

| Cycle 20 Issue | Description | Status | Notes |
|----------------|-------------|--------|-------|
| **H-1** | Missing `IntegrityError` import in `auth.py` | ✅ **Fixed** | `from sqlalchemy.exc import IntegrityError` is present at line 14. |
| **M-2** | `/subscribe` returns 402, tests expect 200 | ✅ **Fixed** | All affected tests now assert `402` or `409`. |
| **L-3** | `__pycache__` in repository | ⚠️ **Partially fixed** | Files are no longer tracked by Git (`git ls-files` returns 0), but `__pycache__` directories remain in the working tree. |
| **L-4** | `http_exception_handler` omits `X-Request-ID` | ✅ **Fixed** | Header is set at `main.py:123`. |
| **L-5** | `validation_exception_handler` omits `X-Request-ID` | ✅ **Fixed** | Header is set at `main.py:134`. |
| **L-6** | `RefreshTokenRequest` requires `refresh_token` | ✅ **Fixed** | `refresh_token: Optional[str] = None` at `schemas.py:57`. |
| **L-7** | `Subscription.payment_status` constraint mismatch | ❌ **Not fixed** | Constraint still omits `'completed'` (see M-2 below). |

### Fixes from QA Cycles 1–19 — Verified Present ✅

All prior defensive patterns are verified present and correct: soft-delete hygiene, database-backed rate limiting with `with_for_update()`, transactional idempotency with `IntegrityError` recovery, API key prefix-indexed lookup with `hmac.compare_digest`, JWT hardening (short-lived access tokens, refresh-token JTI revocation, httpOnly cookies), email normalization and case-insensitive duplicate handling, bcrypt dummy-hash timing equalization, password complexity, production safety (global exception handler, hidden docs, CORS restrictions), input validation (Pydantic v2 bounds, regex, whitelists, NaN rejection), and all Cycle 18/19 structural fixes.

---

## Issues Found

### Medium

#### 1. `test_auth.py:32` — `test_register_and_login` asserts `200` for `/register` but endpoint returns `201`

**Location:** `backend/tests/test_auth.py:32`  
**Description:** The `register` endpoint was fixed in Cycle 19 to return `201 Created` (`@router.post(..., status_code=status.HTTP_201_CREATED)` at `auth.py:60`). However, the test assertion was never updated and still expects `200`. This causes a guaranteed test failure when the suite is run.  
**Impact:** CI/test pipeline failure on the auth test suite.  
**Fix:** Change `assert r.status_code == 200` to `assert r.status_code == 201`.

#### 2. `app/routers/ingest.py:111` — Daily reading limit counts by `timestamp` instead of insertion time, allowing limit bypass

**Location:** `app/routers/ingest.py:106–122`  
**Description:** The daily ingestion limit check queries `SensorReading.timestamp >= today_start`:
```python
today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
count_result = await db.execute(
    select(func.count(SensorReading.id))
    .join(SensorStation)
    .where(
        SensorStation.user_id == user.id,
        SensorStation.deleted_at.is_(None),
        SensorReading.deleted_at.is_(None),
        SensorReading.timestamp >= today_start,
    )
)
```
Because `today_count` only counts readings whose *sensor timestamp* is today, a user can bypass the intended daily ingestion limit by sending readings with backdated timestamps (e.g., `timestamp=yesterday`). Each request with historical timestamps will see `today_count = 0`, allowing unlimited ingestion as long as timestamps are distributed across the retention window. The limit is intended to be "readings ingested per day", not "readings with today's timestamp".  
**Impact:** Free-tier users can ingest an effectively unlimited number of readings by backdating them within the retention window.  
**Fix:** Track ingestion volume by insertion time (e.g., add a `created_at` column to `SensorReading` and count on that, or use `updated_at` which approximates insertion time for unmodified rows).

### Low

#### 3. `app/models.py:208` — `Subscription.payment_status` CheckConstraint still omits `'completed'`

**Location:** `app/models.py:208`  
**Description:** The database `CheckConstraint` allows `('pending', 'active', 'failed', 'cancelled')`, but the billing endpoint checks `if sub.payment_status != "completed"`. Because `"completed"` is **not** in the allowed set, any future code that attempts to set `payment_status = "completed"` will trigger a database `IntegrityError`. This latent mismatch was reported as Cycle 20 Low #7 and remains unaddressed.  
**Fix:** Add `"completed"` to the `CheckConstraint`.

#### 4. `backend/app/__pycache__/` and `backend/tests/__pycache__/` still present in working tree

**Location:** `backend/app/__pycache__/`, `backend/tests/__pycache__/`  
**Description:** While the files are no longer tracked by Git (`git ls-files` returns 0), the compiled Python cache directories remain in the working tree. This was reported as Cycle 19 Low #16 and Cycle 20 Low #3.  
**Fix:** `git rm -r --cached` has already been applied; now physically delete the directories from the working tree (`rm -rf backend/app/__pycache__ backend/tests/__pycache__`).

#### 5. `app/routers/auth.py:155` — `_DUMMY_HASH.decode("utf-8")` called on every failed login

**Location:** `app/routers/auth.py:39, 155`  
**Description:** The dummy bcrypt hash is stored as `bytes` at module level (`_DUMMY_HASH = bcrypt.hashpw(...)`). On every login failure, `.decode("utf-8")` is called to convert it to `str` before passing to `verify_password`. This should be done once at import time.  
**Fix:** Change line 39 to `_DUMMY_HASH = bcrypt.hashpw(b"dummy", bcrypt.gensalt()).decode("utf-8")` and remove the `.decode("utf-8")` call on line 155.

#### 6. `app/routers/auth.py:39` — `_DUMMY_HASH` computed synchronously at module import time

**Location:** `app/routers/auth.py:39`  
**Description:** `bcrypt.hashpw(b"dummy", bcrypt.gensalt())` with default rounds (12) executes at module import time. Every worker process incurs ~100 ms of startup latency for a hash that never changes.  
**Fix:** Pre-compute the hash offline or use a lower-cost salt for the dummy (e.g., `bcrypt.gensalt(rounds=4)`), since timing equalization is the only goal.

#### 7. `app/auth.py:197` — `get_current_user` parameter `request` missing `Optional` wrapper

**Location:** `app/auth.py:197`  
**Description:**
```python
async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
) -> User:
```
`request` has a default of `None` but is typed as `Request` instead of `Optional[Request]`. Type checkers and IDEs will flag `request` as non-nullable even though it can be `None`.  
**Fix:** Change to `request: Optional[Request] = None`.

#### 8. `app/routers/auth.py:257` — `logout` cookie deletion does not match original `secure` and `httponly` flags

**Location:** `app/routers/auth.py:255–258`  
**Description:**
```python
response.delete_cookie(COOKIE_SETTINGS["key"])
response.delete_cookie(REFRESH_COOKIE_SETTINGS["key"])
```
`delete_cookie` is called with only the `key` argument, defaulting to `secure=False` and `httponly=False`. The original cookies were set with `secure=settings.is_production` and `httponly=True`. In some browsers, a cookie with `Secure=True` or `HttpOnly=True` will not be deleted by a `delete_cookie` call that omits those flags.  
**Fix:** Pass the matching flags explicitly:
```python
response.delete_cookie(
    COOKIE_SETTINGS["key"],
    path="/",
    secure=settings.is_production,
    httponly=True,
    samesite="lax",
)
```
(Apply the same to `REFRESH_COOKIE_SETTINGS`.)

---

*End of report.*
