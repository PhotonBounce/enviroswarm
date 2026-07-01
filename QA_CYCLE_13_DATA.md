# ENViroSwarm Data Pipeline — QA Cycle 13 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 1 |
| **Low** | 8 |
| **Total** | **9** |

## Previous Fix Verification

All fixes from QA Cycles 2–12 were verified present and correct in the current `main` branch:

| Cycle | Issue | Status | Notes |
|-------|-------|--------|-------|
| 12 | C1 — Subscriber idempotency `AttributeError` | **Fixed** | `hashlib.sha256(raw_json).hexdigest()` is correct |
| 12 | M1 — Timed-run `KeyboardInterrupt` handler | **Fixed** | `try/except KeyboardInterrupt` wraps `time.sleep` in both branches |
| 12 | M2 — Production mosquitto template | **Fixed** | `mosquitto.conf.production` exists with `allow_anonymous false`, `password_file`, and TLS comments |
| 12 | L1 — Unused `import random` in `seed_demo.py` | **Fixed** | Import removed |
| 12 | L2 — Unused `import uuid` in `seed_demo.py` | **Fixed** | Import removed |
| 12 | L3 — Unused `import uuid` in `subscriber.py` | **Fixed** | Import removed |
| 12 | L4 — `password: str = DEMO_PASSWORD` type hint | **Fixed** | Changed to `Optional[str]` |
| 12 | L5 — Publisher disconnect order | **Fixed** | `client.disconnect()` before `client.loop_stop()` |
| 11 | M1–M4 | **Fixed** | Import-time password crash, PM10≥PM25 enforcement, deterministic idempotency, RuntimeError catch in batch loop |
| 11 | L1–L8 | **Fixed** | Docstrings, microsecond truncation, MQTT directories, step numbering, URL helper, global mutation, duration validation, README docs |
| 10 | H1, M1–M7, L1–L7 | **Fixed** | Duplicate auth block, 2xx check, double retry, disconnect order, interval validation, rate validation, WQI/humidity clamp, mosquitto user, no hardcoded password, gzip threshold, temp upper clamp, name suffix, gitignore pycache, healthcheck `-d`, input validation |
| 6 | H1–H5 | **Fixed** | README password, env-var credentials, reentrant API base, local solar time, safe env parsing |
| 2 | C1–C6, H7–H15 | **Fixed** | Password, tier registration, lat/lon keys, ingest envelope, subscriber auth, subscriber envelope, correlation precompute, additive outliers, async subscriber, cleanup, retry adapter, tier cascading, paho-mqtt pin, rate limiting |

---

## Issues Found

### Medium

#### M1 — `subscriber.py`: `_post_with_retry` Retries on Permanent Request Errors
- **Location:** `mqtt/subscriber.py`, lines 120–127
- **Description:** The `except requests.RequestException` block retries on **any** request exception, including permanent errors such as `InvalidURL`, `InvalidSchema`, `MissingSchema`, and `TooManyRedirects`. This causes the subscriber to waste up to 7+ seconds per message on unrecoverable configuration errors instead of failing fast. Best practice is to retry only on transient errors (`ConnectionError`, `Timeout`, `ChunkedEncodingError`) and the designated HTTP status codes.
- **Fix Direction:** Narrow the exception handling to `requests.ConnectionError` and `requests.Timeout`, or inspect the exception type before retrying.

### Low

#### L1 — `seed_demo.py`: `_unwrap` and `list_stations` Assume JSON Response Is a Dict
- **Location:** `seed_demo.py`, lines 86–96 and 196–198
- **Description:** Both `_unwrap` and `list_stations` call `resp.json()` and immediately invoke `.get()` on the result without verifying `isinstance(body, dict)`. If the backend ever returns a non-dict JSON payload (e.g., a list or scalar), an `AttributeError` is raised, crashing the seeder during error-handling paths.
- **Fix Direction:** Add `isinstance(body, dict)` guards before calling `.get()` on parsed JSON.

#### L2 — `subscriber.py`: `_drain_and_shutdown` Doesn't Catch Exceptions During Client Cleanup
- **Location:** `mqtt/subscriber.py`, lines 206–216
- **Description:** `client.disconnect()` and `client.loop_stop()` are called bare. If the client is in an unexpected state (e.g., already disconnected or the network loop has crashed), these calls may raise exceptions, causing the subscriber to exit with a traceback instead of completing graceful shutdown.
- **Fix Direction:** Wrap `client.disconnect()` and `client.loop_stop()` in a `try/except Exception` block with a logged warning.

#### L3 — `subscriber.py`: `main()` Doesn't Validate `args.run_duration`
- **Location:** `mqtt/subscriber.py`, lines 365–369 and 290–301
- **Description:** The `--run-duration` CLI argument is not validated. A negative value causes `time.sleep` to raise `ValueError: sleep length must be non-negative`. A value of `0.0` is falsy, so the `if run_duration_seconds:` branch is skipped and the subscriber enters the infinite-loop branch instead of stopping immediately.
- **Fix Direction:** Add validation: `if args.run_duration is not None and args.run_duration < 0: raise ValueError("run_duration must be >= 0")`.

#### L4 — `publisher.py`: `publish_readings` Doesn't Handle `readings=None`
- **Location:** `mqtt/publisher.py`, line 75
- **Description:** The function begins iterating over `readings` without checking for `None`. Passing `None` raises `TypeError: 'NoneType' object is not iterable`.
- **Fix Direction:** Add a guard at the top: `if readings is None: readings = []`.

#### L5 — `seed_demo.py`: `main()` Doesn't Validate `args.batch_size`
- **Location:** `seed_demo.py`, lines 600–605
- **Description:** While `run_seed` validates `batch_size > 0`, the CLI `main()` does not, creating an inconsistency with every other numeric argument (`stations`, `days`, `batch_delay`, `ingest_timeout`, `duration_months`). A user passing `--batch-size 0` receives a `ValueError` raised deep inside `run_seed` rather than at the CLI boundary.
- **Fix Direction:** Add `if args.batch_size <= 0: raise ValueError("batch_size must be > 0")` in `main()`.

#### L6 — `seed_demo.py`: `run_seed` Lacks Input Validation for Most Parameters
- **Location:** `seed_demo.py`, lines 318–333
- **Description:** `run_seed` is a public API function that only validates `batch_size`. If called programmatically with invalid values (e.g., `stations=0`, `days=-1`, `ingest_timeout=-5`), the function may produce misleading output or fail deep in the call stack rather than failing fast at the entry point.
- **Fix Direction:** Add defensive validation at the top of `run_seed` for `stations`, `days`, `batch_delay`, `ingest_timeout`, `email`, `password`, `tier`, and `duration_months`.

#### L7 — `subscriber.py`: `start_subscriber` Lacks Input Validation for Most Parameters
- **Location:** `mqtt/subscriber.py`, lines 219–230
- **Description:** `start_subscriber` is a public API function that delegates all validation to `main()`. If called programmatically with invalid values (e.g., `broker_port=-1`, `max_queue_size=0`, `ingest_timeout=-1`), the function may fail with unclear, deep-stack errors.
- **Fix Direction:** Add defensive validation at the top of `start_subscriber` for `broker_port`, `max_queue_size`, `ingest_timeout`, `max_retries`, and `run_duration_seconds`.

#### L8 — `subscriber.py`: Unused Imports and Unused Module-Level Constants
- **Location:** `mqtt/subscriber.py`, lines 21–25
- **Description:**
  - `from urllib3.util.retry import Retry` is imported but never referenced.
  - `from requests.adapters import HTTPAdapter` is imported but never referenced.
  - `API_BASE = "http://localhost:8000"` is defined but never used (defaults are literal strings in `start_subscriber` and `main()`).
  - `TOPIC_PREFIX = "enviroswarm/sensors/#"` is defined but never used (same reason).
- **Fix Direction:** Remove the unused imports and constants, or reference them in the default parameter values.

---
*Report generated by QA Cycle 13 review. No fixes applied.*
