# ENViroSwarm Data Pipeline — QA Cycle 4 Re-Review Report

**Date:** 2026-07-01  
**Scope:** `data-pipeline/` (post-Cycle-3 fixes)  
**Reviewer:** Senior QA Engineer  
**Previous Report:** `QA_CYCLE_2_DATA.md`

---

## Executive Summary

Cycle 3 fixes addressed **all 6 Critical issues** and the vast majority of High/Medium issues from Cycle 2. The data pipeline is now functionally usable against the backend API. However, the async worker fix for the MQTT subscriber introduced **3 new Medium-severity issues** (unbounded queue, message loss on shutdown, silent worker death). A small number of Medium and Low issues remain open, mostly around hardcoded configuration, operational edge cases, and documentation drift.

| Category | Count |
|----------|-------|
| Issues **RESOLVED** | ~53 |
| Issues **STILL OPEN** | ~19 |
| **NEW** issues introduced by fixes | 4 |
| **Total remaining issues** | 23 |

---

## 1. Issues RESOLVED

### Critical — 6 / 6 resolved

| # | Issue | Verification |
|---|-------|--------------|
| 1 | `DEMO_PASSWORD` failed backend complexity | `seed_demo.py:30` → `DEMO_PASSWORD = "Demo12345!"` (contains uppercase) |
| 2 | `tier` field sent in registration payload | `register_user()` now sends only `{"email", "password"}`; separate `subscribe_user()` calls `POST /api/v1/subscribe` to upgrade tier (`seed_demo.py:123-133`) |
| 3 | Station creation sent `lat`/`lon` instead of `latitude`/`longitude` | `create_station_api()` payload uses correct keys (`seed_demo.py:181-186`) |
| 4 | Ingest sent raw JSON list instead of `{"readings": [...]}` | `ingest_bulk()` wraps list in envelope (`seed_demo.py:208`) |
| 5 | MQTT subscriber sent no auth header | `subscriber.py:48-49` adds `Authorization: Bearer <token>` when provided; warns if absent (`subscriber.py:158`) |
| 6 | MQTT subscriber also sent raw list to ingest | `subscriber.py:54` wraps payload in `{"readings": [payload]}` |

### High — 8 / 9 resolved

| # | Issue | Verification |
|---|-------|--------------|
| 7 | Correlation logic broken (temperature/PM not pre-computed) | `reading_generator.py:199-201` pre-computes `temp`, `pm25`, `pm10` before the inner `for st in sensor_types` loop |
| 8 | Outlier injection ineffective due to clamping | Additive offsets used (`OUTLIER_OFFSETS` at `reading_generator.py:178-189`); only negative values clamped to zero (or -80 for temp), allowing upper extremes to remain visible |
| 9 | MQTT subscriber blocked network loop with sync HTTP | `subscriber.py:34-76` uses `queue.Queue` + daemon worker thread; `_on_message` only enqueues (`subscriber.py:92`) |
| 10 | No idempotency or cleanup in seeder | `--cleanup` flag implemented (`seed_demo.py:296-309`); existing stations detected and skipped (`seed_demo.py:311-335`) |
| 11 | No retry or backoff on HTTP requests | `seed_demo.py:45-57` implements `urllib3.util.retry.Retry` with exponential backoff (3 retries, 429/5xx) on a `requests.Session` |
| 12 | Cascading failure from tier limit (fallback stations added to ingest) | On `create_station_api` failure, station is **not** appended to `created_stations` (`seed_demo.py:367-371`); tier fallback limits station count (`seed_demo.py:284-288`) |
| 13 | paho-mqtt v2 constructor incompatibility (publisher) | `requirements.txt:2` pins `paho-mqtt>=1.6.1,<2.0.0` |
| 14 | paho-mqtt v2 constructor incompatibility (subscriber) | Same pin resolves subscriber constructor |

### Medium — 11 / 13 resolved

| # | Issue | Verification |
|---|-------|--------------|
| 16 | `timestamp.timetuple().tm_yday` used local time | `reading_generator.py:33` uses `timestamp.utctimetuple().tm_yday` |
| 17 | Docstring claimed peak at 3pm but formula peaked at noon | `reading_generator.py:11` docstring corrected to "warmest ~noon (12h)" |
| 18 | `_unwrap()` only checked `success` when status >= 400 | `seed_demo.py:70-75` checks `success` unconditionally, then status code |
| 19 | Subscriber created new connection per message | `subscriber.py:124` uses module-level `requests.Session()` |
| 21 | QoS=1 messages published without confirmation | `publisher.py:88-93` calls `info.wait_for_publish(timeout=5)` and checks `info.is_published()` |
| 22 | Publisher assumed connection ready after fixed 0.3s sleep | `publisher.py:56-61` polls `client.is_connected()` for up to 5 seconds |
| 23 | `UnicodeDecodeError` not caught in subscriber callback | `subscriber.py:85-87` catches `UnicodeDecodeError` |
| 24 | `merged = {**station, **api_station}` contained both key sets | `seed_demo.py:358-363` explicitly maps API fields into local dict |
| 27 | CLI args `--stations`/`--days` not passed to `run_seed()` | `run_seed()` signature accepts parameters (`seed_demo.py:220-226`); `main()` passes them (`seed_demo.py:481-486`) |
| 28 | `end_time` included microseconds | `seed_demo.py:379` truncates with `.replace(microsecond=0)` |

*(Issues 25 and 26 remain open — see below.)*

### Low — ~28 resolved

- **Dependencies / imports:** Unused `numpy` import removed (`reading_generator.py`), `python-dateutil` removed from `requirements.txt`, unused `json`/`sys` cleaned up from `seed_demo.py`, unused `datetime` imports removed from `publisher.py`, unused `threading`/`Callable` cleaned from `subscriber.py`, `Optional[List[str]]` type hint corrected in `station_factory.py:56`.
- **Operational correctness:** `sys.exit(1)` on API errors (`seed_demo.py:489-490`), sleep skipped after final batch (`seed_demo.py:409-410`), publisher checks `is_connected()` before each publish (`publisher.py:71-73`), subscriber `connect()` wrapped in `try/except` (`subscriber.py:144-149`), token prefix no longer leaked to stdout (`seed_demo.py:268`), subscriber checks `body.get("success")` (`subscriber.py:58-66`), `stations_created` only counts API successes (`seed_demo.py:366`), `BATCH_SIZE` validated > 0 (`seed_demo.py:246-247`), empty readings guard in `ingest_bulk` (`seed_demo.py:204-205`), response `inserted` count verified (`seed_demo.py:403`), `User-Agent: enviroswarm-seeder/1.0` set (`seed_demo.py:56`), `SIGTERM` handler registered in subscriber (`subscriber.py:135-142`).
- **Retry / reliability:** Session-level retry adapter handles 429/502/503/504 with capped 3-attempt backoff (`seed_demo.py:47-55`), mitigating Issues 58, 74, 75, 89, 92, and 93.

---

## 2. Issues STILL OPEN

### High → Medium (1)

| # | Severity | File | Line | Description | Why Still Open |
|---|----------|------|------|-------------|----------------|
| 15 | **Medium** | `seed_demo.py` | 39 | `BATCH_DELAY_SECONDS = 0.2` remains hardcoded. The retry adapter mitigates 429 responses, but the script will still hammer the API at ~300 req/min. No CLI flag or tier-aware delay exists. | Retry adapter prevents permanent failure but does not address root cause: no adaptive rate-limiting. |

### Medium (3)

| # | Severity | File | Line | Description | Why Still Open |
|---|----------|------|------|-------------|----------------|
| 20 | **Medium** | `mqtt/subscriber.py` | 51-70 | Subscriber worker thread performs **one-shot POST with no retry**. If the API returns 503 or a network timeout, the message is permanently lost. No dead-letter queue or requeue logic. | The async queue prevents MQTT loop blocking, but the worker itself has no resilience. |
| 25 | **Medium** | `docker-compose.mqtt.yml` | 5 | Still uses floating tag `eclipse-mosquitto:2`. Builds are non-reproducible. | Not addressed in Cycle 3. |
| 26 | **Medium** | `mqtt/config/mosquitto.conf` | 7 | Still `allow_anonymous true` with no `password_file` or `acl_file`. | Not addressed in Cycle 3; acceptable for local dev only. |

### Low (15 grouped)

| Theme | Severity | Description |
|-------|----------|-------------|
| Documentation drift | **Low** | README temperature range (-10 to 40 °C) still mismatches generator physics (normal readings can reach ~-16 °C in winter cities; outliers far beyond). Issue #31. |
| Memory / performance | **Low** | `generate_all_readings` still materializes the entire dataset in memory (~100–200 MB for default config). No streaming. Issues #47, #48. |
| Hardcoded config | **Low** | `BATCH_SIZE = 500` still hardcoded; exceeds free-tier daily limit; no CLI override. Issues #49, #50. |
| Redundant headers | **Low** | `subscribe_user` (`seed_demo.py:128`), `create_station_api` (`seed_demo.py:191`), and `ingest_bulk` (`seed_demo.py:209`) all explicitly set `Content-Type: application/json`, which is redundant with `requests`' `json=` parameter. Issue #61. |
| Error observability | **Low** | Failed batch logging does not include a sample of the request body, making 422 debugging difficult. Issue #63. |
| Adaptive behaviour | **Low** | `BATCH_DELAY_SECONDS` is still a fixed blocking sleep; no adaptive rate-limiting based on response times. Issue #55. |
| Timeout | **Low** | `ingest_bulk` timeout remains 30s with no CLI override. Issue #56. |
| Edge-case HTTP | **Low** | No specific handling for 413 Payload Too Large (would require batch splitting). Issue #59. |
| Payload optimization | **Low** | No `Content-Encoding: gzip` compression for large batches. Issue #60. |
| Infrastructure | **Low** | Various unaddressed edge cases: no `Retry-After` header parsing (#94), no `X-Idempotency-Key` (#77), no backend version pre-check (#88), no `--wait-for-backend` flag (#87), no proxy/SSL/IPv6 handling (#82-84), no schema validation (#79), and no handling of 202 Accepted (#96). |

---

## 3. NEW Issues Introduced by Fixes

| # | Severity | File | Line | Description | Introduced By |
|---|----------|------|------|-------------|---------------|
| N1 | **Medium** | `mqtt/subscriber.py` | 36 | **Unbounded queue.** The queue-based async fix for Issue #9 uses `queue.Queue()` with no `maxsize`. If the backend is slower than the MQTT publish rate, memory grows indefinitely. | Fix for Issue #9 (async worker) |
| N2 | **Medium** | `mqtt/subscriber.py` | 74, 135-140 | **Message loss on graceful shutdown.** The worker thread is `daemon=True`. The `SIGTERM` handler (`_signal_handler`) calls `sys.exit(0)` immediately without draining the queue or waiting for the worker to finish. Any messages still in the queue or in-flight are silently lost. | Fixes for Issues #9 (async worker) and #36 (SIGTERM handler) |
| N3 | **Medium** | `mqtt/subscriber.py` | 39-72 | **Silent worker thread death.** If the worker thread hits an unhandled exception (e.g., `MemoryError`, unexpected response format), it dies silently. The main thread continues running, MQTT messages keep being queued, but nothing drains them. This leads to unbounded memory growth and complete message loss with no alerting. | Fix for Issue #9 (async worker) |
| N4 | **Low** | `seed_demo.py` | 284 | **Hardcoded tier limits in fallback logic.** The tier-limit fallback introduced in the fix for Issue #12 duplicates backend business logic (`{"free": 1, "pro": 10, "enterprise": 9999}`). If the backend changes these limits, the seeder will adapt to stale values. | Fix for Issue #12 (tier-limit cascading failure) |

---

## 4. Total Remaining Issues Count

| Severity | Still Open | New | Total Remaining |
|----------|-----------|-----|-----------------|
| Critical | 0 | 0 | **0** |
| High | 0 | 0 | **0** |
| Medium | 4 | 3 | **7** |
| Low | 15 | 1 | **16** |
| **Total** | **19** | **4** | **23** |

---

## 5. Recommendations for Cycle 5

1. **Cap the subscriber queue** (`maxsize=1000` or similar) and implement a backpressure strategy (drop + log, or nack to broker).
2. **Drain the subscriber queue on shutdown.** Replace `sys.exit(0)` in the SIGTERM handler with `q.join()` or a graceful drain loop with a timeout before exiting.
3. **Add worker thread resilience.** Wrap the worker loop in a top-level `try/except` that logs the exception and restarts the worker, or use `concurrent.futures.ThreadPoolExecutor` for managed threads.
4. **Pin the Mosquitto image** to a specific patch version (e.g., `eclipse-mosquitto:2.0.18`).
5. **Remove redundant `Content-Type` headers** from `seed_demo.py` API helpers.
6. **Add a `--batch-size` and `--batch-delay` CLI flags** to make the seeder configurable without editing code.
7. **Query backend tier limits dynamically** instead of hardcoding them in the fallback logic.

---
*End of QA Cycle 4 Data Pipeline Re-Review Report*
