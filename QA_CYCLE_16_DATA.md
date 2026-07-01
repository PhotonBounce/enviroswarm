# ENViroSwarm Data Pipeline — QA Cycle 16 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 1 |
| **Low** | 1 |
| **Total** | **2** |

## Issues Found

### Medium

#### M1 — `mqtt/subscriber.py`: `_drain_and_shutdown` Does Not Actually Drain the Queue

- **Location:** `mqtt/subscriber.py`, `_drain_and_shutdown` (lines 204–217) and all callers (`SIGTERM` handler at line 276–280, `KeyboardInterrupt` handler at lines 306–309 and 318–321, timed-run completion at lines 310–312).
- **Description:** Every shutdown path sets `stop_event` **before** calling `_drain_and_shutdown`. The worker thread checks `stop_event.is_set()` at the top of its `while` loop (line 144). Once `stop_event` is set, the worker exits immediately after finishing its current in-flight item (if any). It does **not** consume any remaining items from the queue. The `_drain_and_shutdown` function then polls `q.empty()` for up to `timeout` seconds, but since the worker is no longer running, the queue never empties unless it was already empty. The function waits the full timeout and proceeds, leaving all queued messages abandoned. This is silent data loss on every graceful shutdown.
- **Impact:** MQTT messages that have been received but not yet forwarded to the ingest API are lost on shutdown. The function name and docstring (“Gracefully drain the queue”) are misleading.
- **Fix Direction:** Either keep the worker running until the queue is empty (e.g., pass a separate “finish_queue” flag to the worker, or only set `stop_event` after the queue is drained), or rename the function and docstring to accurately reflect that it only waits for the current in-flight request to finish.

### Low

#### L1 — `seed_demo.py`: `batch_size` Validation Misplaced in `run_seed`

- **Location:** `seed_demo.py`, `run_seed` (lines 372–373).
- **Description:** All other parameter validations (`stations`, `days`, `batch_delay`, `ingest_timeout`, `email`, `password`, `tier`, `duration_months`) are performed at the top of `run_seed` before any side effects (lines 344–359). However, `batch_size` is validated **after** `start_time = time.time()` and `summary = {...}` have already been initialized. This is inconsistent with defensive programming best practices, where all input validation should be completed before any work or state initialization.
- **Impact:** Minor — if `batch_size <= 0` is passed programmatically, the function raises `ValueError` after having already recorded `start_time`, which is technically harmless but sloppy.
- **Fix Direction:** Move `if batch_size <= 0: raise ValueError(...)` to line 359, immediately after the `duration_months` validation and before `start_time = time.time()`.

---

## Previous Fix Verification

All fixes from QA Cycles 2–15 were verified present and correct in the current `main` branch.

| Cycle | Issue | Status | Verification Location |
|-------|-------|--------|----------------------|
| 15 | All Cycle 14 fixes | ✅ Verified | `seed_demo.py`, `subscriber.py` |
| 14 | L1 — `start_subscriber` `run_duration_seconds` validation | ✅ Fixed | `mqtt/subscriber.py:256` |
| 14 | L2 — `main()` `args.days` validation | ✅ Fixed | `seed_demo.py:682` |
| 14 | L3 — `main()` `args.email` validation | ✅ Fixed | `seed_demo.py:684` |
| 14 | L4 — `main()` `args.tier` validation | ✅ Fixed | `seed_demo.py:685` |
| 13 | M1 — Subscriber retries narrowed to `ConnectionError`/`Timeout` | ✅ Fixed | `mqtt/subscriber.py:116–125` |
| 13 | L1 — `isinstance(body, dict)` guards in `_unwrap`/`list_stations` | ✅ Fixed | `seed_demo.py:86–98, 196–198` |
| 13 | L2 — `try/except` around `client.disconnect()`/`loop_stop()` | ✅ Fixed | `mqtt/subscriber.py:212–216` |
| 13 | L3 — CLI `args.run_duration` validation | ✅ Fixed | `mqtt/subscriber.py:391–392` |
| 13 | L4 — Publisher `readings=None` guard | ✅ Fixed | `mqtt/publisher.py:43–44` |
| 13 | L5 — CLI `args.batch_size` validation | ✅ Fixed | `seed_demo.py:691–692` |
| 13 | L6 — `run_seed` parameter validation | ✅ Fixed | `seed_demo.py:344–359` |
| 13 | L7 — `start_subscriber` input validation | ✅ Fixed | `mqtt/subscriber.py:248–257` |
| 13 | L8 — Unused `urllib3`/`HTTPAdapter` imports removed | ✅ Fixed | `mqtt/subscriber.py` (absent) |
| 12 | C1 — Subscriber idempotency `AttributeError` | ✅ Fixed | `mqtt/subscriber.py:78` |
| 12 | M1 — Timed-run `KeyboardInterrupt` handler | ✅ Fixed | `mqtt/subscriber.py:301–309` |
| 12 | M2 — Production mosquitto template | ✅ Fixed | `mqtt/config/mosquitto.conf.production` |
| 12 | L1 — Unused `import random` removed | ✅ Fixed | `seed_demo.py` (absent) |
| 12 | L2 — Unused `import uuid` removed | ✅ Fixed | `seed_demo.py` (absent) |
| 12 | L3 — Unused `import uuid` in subscriber removed | ✅ Fixed | `mqtt/subscriber.py` (absent) |
| 12 | L4 — `password: Optional[str]` type hint | ✅ Fixed | `seed_demo.py:334` |
| 12 | L5 — Publisher disconnect order | ✅ Fixed | `mqtt/publisher.py:108–109` |
| 11 | M1–M4 | ✅ Fixed | Import-time password crash, PM10≥PM25 enforcement, deterministic idempotency, `RuntimeError` catch in batch loop |
| 11 | L1–L8 | ✅ Fixed | Docstrings, microsecond truncation, MQTT directories, step numbering, URL helper, global mutation, duration validation, README docs |
| 10 | H1, M1–M7, L1–L7 | ✅ Fixed | Duplicate auth block, 2xx check, double retry, disconnect order, interval validation, rate validation, WQI/humidity clamp, mosquitto user, no hardcoded password, gzip threshold, temp upper clamp, name suffix, gitignore pycache, healthcheck `-d`, input validation |
| 6 | H1–H5 | ✅ Fixed | README password, env-var credentials, reentrant API base, local solar time, safe env parsing |
| 2 | C1–C6, H7–H15 | ✅ Fixed | Password, tier registration, lat/lon keys, ingest envelope, subscriber auth, subscriber envelope, correlation precompute, additive outliers, async subscriber, cleanup, retry adapter, tier cascading, paho-mqtt pin, rate limiting |

---

*Report generated by QA Cycle 16 review. No fixes applied.*
*Date: 2026-07-01 PDT*
