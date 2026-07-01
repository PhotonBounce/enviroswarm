# ENViroSwarm Data Pipeline — QA Cycle 20 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 0 |
| **Low** | 3 |
| **Total** | **3** |

## Issues Found

### Low

#### L1 — `seed_demo.py`: `list_stations` Null-Safety for `meta` Dict Is Incomplete

- **Location:** `seed_demo.py`, lines 208–209
- **Description:** QA Cycle 17 fixed the case where `meta.total` is `null` by using `meta.get("total") or 0`. However, the code does not protect against `meta` itself being `null` (i.e., the backend returns `"meta": null`). `body.get("meta", {})` returns `None` when the key exists but its value is `null`, causing `meta.get("total")` to raise `AttributeError`. The correct pattern is `meta = body.get("meta") or {}` before accessing keys on `meta`.
- **Impact:** `list_stations` crashes with `AttributeError` on responses containing `"meta": null`. The caller in `run_seed` wraps the call in `try/except`, so the seeder does not abort, but the function itself is not internally robust as best practice requires.
- **Fix Direction:** Change line 208 to `meta = body.get("meta") or {}` before line 209 reads `meta.get("total")`.

#### L2 — `mqtt/publisher.py`: Publish Loop Not Wrapped in `try/finally` for Guaranteed Cleanup

- **Location:** `mqtt/publisher.py`, lines 77–114
- **Description:** The `client.disconnect()` and `client.loop_stop()` cleanup calls are placed in a `try/except` at the end of the function (lines 108–112). The `for` loop that publishes messages (lines 78–106) is not wrapped in a `try/finally`. If an exception occurs during the loop — for example, `KeyboardInterrupt` during `time.sleep(delay_seconds)`, or an unexpected `json.dumps` failure from a malformed reading dict — the function exits without disconnecting the MQTT client or stopping the background `loop_start()` thread.
- **Impact:** Resource leak. The MQTT client background thread and underlying TCP connection may remain alive until the Python process terminates.
- **Fix Direction:** Wrap the publish loop (lines 77–106) in a `try:` block and move the `client.disconnect()` / `client.loop_stop()` calls into a `finally:` block.

#### L3 — `reading_generator.py`: `OUTLIER_OFFSETS` Defined Inside Function Instead of Module Level

- **Location:** `reading_generator.py`, lines 204–215
- **Description:** The `OUTLIER_OFFSETS` dictionary is a static lookup table that does not depend on any function parameters. It is defined inside `generate_readings_for_station`, causing it to be re-instantiated on every function call. This deviates from the best practice of defining immutable constants at module level.
- **Impact:** Unnecessary object allocation and CPU overhead on every call. Minor, but non-zero in a function that may be called many times during bulk data generation.
- **Fix Direction:** Move `OUTLIER_OFFSETS` to the top of the module, immediately after the `_CITY_OFFSETS` constant.

---

## Previous Fix Verification

All fixes from QA Cycles 1–19 were verified present and correct in the current `main` branch.

### QA Cycle 19 Fixes

| Issue | Prescribed Fix | Verification Location | Status |
|-------|---------------|----------------------|--------|
| **M1** — Stale worker thread reference | Return mutable `thread_ref` dict; watcher updates it; caller passes live ref to `_drain_and_shutdown` | `mqtt/subscriber.py:167, 174–175, 212` | ✅ Fixed |
| **L1** — `_station_limit_from_pricing` null safety | `stations = item.get("stations"); return stations if stations is not None else 1` | `seed_demo.py:164–165` | ✅ Fixed |
| **L2** — `urllib3` upper bound | `urllib3>=2.0.0,<3.0` | `requirements.txt:3` | ✅ Fixed |
| **L3** — `run_seed` session leak | `try/finally` block with `session.close()` | `seed_demo.py:378–587` | ✅ Fixed |
| **L4** — `start_subscriber` session leak | `session.close()` in `_drain_and_shutdown` and error paths | `mqtt/subscriber.py:219–223, 293–298` | ✅ Fixed |
| **L5** — `generate_readings_for_station` missing `days` validation | `if days < 0: raise ValueError(...)` | `reading_generator.py:180–181` | ✅ Fixed |
| **L6** — `create_station` missing `city_name` validation | `if city_name not in CITY_CLUSTERS: raise ValueError(...)` | `station_factory.py:65–66` | ✅ Fixed |
| **L7** — `create_stations` missing `total`/`per_city` validation | `if total < 0: raise ValueError(...)` and `if per_city is not None and per_city < 0: raise ValueError(...)` | `station_factory.py:95–98` | ✅ Fixed |
| **L8** — `publisher.py` disconnect not wrapped in `try/except` | Wrap `disconnect()`/`loop_stop()` in `try/except` | `mqtt/publisher.py:108–112` | ✅ Fixed |

### QA Cycle 18 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **M1** — Stale worker thread reference | ✅ Fixed | `mqtt/subscriber.py:167, 174–175, 212` |
| **L1** — `_station_limit_from_pricing` null safety | ✅ Fixed | `seed_demo.py:164–165` |
| **L2** — `urllib3` upper bound | ✅ Fixed | `requirements.txt:3` |
| **L3** — `run_seed` session leak | ✅ Fixed | `seed_demo.py:378–587` |
| **L4** — `start_subscriber` session leak | ✅ Fixed | `mqtt/subscriber.py:219–223, 293–298` |
| **L5** — `generate_readings_for_station` missing `days` validation | ✅ Fixed | `reading_generator.py:180–181` |
| **L6** — `create_station` missing `city_name` validation | ✅ Fixed | `station_factory.py:65–66` |
| **L7** — `create_stations` missing `total`/`per_city` validation | ✅ Fixed | `station_factory.py:95–98` |
| **L8** — `publisher.py` disconnect not wrapped in `try/except` | ✅ Fixed | `mqtt/publisher.py:108–112` |

### QA Cycle 17 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **L1** — `meta.get("total")` null safety | ✅ Fixed | `seed_demo.py:209` |
| **L2** — `_station_limit_from_pricing` null safety | ✅ Fixed | `seed_demo.py:164–165` |
| **L3** — `urllib3` direct dependency | ✅ Fixed | `requirements.txt:3` |

### QA Cycles 2–16 Fixes

All fixes from QA Cycles 2–16 were verified present and correct in the current `main` branch. Notable verifications include:

- **Cycle 16**: `_drain_and_shutdown` stop_event ordering (`mqtt/subscriber.py:204–217`), `batch_size` validation placement (`seed_demo.py:360–361`).
- **Cycle 14**: `start_subscriber` `run_duration_seconds` validation (`mqtt/subscriber.py:263–264`), CLI `args.days`/`args.email`/`args.tier` validation (`seed_demo.py:684, 687, 689`).
- **Cycle 13**: Subscriber retries narrowed to `ConnectionError`/`Timeout` (`mqtt/subscriber.py:116–125`), `isinstance(body, dict)` guards (`seed_demo.py:90, 198`), `try/except` around `client.disconnect()`/`loop_stop()` (`mqtt/subscriber.py:214–218`), CLI `args.run_duration` validation (`mqtt/subscriber.py:398–399`), Publisher `readings=None` guard (`mqtt/publisher.py:43–44`), CLI `args.batch_size` validation (`seed_demo.py:695`), `run_seed` parameter validation (`seed_demo.py:344–362`), `start_subscriber` input validation (`mqtt/subscriber.py:253–264`), unused `urllib3`/`HTTPAdapter` imports removed from `subscriber.py`.
- **Cycle 12**: Subscriber idempotency `AttributeError` (`mqtt/subscriber.py:78`), timed-run `KeyboardInterrupt` handler (`mqtt/subscriber.py:311–329`), production mosquitto template (`mqtt/config/mosquitto.conf.production`), unused `random`/`uuid` imports removed from `seed_demo.py` and `subscriber.py`, `password: Optional[str]` type hint (`seed_demo.py:334`), Publisher disconnect order (`mqtt/publisher.py:108–109`).
- **Cycle 11**: Import-time `DEMO_PASSWORD` crash (`seed_demo.py:33, 678`), PM10 ≥ PM25 enforcement (`reading_generator.py:301–306`), deterministic idempotency (`mqtt/subscriber.py:78`), `RuntimeError` catch in batch loop (`seed_demo.py:524`), docstrings, microsecond truncation, MQTT directories, step numbering, URL helper consistency, `user_data_set`, `duration_months` validation, README password documentation.
- **Cycle 10**: Duplicate auth block, strict 2xx check, double retry layers, incorrect MQTT shutdown order, `interval_minutes` validation, rate parameter validation, WQI/humidity clamp, mosquitto volume permissions, no hardcoded password, gzip threshold, temperature upper clamp, name suffix, `__pycache__` in `.gitignore`, healthcheck `-d` argument, input validation boundaries.
- **Cycle 6**: README password, env-var credentials, reentrant API base, local solar time, safe env parsing.
- **Cycle 2**: Password handling, tier registration, lat/lon keys, ingest envelope, subscriber auth/envelope, correlation precompute, additive outliers, async subscriber, cleanup, retry adapter, tier cascading, paho-mqtt pin, rate limiting.

### `.gitignore` Verification

- `__pycache__/` and `*.pyc` entries confirmed present in `.gitignore`.
- `__pycache__` directories on disk are not tracked in git (verified via `git status` and `git ls-files`).

---

*Report generated by QA Cycle 20 review. No fixes applied.*
*Date: 2026-07-01 PDT*
