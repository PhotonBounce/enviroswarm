# ENViroSwarm Backend — QA Cycle 11 Review Report

**Reviewer:** Senior QA Engineer  
**Scope:** `backend/app/` and `backend/tests/`  
**Date:** 2026-07-01  
**Repo:** `D:/photonbounce/enviroswarm` (branch `main`)  

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 1 |
| **Medium** | 4 |
| **Low** | 2 |
| **Total** | **7** |

All **Critical** and **High** issues from prior QA Cycles 1–10 are verified fixed. The remaining findings are 1 new High issue, 3 new Medium issues, 1 lingering Medium issue from Cycle 10, and 2 Low issues (1 new, 1 lingering from Cycle 10).

---

## Fix Verification (Cycles 1–10)

### Critical — All Verified Fixed (7 / 7)

| Cycle ID | Issue | Verification |
|----------|-------|------------|
| C1 | Missing `import uuid` in `app/auth.py` | `import uuid` present at line 5. ✅ |
| C2 | Missing `import uuid` in `app/routers/auth.py` | `from uuid import UUID` present at line 6. ✅ |
| C3 | Missing `import uuid` in `app/dependencies.py` | `import uuid` present at line 6. ✅ |
| C4 | `data.py` endpoints missing API key read permissions | `require_permission("read")` added to `query_data` and `nearby`. ✅ |
| C5 | `apikeys.py` `create_api_key` missing write permission | `require_permission("write")` added. ✅ |
| C6 | `IdempotencyKey.key_hash` column too short for app value | Column is `String(64)`; app hashes with SHA-256 hex (64 chars). ✅ |
| C7 | `IdempotencyKey` missing unique constraint | `UniqueConstraint("user_id", "key_hash")` present. ✅ |

### High — All Verified Fixed (10 / 10)

| Cycle ID | Issue | Verification |
|----------|-------|------------|
| H1 | Missing rate limiting on `stations`, `apikeys`, `billing` | `rate_limit_dependency` applied to all endpoints in all routers. ✅ |
| H2 | `test_ingest.py` stale timestamp fails retention | Test uses `datetime.now(timezone.utc).isoformat()`. ✅ |
| H3 | Missing tests for `apikeys`, `billing`, `data` | `test_apikeys.py`, `test_billing.py`, `test_data.py` added. ✅ |
| H4 | Missing DB indexes on high-cardinality columns | Indexes added on `sensor_stations` and `sensor_readings`. ✅ |
| H5 | `SensorReadingPayload.timestamp` accepts naive datetimes | `validate_timestamp` normalizes naive to UTC. ✅ |
| H6 | `UserRegisterRequest` schema missing password complexity | `validate_password_complexity` field validator added. ✅ |
| H7 | `HTTPException` responses not matching `StandardResponse` | Global `http_exception_handler` rewrites all HTTPExceptions. ✅ |
| H8 | `IdempotencyKey` check constraint can fail on clock skew | Constraint changed to `expires_at >= created_at`. ✅ |
| H9 | `refresh` endpoint missing rate limiting | `check_rate_limit` added before token issuance. ✅ |
| H10 | `register` endpoint missing rate limiting | `check_rate_limit` added before duplicate check. ✅ |

### Medium & Low — Verified Fixed

All remaining Medium and Low issues from previous cycles have been verified fixed, including: refresh-token blacklisting (`_refresh_token_blacklist` + `jti` revocation), transactional idempotency (DB `IdempotencyKey` table within same session), cascade soft-delete on readings (`update(SensorReading).values(deleted_at=now)`), shared crypto helpers (`app/utils/crypto.py`), lazy engine factory (`get_engine()` / `get_sessionmaker()`), dead code removal (`SensorTypeValidator`, `get_current_user_optional`), `key_prefix` length alignment (`String(8)`), request-ID middleware (`X-Request-ID`), rate-limit eviction (`_evict_rate_limit_entries`), `PRICING_TIERS` set lookup, `StationCreateRequest` deduplication, `unit` validation against `ACCEPTED_UNITS`, `value` bounds (`abs(v) < 1e9`), pole guard on `nearby` bounding box (`lon_margin` capped at `180.0`), `health` endpoint DB ping, `jti` generation using `secrets.token_urlsafe`, `expires_at` validation in `ApiKeyCreateRequest`, `query_data`/`list_stations` regex patterns on query params, `create_all` guard (`if settings.environment == "development"`), cookie `secure` dynamic binding (`settings.is_production`), and `get_current_user` parameter type hint (`Optional[Request]`).

---

## Issues Found

### High

#### H1 — `ApiKeyCreateRequest.validate_expires_at` uses `mode="before"` on a `datetime` field, causing unhandled 500 on string input
**File:** `app/schemas.py` (lines 249–258)  
**Severity:** High  
**New in Cycle 11**  
**Description:** The `expires_at` field is declared as `Optional[datetime]`. The validator is decorated with `mode="before"`, which means it receives the raw JSON input before Pydantic's type coercion. When the client sends a JSON string (e.g., `"2025-01-01T00:00:00Z"`), the validator receives a `str` object, not a `datetime`. The expression `v.tzinfo is None` raises `AttributeError: 'str' object has no attribute 'tzinfo'`, resulting in an unhandled 500 error instead of a proper 422 validation error.  
**Fix:** Change `mode="before"` to `mode="after"` so the validator receives the already-coerced `datetime` object, matching the pattern used by `validate_timestamp` on `SensorReadingPayload`.

---

### Medium

#### M1 — `ingest.py` `except IntegrityError` catch-all returns misleading 409 when idempotency key is present but error is not from idempotency constraint
**File:** `app/routers/ingest.py` (lines 148–165)  
**Severity:** Medium  
**Lingering from:** Cycle 10 (M1) — **NOT FIXED**  
**Description:** The `except IntegrityError` block assumes that any `IntegrityError` occurring when an `idempotency_key` is present must be a duplicate idempotency key. However, if the error originates from another constraint (e.g., the `ck_idempotency_expires_after_created` check constraint due to DB/app clock skew, or a future constraint on `SensorReading`), the endpoint still returns `409 "Idempotency conflict or duplicate key"`. This misleads the client and obscures the real root cause.  
**Fix:** Narrow the `if` condition to only return 409 when `str(exc.orig)` explicitly contains `"uq_idempotency_user_key"`; otherwise return 500 for unexpected integrity errors.

#### M2 — `nearby` endpoint sorts stations with `distance_km=0.0` to the end due to Python truthiness bug
**File:** `app/routers/data.py` (line 202)  
**Severity:** Medium  
**New in Cycle 11**  
**Description:** The sort key `lambda x: x["distance_km"] or float("inf")` treats `0.0` as falsy because it evaluates with Python's `or` operator. Any station located exactly at the query lat/lon (or within ~4 meters, where `round(d, 2) == 0.0`) is sorted to the end of the list instead of the beginning. This produces incorrect ordering for nearby queries.  
**Fix:** Remove the unnecessary `or float("inf")` guard: `nearby_stations.sort(key=lambda x: x["distance_km"])` (the field is never `None` in this context).

#### M3 — `query_data` aggregation response incorrectly returns `avg_value: None` when the true average is exactly 0
**File:** `app/routers/data.py` (line 98)  
**Severity:** Medium  
**New in Cycle 11**  
**Description:** The aggregation response builder uses `round(r.avg_value, 6) if r.avg_value else None`. Because `0` (and `Decimal('0')` and `0.0`) are falsy in Python, any time-bucket whose readings average exactly 0 will have `"avg_value": null` in the JSON response instead of `0`. This corrupts data integrity for legitimate zero-average readings (e.g., a temperature sensor reporting exactly 0°C for an hour).  
**Fix:** Use `r.avg_value is not None` instead of truthiness: `round(r.avg_value, 6) if r.avg_value is not None else None`.

#### M4 — `register` and `login` endpoints do not normalize email case, allowing duplicate accounts and login failures
**File:** `app/routers/auth.py` (lines 66–69, 102–109)  
**Severity:** Medium  
**New in Cycle 11**  
**Description:** Both the duplicate-email check (`User.email == body.email`) and the login lookup (`User.email == body.email`) perform case-sensitive comparisons. This allows a user to register `user@example.com` and `User@example.com` as two separate accounts. It also causes login failures if the user types their email in a different case than they registered with. This violates standard email-handling best practice and creates a data-integrity risk.  
**Fix:** Normalize `body.email` to lowercase (e.g., `body.email.lower()`) before storing and before querying. Consider adding a functional unique index on `lower(email)` in the model.

---

### Low

#### L1 — Unused `OAuth2PasswordBearer` import in `dependencies.py`
**File:** `app/dependencies.py` (line 11)  
**Severity:** Low  
**Lingering from:** Cycle 10 (L3) — **partially fixed, import remains**  
**Description:** The `OAuth2PasswordBearer` class is imported but never referenced anywhere in the module. The instantiation was removed in a prior cycle, but the import statement itself was left behind, creating dead code and a minor maintenance burden.  
**Fix:** Remove the unused import.

#### L2 — `StationUpdateRequest` schema does not enforce latitude/longitude pair consistency
**File:** `app/schemas.py` (lines 78–109) and `app/routers/stations.py` (lines 116–151)  
**Severity:** Low  
**New in Cycle 11**  
**Description:** `StationCreateRequest` has a validator (`validate_latitude_longitude`) that enforces both coordinates are present or both are omitted. `StationUpdateRequest` lacks this validator, so a `PATCH` request can set `latitude` without `longitude` (or vice versa), leaving the station in a geographically inconsistent state. The same validation logic should apply to partial updates.  
**Fix:** Add a `model_validator` or `field_validator` on `StationUpdateRequest` that mirrors the `StationCreateRequest` latitude/longitude consistency check.

---

*End of report.*
