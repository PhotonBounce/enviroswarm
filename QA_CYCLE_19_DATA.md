# ENViroSwarm Data Pipeline — QA Cycle 19 Review Report

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

All fixes from QA Cycles 1–18 were verified present and correct in the current `main` branch.

### QA Cycle 18 Fixes

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

### QA Cycle 17 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **L1** — `meta.get("total")` null safety | ✅ Fixed | `seed_demo.py:209` — `meta.get("total") or 0` |
| **L2** — `_station_limit_from_pricing` null safety | ✅ Fixed | `seed_demo.py:164–165` — explicit null check |
| **L3** — `urllib3` direct dependency | ✅ Fixed | `requirements.txt:3` — `urllib3>=2.0.0,<3.0` |

### QA Cycle 16 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **M1** — `_drain_and_shutdown` stop_event ordering | ✅ Fixed | `mqtt/subscriber.py:204–217` — `stop_event` set internally after drain loop |
| **L1** — `batch_size` validation misplaced | ✅ Fixed | `seed_demo.py:360–361` — validation before `start_time = time.time()` |

### QA Cycle 15 Fixes

All Cycle 14 fixes verified present and correct. No new issues in Cycle 15.

### QA Cycle 14 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **L1** — `start_subscriber` `run_duration_seconds` validation | ✅ Fixed | `mqtt/subscriber.py:263–264` |
| **L2** — `main()` `args.days` validation | ✅ Fixed | `seed_demo.py:684` — `if args.days <= 0` |
| **L3** — `main()` `args.email` validation | ✅ Fixed | `seed_demo.py:687` — `if not args.email` |
| **L4** — `main()` `args.tier` validation | ✅ Fixed | `seed_demo.py:689` — `if args.tier not in {...}` |

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
| **C1** — Subscriber idempotency `AttributeError` | ✅ Fixed | `mqtt/subscriber.py:78` — `hashlib.sha256(raw_json).hexdigest()` |
| **M1** — Timed-run `KeyboardInterrupt` handler | ✅ Fixed | `mqtt/subscriber.py:311–329` |
| **M2** — Production mosquitto template | ✅ Fixed | `mqtt/config/mosquitto.conf.production` exists |
| **L1** — Unused `import random` in `seed_demo.py` | ✅ Fixed | `seed_demo.py` — absent |
| **L2** — Unused `import uuid` in `seed_demo.py` | ✅ Fixed | `seed_demo.py` — absent |
| **L3** — Unused `import uuid` in `subscriber.py` | ✅ Fixed | `mqtt/subscriber.py` — absent |
| **L4** — `password: Optional[str]` type hint | ✅ Fixed | `seed_demo.py:334` |
| **L5** — Publisher disconnect order | ✅ Fixed | `mqtt/publisher.py:108–109` — `disconnect()` before `loop_stop()` |

### QA Cycle 11 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **M1** — Import-time `DEMO_PASSWORD` crash | ✅ Fixed | `seed_demo.py:33, 678` |
| **M2** — PM10 ≥ PM25 enforcement | ✅ Fixed | `reading_generator.py:301–306` |
| **M3** — Deterministic idempotency key | ✅ Fixed | `mqtt/subscriber.py:78` |
| **M4** — `RuntimeError` catch in batch loop | ✅ Fixed | `seed_demo.py:524` |
| **L1** — Docstring coldest at midnight | ✅ Fixed | `reading_generator.py:28` |
| **L2** — Microsecond truncation | ✅ Fixed | `reading_generator.py:178` |
| **L3** — `mqtt/data` and `mqtt/log` directories | ✅ Fixed | `mqtt/data/.gitkeep`, `mqtt/log/.gitkeep` |
| **L4** — Consistent step numbering | ✅ Fixed | `seed_demo.py` — denominator consistently 7 |
| **L5** — URL helper consistency | ✅ Fixed | `mqtt/subscriber.py:64` — `api_base.rstrip('/')` |
| **L6** — Global mutation via `user_data_set` | ✅ Fixed | `mqtt/subscriber.py:277` |
| **L7** — `duration_months` validation | ✅ Fixed | `seed_demo.py:359` |
| **L8** — README `DEMO_PASSWORD` documentation | ✅ Fixed | `README.md:23–30` |

### QA Cycle 10 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **H1** — Duplicate auth block | ✅ Fixed | `seed_demo.py` — single auth block |
| **M1** — Strict `== 200` check | ✅ Fixed | `mqtt/subscriber.py:92` — `< 400` |
| **M2** — Double retry layers | ✅ Fixed | `mqtt/subscriber.py` — no HTTPAdapter |
| **M3** — Incorrect MQTT shutdown order | ✅ Fixed | `mqtt/subscriber.py:214–218` |
| **M4** — `interval_minutes` validation | ✅ Fixed | `reading_generator.py:182–183` |
| **M5** — Rate parameter validation | ✅ Fixed | `reading_generator.py:184–187` |
| **M6** — WQI/humidity upper clamp | ✅ Fixed | `reading_generator.py:278–286` |
| **M7** — Mosquitto volume permissions | ✅ Fixed | `docker-compose.mqtt.yml:14` — `user: "1883:1883"` |
| **L1** — Hardcoded demo password | ✅ Fixed | `seed_demo.py:33` — env var only |
| **L2** — Inconsistent gzip policy | ✅ Fixed | `seed_demo.py:264` — threshold 1024 |
| **L3** — Temperature upper clamp | ✅ Fixed | `reading_generator.py:287–289` |
| **L4** — Name suffix for >48 stations | ✅ Fixed | `station_factory.py:111–113` |
| **L5** — `__pycache__` in repository | ✅ Fixed | `.gitignore` has `__pycache__/`; not tracked in git |
| **L6** — Healthcheck `-d` argument | ✅ Fixed | `docker-compose.mqtt.yml:17` |
| **L7** — Input validation boundaries | ✅ Fixed | Various locations across all modules |

### QA Cycle 6 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **H1** — README password documentation | ✅ Fixed | `README.md:23–30` |
| **H2** — Env-var credentials | ✅ Fixed | `seed_demo.py:32–34` |
| **H3** — Reentrant API base | ✅ Fixed | `seed_demo.py:80–81` |
| **H4** — Local solar time | ✅ Fixed | `reading_generator.py:19–23` |
| **H5** — Safe env parsing | ✅ Fixed | `seed_demo.py:43–54`, `mqtt/subscriber.py:24–35` |

### QA Cycle 2 Fixes

| Issue | Status | Verification Location |
|-------|--------|----------------------|
| **C1–C6** — Password, tier registration, lat/lon keys, ingest envelope, subscriber auth, subscriber envelope | ✅ Fixed | `seed_demo.py:107–133, 226–242, 277–315`; `subscriber.py:70–74` |
| **H7–H15** — Correlation precompute, additive outliers, async subscriber, cleanup, retry adapter, tier cascading, paho-mqtt pin, rate limiting | ✅ Fixed | `reading_generator.py:224–226, 203–288`; `subscriber.py:131–203`; `seed_demo.py:66–81, 558–565` |

---

*Report generated by QA Cycle 19 review. No fixes applied.*
*Date: 2026-07-01 PDT*
