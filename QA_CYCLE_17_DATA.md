# ENViroSwarm Data Pipeline — QA Cycle 17 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 0 |
| **Low** | 3 |
| **Total** | **3** |

## Issues Found

### Low

#### L1 — `seed_demo.py` `list_stations`: `meta.get("total")` Can Return `None` and Crash Pagination

- **Location:** `seed_demo.py`, lines 208–210
- **Description:** `meta.get("total", 0)` returns `None` if the backend JSON response contains `"meta": {"total": null}`. The subsequent comparison `offset + limit >= total` then raises `TypeError: '>=' not supported between instances of 'int' and 'NoneType'`, crashing the seeder during station enumeration. The default `0` only applies when the `"total"` key is missing entirely; it does **not** protect against an explicit `null` value.
- **Impact:** Seeder crashes with an unhandled `TypeError` if the backend returns `null` for `total`.
- **Fix Direction:** Use a null-safe fallback: `total = meta.get("total") or 0`.

#### L2 — `seed_demo.py` `_station_limit_from_pricing`: `item.get("stations")` Can Return `None`, Violating `-> int` Type Hint

- **Location:** `seed_demo.py`, lines 160–165
- **Description:** `item.get("stations", 1)` returns `None` when the backend JSON contains `"stations": null`. The function's return type is `-> int`, but it may return `None`. The caller in `run_seed` (line 425) then does `if stations > max_stations:`, which raises `TypeError: '>' not supported between instances of 'int' and 'NoneType'`.
- **Impact:** Seeder crashes with an unhandled `TypeError` during tier-based station count adaptation.
- **Fix Direction:** Use an explicit null check: `stations = item.get("stations"); return stations if stations is not None else 1`.

#### L3 — `requirements.txt`: Missing Direct Dependency `urllib3`

- **Location:** `data-pipeline/requirements.txt` and `seed_demo.py`, lines 22–23
- **Description:** `seed_demo.py` imports `urllib3.util.retry` and `requests.adapters` directly. `urllib3` is currently only pulled in transitively through `requests`. Best practice is to declare all packages that are imported directly as top-level dependencies. If a future version of `requests` removes or changes its `urllib3` dependency, the seeder will fail on import.
- **Impact:** Fragile dependency graph; future `requests` upgrades could break the seeder.
- **Fix Direction:** Add `urllib3>=1.21.1,<3.0` to `requirements.txt`.

---

## Previous Fix Verification

All fixes from QA Cycles 2–16 were verified present and correct in the current `main` branch.

| Cycle | Issue | Status | Verification Location |
|-------|-------|--------|----------------------|
| **16** | M1 — `_drain_and_shutdown` stop_event ordering | ✅ Fixed | `mqtt/subscriber.py:204–217` — callers no longer set `stop_event` before calling; `_drain_and_shutdown` sets it internally |
| **16** | L1 — `batch_size` validation misplaced | ✅ Fixed | `seed_demo.py:361–362` — validation now occurs BEFORE `start_time = time.time()` (line 364) |
| **15** | All Cycle 14 fixes | ✅ Verified | `seed_demo.py`, `subscriber.py` |
| **14** | L1 — `start_subscriber` `run_duration_seconds` validation | ✅ Fixed | `mqtt/subscriber.py:257–258` |
| **14** | L2 — `main()` `args.days` validation | ✅ Fixed | `seed_demo.py:679` |
| **14** | L3 — `main()` `args.email` validation | ✅ Fixed | `seed_demo.py:681` |
| **14** | L4 — `main()` `args.tier` validation | ✅ Fixed | `seed_demo.py:683` |
| **13** | M1 — Subscriber retries narrowed to `ConnectionError`/`Timeout` | ✅ Fixed | `mqtt/subscriber.py:116–125` |
| **13** | L1 — `isinstance(body, dict)` guards in `_unwrap`/`list_stations` | ✅ Fixed | `seed_demo.py:86–98, 196–198` |
| **13** | L2 — `try/except` around `client.disconnect()`/`loop_stop()` | ✅ Fixed | `mqtt/subscriber.py:212–216` |
| **13** | L3 — CLI `args.run_duration` validation | ✅ Fixed | `mqtt/subscriber.py:388–389` |
| **13** | L4 — Publisher `readings=None` guard | ✅ Fixed | `mqtt/publisher.py:43–44` |
| **13** | L5 — CLI `args.batch_size` validation | ✅ Fixed | `seed_demo.py:690` |
| **13** | L6 — `run_seed` parameter validation | ✅ Fixed | `seed_demo.py:344–361` |
| **13** | L7 — `start_subscriber` input validation | ✅ Fixed | `mqtt/subscriber.py:248–257` |
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

*Report generated by QA Cycle 17 review. No fixes applied.*
*Date: 2026-07-01 PDT*
