# ENViroSwarm Data Pipeline — QA Cycle 21 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 0 |
| **Low** | 0 |
| **Total** | **0** |

## Issues Found

No issues found. All previous fixes verified correct.

---

## Previous Fix Verification

### QA Cycle 20 Fixes

| Issue | Prescribed Fix | Verification Location | Status |
|-------|---------------|----------------------|--------|
| **L1** — `list_stations` meta null safety | `meta = body.get("meta") or {}` | `seed_demo.py:209` | ✅ Fixed |
| **L2** — Publisher publish loop `try/finally` | Wrap loop in `try:` and cleanup in `finally:` | `mqtt/publisher.py:77–114` | ✅ Fixed |
| **L3** — `OUTLIER_OFFSETS` at module level | Move `_OUTLIER_OFFSETS` to top of module | `reading_generator.py:20–31` | ✅ Fixed |

### QA Cycle 19 Fixes

| Issue | Prescribed Fix | Verification Location | Status |
|-------|---------------|----------------------|--------|
| **M1** — Stale worker thread reference | Return mutable `thread_ref` dict; watcher updates it | `mqtt/subscriber.py:167, 174–175, 212` | ✅ Fixed |
| **L1** — `_station_limit_from_pricing` null safety | `stations = item.get("stations"); return stations if stations is not None else 1` | `seed_demo.py:164–165` | ✅ Fixed |
| **L2** — `urllib3` upper bound | `urllib3>=2.0.0,<3.0` | `requirements.txt:3` | ✅ Fixed |
| **L3** — `run_seed` session leak | `try/finally` block with `session.close()` | `seed_demo.py:378–587` | ✅ Fixed |
| **L4** — `start_subscriber` session leak | `session.close()` in `_drain_and_shutdown` and error paths | `mqtt/subscriber.py:219–223, 293–298` | ✅ Fixed |
| **L5** — `generate_readings_for_station` missing `days` validation | `if days < 0: raise ValueError(...)` | `reading_generator.py:195–196` | ✅ Fixed |
| **L6** — `create_station` missing `city_name` validation | `if city_name not in CITY_CLUSTERS: raise ValueError(...)` | `station_factory.py:65–66` | ✅ Fixed |
| **L7** — `create_stations` missing `total`/`per_city` validation | `if total < 0: raise ValueError(...)` and `if per_city is not None and per_city < 0: raise ValueError(...)` | `station_factory.py:95–98` | ✅ Fixed |
| **L8** — `publisher.py` disconnect not wrapped in `try/except` | Wrap `disconnect()`/`loop_stop()` in `try/except` | `mqtt/publisher.py:109–114` | ✅ Fixed |

### QA Cycle 18 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **M1** — Stale worker thread reference | ✅ Fixed | `mqtt/subscriber.py:167, 174–175, 212` |
| **L1** — `_station_limit_from_pricing` null safety | ✅ Fixed | `seed_demo.py:164–165` |
| **L2** — `urllib3` upper bound | ✅ Fixed | `requirements.txt:3` |
| **L3** — `run_seed` session leak | ✅ Fixed | `seed_demo.py:378–587` |
| **L4** — `start_subscriber` session leak | ✅ Fixed | `mqtt/subscriber.py:219–223, 293–298` |
| **L5** — `generate_readings_for_station` missing `days` validation | ✅ Fixed | `reading_generator.py:195–196` |
| **L6** — `create_station` missing `city_name` validation | ✅ Fixed | `station_factory.py:65–66` |
| **L7** — `create_stations` missing `total`/`per_city` validation | ✅ Fixed | `station_factory.py:95–98` |
| **L8** — `publisher.py` disconnect not wrapped in `try/except` | ✅ Fixed | `mqtt/publisher.py:109–114` |

### QA Cycle 17 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **L1** — `meta.get("total")` null safety | ✅ Fixed | `seed_demo.py:209` — `meta = body.get("meta") or {}` |
| **L2** — `_station_limit_from_pricing` null safety | ✅ Fixed | `seed_demo.py:164–165` — explicit null check |
| **L3** — `urllib3` direct dependency | ✅ Fixed | `requirements.txt:3` — `urllib3>=2.0.0,<3.0` |

### QA Cycle 16 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **M1** — `_drain_and_shutdown` stop_event ordering | ✅ Fixed | `mqtt/subscriber.py:204–217` |
| **L1** — `batch_size` validation misplaced | ✅ Fixed | `seed_demo.py:360–362` |

### QA Cycle 14 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **L1** — `start_subscriber` `run_duration_seconds` validation | ✅ Fixed | `mqtt/subscriber.py:263–264` |
| **L2** — `main()` `args.days` validation | ✅ Fixed | `seed_demo.py:684` |
| **L3** — `main()` `args.email` validation | ✅ Fixed | `seed_demo.py:687` |
| **L4** — `main()` `args.tier` validation | ✅ Fixed | `seed_demo.py:689` |

### QA Cycle 13 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **M1** — Subscriber retries narrowed to `ConnectionError`/`Timeout` | ✅ Fixed | `mqtt/subscriber.py:116–125` |
| **L1** — `isinstance(body, dict)` guards in `_unwrap`/`list_stations` | ✅ Fixed | `seed_demo.py:90, 198` |
| **L2** — `try/except` around `client.disconnect()`/`loop_stop()` | ✅ Fixed | `mqtt/subscriber.py:214–218` |
| **L3** — CLI `args.run_duration` validation | ✅ Fixed | `mqtt/subscriber.py:398–399` |
| **L4** — Publisher `readings=None` guard | ✅ Fixed | `mqtt/publisher.py:43–44` |
| **L5** — CLI `args.batch_size` validation | ✅ Fixed | `seed_demo.py:695` |
| **L6** — `run_seed` parameter validation | ✅ Fixed | `seed_demo.py:344–362` |
| **L7** — `start_subscriber` input validation | ✅ Fixed | `mqtt/subscriber.py:253–264` |
| **L8** — Unused `urllib3`/`HTTPAdapter` imports removed | ✅ Fixed | `mqtt/subscriber.py` — absent |

### QA Cycle 12 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **C1** — Subscriber idempotency `AttributeError` | ✅ Fixed | `mqtt/subscriber.py:78` |
| **M1** — Timed-run `KeyboardInterrupt` handler | ✅ Fixed | `mqtt/subscriber.py:311–329` |
| **M2** — Production mosquitto template | ✅ Fixed | `mqtt/config/mosquitto.conf.production` exists |
| **L1** — Unused `import random` in `seed_demo.py` | ✅ Fixed | `seed_demo.py` — absent |
| **L2** — Unused `import uuid` in `seed_demo.py` | ✅ Fixed | `seed_demo.py` — absent |
| **L3** — Unused `import uuid` in `subscriber.py` | ✅ Fixed | `mqtt/subscriber.py` — absent |
| **L4** — `password: Optional[str]` type hint | ✅ Fixed | `seed_demo.py:335` |
| **L5** — Publisher disconnect order | ✅ Fixed | `mqtt/publisher.py:110–111` |

### QA Cycle 11 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **M1** — Import-time `DEMO_PASSWORD` crash | ✅ Fixed | `seed_demo.py:33, 678` |
| **M2** — PM10 ≥ PM25 enforcement | ✅ Fixed | `reading_generator.py:301–306` |
| **M3** — Deterministic idempotency key | ✅ Fixed | `mqtt/subscriber.py:78` |
| **M4** — `RuntimeError` catch in batch loop | ✅ Fixed | `seed_demo.py:524` |
| **L1–L8** — Various docstring, formatting, validation, README fixes | ✅ Fixed | Various locations |

### QA Cycle 10 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **H1** — Duplicate auth block | ✅ Fixed | `seed_demo.py` — single auth block |
| **M1–M7** — Strict 2xx check, double retry, MQTT shutdown, validation, clamping, permissions | ✅ Fixed | Various locations |
| **L1–L7** — No hardcoded password, gzip threshold, temp clamp, name suffix, gitignore, healthcheck, input validation | ✅ Fixed | Various locations |

### QA Cycle 6 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **H1–H5** — README password, env-var credentials, reentrant API base, local solar time, safe env parsing | ✅ Fixed | Various locations |

### QA Cycle 2 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **C1–C6** — Password, tier registration, lat/lon keys, ingest envelope, subscriber auth, subscriber envelope | ✅ Fixed | `seed_demo.py:107–133, 226–242, 277–315` |
| **H7–H15** — Correlation precompute, additive outliers, async subscriber, cleanup, retry adapter, tier cascading, paho-mqtt pin, rate limiting | ✅ Fixed | Various locations |

### `.gitignore` Verification

- `__pycache__/` and `*.pyc` entries confirmed present in root `.gitignore`.
- `__pycache__` directories on disk are not tracked in git (verified via `git ls-files`).

---

*Report generated by QA Cycle 21 review. No fixes applied.*
