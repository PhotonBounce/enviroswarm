# ENViroSwarm Data Pipeline — QA Cycle 8 Re-Review Report

**Date:** 2026-06-30
**Scope:** `data-pipeline/` (post-Cycle-7 fixes)
**Reviewer:** Senior QA Engineer
**Previous Reports:** `QA_CYCLE_6_DATA.md`, `QA_CYCLE_4_DATA.md`

---

## Total Issue Count

**26 issues remaining:** 0 Critical, 0 High, 13 Medium, 13 Low

| Severity | Cycle 6 Remaining | Fixed in Cycle 7 | Still Open |
|----------|-------------------|------------------|------------|
| Critical | 0 | — | 0 |
| High | 5 | 5 | 0 |
| Medium | 13 | 0 | 13 |
| Low | 13 | 0 | 13 |
| **Total** | **31** | **5** | **26** |

---

## Critical and High Issues Still Open

**None.** All 5 High issues from Cycle 6 have been resolved in Cycle 7. No Critical or High issues remain open from any prior cycle.

---

## New Issues Introduced by Fixes

**No new Critical or High issues introduced by the Cycle 7 fixes.**

The following minor Low observations were introduced by the fixes:

- **Silent env-var fallback (seed_demo.py):** The `_safe_int` and `_safe_float` wrappers (fix for H5) silently swallow malformed env-var values and return defaults without logging a warning. This can mask configuration errors (e.g., `BATCH_SIZE=50O` silently falls back to 500).
- **No DST awareness in `_local_hour` (reading_generator.py):** The fix for H4 uses hardcoded standard UTC offsets (`_CITY_OFFSETS`). Cities with daylight saving time (NYC, LA, Berlin, London) will have their diurnal temperature curves shifted by ±1 hour for ~6 months of the year.

---

## Summary: Cycle 7 Fix Verification

| Cycle 6 Issue | Description | Fix Applied? | Verification |
|---------------|-------------|------------|--------------|
| **H1** | README password mismatch (`demo12345` vs `Demo12345!`) | **Yes** | `README.md:37` now documents `Demo12345!` correctly. |
| **H2** | Hardcoded credentials in source code | **Yes** | `seed_demo.py:33-35` — `DEMO_EMAIL`, `DEMO_PASSWORD`, and `DEMO_TIER` now read from `os.getenv(..., default)` with fallback defaults. |
| **H3** | `global API_BASE` mutation makes `run_seed()` non-reentrant | **Yes** | `seed_demo.py:330` — `run_seed()` uses local `effective_api_base = api_base or API_BASE`; no `global` mutation remains. |
| **H4** | Diurnal temperature cycle uses UTC hour, not local solar time | **Yes** | `reading_generator.py:19-23` — `_local_hour()` added with city-specific UTC offsets; `_temperature_value()` (line 49) and `_humidity_value()` (line 69) now use local hour. |
| **H5** | Crash on import if env vars are malformed | **Yes** | `seed_demo.py:44-60` — `_safe_int()` and `_safe_float()` wrappers guard all module-level env-var parsing. |

**What was fixed:** All five Cycle 6 High issues have been successfully addressed. The README is accurate, credentials are configurable, `run_seed()` is reentrant, temperature curves use local solar time, and import-time env-var parsing is crash-safe.

**What remains:** 26 Medium/Low issues from prior cycles are still open. The most significant remaining items are:
- **Subscriber resilience:** Import-time crash safety (M12, M13), persistent MQTT session (M4), worker restart on death (M5), and graceful shutdown drain (M6).
- **Physics correctness:** PM10 can still be less than PM2.5 (M2).
- **Operational safety:** Cleanup is still destructive (M1, M8, M9), and idempotency keys are non-deterministic (M10).

No new Critical or High issues were introduced. The data pipeline is now free of Critical and High issues, but the Medium backlog should be addressed before production deployment.

---

## Full Remaining Issue Detail

### Medium Issues (13)

| # | File | Line | Description |
|---|------|------|-------------|
| M1 | `seed_demo.py` | 408–421 | Cleanup deletes **ALL** stations for the demo user, not just demo-created stations. |
| M2 | `generators/reading_generator.py` | 97–102 | **PM10 can be less than PM2.5**, which is physically impossible (`max(0.0, ...)` does not enforce `pm10 >= pm25`). |
| M3 | `seed_demo.py` | 361–362 | `wait_for_backend` considers any HTTP status `< 500` as "up" (e.g., 404 or 401). |
| M4 | `mqtt/subscriber.py` | 234 | `clean_session=True` (default) causes **message loss on reconnect** for QoS 1 traffic. |
| M5 | `mqtt/subscriber.py` | 111–148 | Worker thread is **not restarted** if it dies (fatal errors like `MemoryError` leave the queue undrained). |
| M6 | `mqtt/subscriber.py` | 172–182 | Drain timeout of **5 seconds** may be too short for large queues, causing message loss on shutdown. |
| M7 | `mqtt/subscriber.py` | 57–60 | **Gzip-compressing single-message payloads** (~150–250 bytes) is CPU-negative and can inflate size. |
| M8 | `seed_demo.py` | 423–445 | Existing stations block **ALL** new readings; no `--append` mode to add historical data. |
| M9 | `seed_demo.py` | 408–421 | Cleanup deletes stations but **not their associated readings**, risking orphaned DB rows. |
| M10 | `seed_demo.py` | 257 | **Idempotency key is random** (`uuid.uuid4()`); backend cannot deduplicate across re-runs. |
| M11 | `mqtt/config/mosquitto.conf` | 7 | `allow_anonymous true` remains in production config with no `password_file` or TLS. |
| M12 | `mqtt/subscriber.py` | 26–28 | **Crash on import** if `MQTT_MAX_QUEUE_SIZE`, `MQTT_INGEST_TIMEOUT`, or `MQTT_INGEST_RETRY` are malformed. |
| M13 | `mqtt/subscriber.py` | 293 | `MQTT_BROKER_PORT` crashes on malformed input (bare `int()` call in `main()`). |

### Low Issues (13)

| # | File | Line | Description |
|---|------|------|-------------|
| L1 | `generators/station_factory.py` | 81 | `per_city: int = None` is invalid; needs `Optional[int]`. |
| L2 | `seed_demo.py` | 470–474 | `merged` dict overwrites local coordinates with `None` if the API omits `latitude`/`longitude`. |
| L3 | `seed_demo.py` | 33–35 | CLI flags (`--email`, `--password`, `--tier`) still missing; env-var overrides were added. |
| L4 | `seed_demo.py` | 388 | `duration_months=1` is hardcoded in `subscribe_user` call. |
| L5 | `seed_demo.py` | 514–522 | `except Exception` in the batch loop is overly broad. |
| L6 | `generators/reading_generator.py` | 178 | `end_time` does not truncate microseconds when `generate_readings_for_station` is called directly. |
| L7 | `docker-compose.mqtt.yml` | 1–15 | No `healthcheck` stanza for the Mosquitto service. |
| L8 | `requirements.txt` | 1 | `requests>=2.31.0` has no upper bound. |
| L9 | `mqtt/subscriber.py` | 88 | 408 Request Timeout not included in the retry status list. |
| L10 | `mqtt/publisher.py` | 22 | `_on_publish` callback is empty (no-op). |
| L11 | `mqtt/publisher.py` | 100–101 | Disconnection order is suboptimal (`loop_stop()` before `disconnect()`). |
| L12 | `seed_demo.py` | 517 | Redundant `isinstance(result, dict)` check. |
| L13 | `README.md` | 89–91 | Troubleshooting section is outdated; does not document `--batch-delay`, `--batch-size`, etc. |

---

*End of QA Cycle 8 Data Pipeline Re-Review Report*
