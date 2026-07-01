# ENViroSwarm Data Pipeline — QA Cycle 18 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 1 |
| **Low** | 8 |
| **Total** | **9** |

## Issues Found

### Medium

#### M1 — `mqtt/subscriber.py`: `_start_worker` Returns Stale Worker Thread Reference

- **Location:** `mqtt/subscriber.py`, lines 129–180 (`_start_worker`) and 204–218 (`_drain_and_shutdown`)
- **Description:** `_start_worker` returns the original worker thread `t` (line 180). If the watcher detects that `t` has died and respawns a new worker (lines 174–175), the local `t` variable is updated via `nonlocal`, but the returned reference is never updated in the caller. When `start_subscriber` later passes this stale reference to `_drain_and_shutdown`, `worker_thread.join()` returns immediately because the original thread is already dead. The new (respawned) worker thread is never joined. Since the new worker is a daemon thread, `sys.exit(0)` in the signal handler can terminate the process while the new worker is in the middle of forwarding a message to the ingest API, causing silent data loss on shutdown.
- **Impact:** Potential data loss on graceful shutdown if the worker thread was ever respawned by the watcher.
- **Fix Direction:** Return a mutable container (e.g., a `dict` or `list` of length 1) that holds the current worker thread reference, so the watcher can update it and the caller can always access the live thread.

### Low

#### L1 — `seed_demo.py`: `_station_limit_from_pricing` Implementation Deviates from QA Cycle 17 Prescribed Fix

- **Location:** `seed_demo.py`, lines 160–165
- **Description:** QA Cycle 17 prescribed an explicit null check: `stations = item.get("stations"); return stations if stations is not None else 1`. The current code uses `return item.get("stations") or 1`, which treats `0` as falsy and returns `1` instead of `0`. This deviates from the prescribed fix and is semantically incorrect if a pricing tier legitimately has a station limit of `0`.
- **Impact:** Incorrect station limit for tiers with `0` stations.
- **Fix Direction:** Use the explicit null check as prescribed: `stations = item.get("stations"); return stations if stations is not None else 1`.

#### L2 — `requirements.txt`: `urllib3` Missing Upper Bound

- **Location:** `data-pipeline/requirements.txt`, line 3
- **Description:** QA Cycle 17 prescribed `urllib3>=1.21.1,<3.0`. The current file has `urllib3>=2.0.0` with no upper bound. This violates dependency management best practices and could break the pipeline if `urllib3` v3 introduces breaking changes.
- **Impact:** Fragile dependency graph; future `urllib3` upgrades could break the seeder or subscriber.
- **Fix Direction:** Add an upper bound: `urllib3>=2.0.0,<3.0`.

#### L3 — `seed_demo.py`: `run_seed` Does Not Close `requests.Session`

- **Location:** `seed_demo.py`, `run_seed` (lines 382, 510)
- **Description:** `run_seed` creates a `requests.Session` via `_make_session()` but never calls `session.close()`. This leaves HTTP connection pool resources unreleased. If `run_seed` is invoked multiple times in the same process, this leaks connections and can eventually exhaust the connection pool.
- **Impact:** Resource leak; potential connection exhaustion on repeated calls.
- **Fix Direction:** Ensure `session.close()` is called before `run_seed` returns, ideally using a `try/finally` or context manager.

#### L4 — `mqtt/subscriber.py`: `start_subscriber` Does Not Close `requests.Session`

- **Location:** `mqtt/subscriber.py`, `start_subscriber` (lines 260, 284)
- **Description:** `start_subscriber` creates a `requests.Session` but never calls `session.close()`. On graceful shutdown, the session is not explicitly closed, leaving connections in the pool in a `CLOSE_WAIT` state.
- **Impact:** Resource leak on shutdown.
- **Fix Direction:** Call `session.close()` in `_drain_and_shutdown` or before returning from `start_subscriber`.

#### L5 — `reading_generator.py`: `generate_readings_for_station` Does Not Validate `days`

- **Location:** `reading_generator.py`, lines 157–185
- **Description:** The function validates `interval_minutes`, `missing_rate`, and `outlier_rate`, but does not validate `days`. If `days` is negative, `start_time` is in the future, and the `while current <= end_time` loop produces no readings silently instead of raising a clear error.
- **Impact:** Silent empty result for invalid input.
- **Fix Direction:** Add `if days < 0: raise ValueError("days must be >= 0")` at the top of the function.

#### L6 — `station_factory.py`: `create_station` Does Not Validate `city_name`

- **Location:** `station_factory.py`, lines 53–76
- **Description:** `create_station` accesses `CITY_CLUSTERS[city_name]` without validating that `city_name` exists in the dictionary. An invalid city name raises an unhandled `KeyError` instead of a meaningful `ValueError`.
- **Impact:** Unhandled `KeyError` for invalid input.
- **Fix Direction:** Add `if city_name not in CITY_CLUSTERS: raise ValueError(f"Unknown city: {city_name}")` before accessing the dict.

#### L7 — `station_factory.py`: `create_stations` Does Not Validate `total` or `per_city`

- **Location:** `station_factory.py`, lines 79–110
- **Description:** `create_stations` accepts `total` and `per_city` without validation. Negative values produce an empty list silently, and `per_city=0` produces `total=0`.
- **Impact:** Silent empty result for invalid input.
- **Fix Direction:** Add `if total < 0: raise ValueError("total must be >= 0")` and `if per_city is not None and per_city < 0: raise ValueError("per_city must be >= 0")`.

#### L8 — `mqtt/publisher.py`: `disconnect()`/`loop_stop()` Not Wrapped in `try/except`

- **Location:** `mqtt/publisher.py`, lines 108–109
- **Description:** `mqtt/subscriber.py` wraps `client.disconnect()` and `client.loop_stop()` in a `try/except` (lines 212–216) to prevent shutdown crashes from unhandled exceptions. `mqtt/publisher.py` performs the same operations without protection. If `disconnect()` or `loop_stop()` raises an exception (e.g., network already closed, client in invalid state), the exception propagates to the caller and may crash the calling code.
- **Impact:** Unhandled exception during publisher cleanup.
- **Fix Direction:** Wrap `disconnect()` and `loop_stop()` in a `try/except` similar to `subscriber.py`.

---

## Previous Fix Verification

### QA Cycle 17 Deviations

| Issue | Prescribed Fix | Current Implementation | Status |
|-------|---------------|----------------------|--------|
| **L1** — `meta.get("total")` null safety | `meta.get("total") or 0` | `meta.get("total") or 0` at line 209 | ✅ Fixed |
| **L2** — `_station_limit_from_pricing` null safety | `return stations if stations is not None else 1` | `return item.get("stations") or 1` at line 164 | ⚠️ Deviation — treats `0` as falsy (see **L1** above) |
| **L3** — `urllib3` direct dependency | `urllib3>=1.21.1,<3.0` | `urllib3>=2.0.0` at line 3 (no upper bound) | ⚠️ Deviation — missing upper bound, different lower bound (see **L2** above) |

### QA Cycles 2–16 Verification

All fixes from QA Cycles 2–16 were verified present and correct in the current `main` branch.

| Cycle | Issue | Status | Verification Location |
|-------|-------|--------|----------------------|
| **16** | M1 — `_drain_and_shutdown` stop_event ordering | ✅ Fixed | `mqtt/subscriber.py:204–217` — callers no longer set `stop_event` before calling; `_drain_and_shutdown` sets it internally |
| **16** | L1 — `batch_size` validation misplaced | ✅ Fixed | `seed_demo.py:360–361` — validation now occurs BEFORE `start_time = time.time()` (line 363) |
| **15** | All Cycle 14 fixes | ✅ Verified | `seed_demo.py`, `subscriber.py` |
| **14** | L1 — `start_subscriber` `run_duration_seconds` validation | ✅ Fixed | `mqtt/subscriber.py:257–258` |
| **14** | L2 — `main()` `args.days` validation | ✅ Fixed | `seed_demo.py:679` |
| **14** | L3 — `main()` `args.email` validation | ✅ Fixed | `seed_demo.py:681` |
| **14** | L4 — `main()` `args.tier` validation | ✅ Fixed | `seed_demo.py:683` |
| **13** | M1 — Subscriber retries narrowed to `ConnectionError`/`Timeout` | ✅ Fixed | `mqtt/subscriber.py:116–125` |
| **13** | L1 — `isinstance(body, dict)` guards in `_unwrap`/`list_stations` | ✅ Fixed | `seed_demo.py:90, 198` |
| **13** | L2 — `try/except` around `client.disconnect()`/`loop_stop()` | ✅ Fixed | `mqtt/subscriber.py:212–216` |
| **13** | L3 — CLI `args.run_duration` validation | ✅ Fixed | `mqtt/subscriber.py:388–389` |
| **13** | L4 — Publisher `readings=None` guard | ✅ Fixed | `mqtt/publisher.py:43–44` |
| **13** | L5 — CLI `args.batch_size` validation | ✅ Fixed | `seed_demo.py:689–690` |
| **13** | L6 — `run_seed` parameter validation | ✅ Fixed | `seed_demo.py:344–361` |
| **13** | L7 — `start_subscriber` input validation | ✅ Fixed | `mqtt/subscriber.py:247–258` |
| **13** | L8 — Unused `urllib3`/`HTTPAdapter` imports removed | ✅ Fixed | `mqtt/subscriber.py` (absent) |
| **12** | C1 — Subscriber idempotency `AttributeError` | ✅ Fixed | `mqtt/subscriber.py:78` — `hashlib.sha256(raw_json).hexdigest()` (no extra `.encode()`) |
| **12** | M1 — Timed-run `KeyboardInterrupt` handler | ✅ Fixed | `mqtt/subscriber.py:301–309` |
| **12** | M2 — Production mosquitto template | ✅ Fixed | `mqtt/config/mosquitto.conf.production` exists with `allow_anonymous false`, `password_file`, TLS comments |
| **12** | L1 — Unused `import random` in `seed_demo.py` | ✅ Fixed | `seed_demo.py` (absent) |
| **12** | L2 — Unused `import uuid` in `seed_demo.py` | ✅ Fixed | `seed_demo.py` (absent) |
| **12** | L3 — Unused `import uuid` in `subscriber.py` | ✅ Fixed | `mqtt/subscriber.py` (absent) |
| **12** | L4 — `password: Optional[str]` type hint | ✅ Fixed | `seed_demo.py:334` |
| **12** | L5 — Publisher disconnect order | ✅ Fixed | `mqtt/publisher.py:108–109` — `disconnect()` before `loop_stop()` |
| **11** | M1–M4 | ✅ Fixed | Import-time password crash, PM10≥PM25 enforcement, deterministic idempotency, `RuntimeError` catch in batch loop |
| **11** | L1–L8 | ✅ Fixed | Docstrings, microsecond truncation, MQTT directories, step numbering, URL helper, global mutation, duration validation, README docs |
| **10** | H1, M1–M7, L1–L7 | ✅ Fixed | Duplicate auth block, 2xx check, double retry, disconnect order, interval validation, rate validation, WQI/humidity clamp, mosquitto user, no hardcoded password, gzip threshold, temp upper clamp, name suffix, gitignore pycache, healthcheck `-d`, input validation |
| **6** | H1–H5 | ✅ Fixed | README password, env-var credentials, reentrant API base, local solar time, safe env parsing |
| **2** | C1–C6, H7–H15 | ✅ Fixed | Password, tier registration, lat/lon keys, ingest envelope, subscriber auth, subscriber envelope, correlation precompute, additive outliers, async subscriber, cleanup, retry adapter, tier cascading, paho-mqtt pin, rate limiting |

---

*Report generated by QA Cycle 18 review. No fixes applied.*
*Date: 2026-07-01 PDT*
