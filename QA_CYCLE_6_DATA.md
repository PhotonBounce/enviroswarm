# ENViroSwarm Data Pipeline — QA Cycle 6 Re-Review Report

**Date:** 2026-06-30  
**Scope:** `data-pipeline/` (post-Cycle-4 fixes)  
**Reviewer:** Senior QA Engineer  
**Previous Reports:** `QA_CYCLE_2_DATA.md`, `QA_CYCLE_4_DATA.md`

---

## Total Issue Count

**31 issues found:** 0 Critical, 5 High, 13 Medium, 13 Low

| Category | Cycle 4 Remaining | Resolved in Cycle 5/6 | New in Cycle 6 | Still Open |
|----------|-------------------|----------------------|----------------|------------|
| Critical | 0 | — | 0 | **0** |
| High | 0 | — | 5 | **5** |
| Medium | 4 | 3 | 9 | **13** |
| Low | 19 | 12 | 6 | **13** |
| **Total** | **23** | **15** | **20** | **31** |

---

## High Issues

| # | Severity | File | Line | Description | Fix Suggestion | Status |
|---|----------|------|------|-------------|---------------|--------|
| H1 | **High** | `README.md` | 37 | **Documentation password is wrong.** README states demo credentials are `demo@enviroswarm.local / demo12345`, but the actual hardcoded password in `seed_demo.py:34` is `Demo12345!` (capital D + exclamation mark). Anyone following the README for manual login will get **401 Unauthorized**. | Update README to `Demo12345!`. | **NEW** |
| H2 | **High** | `seed_demo.py` | 33–34 | **Hardcoded credentials in source code.** `DEMO_EMAIL` and `DEMO_PASSWORD` are hardcoded module-level constants with no env-var override. If the repo is public or shared, credentials are leaked in git history. | Read from env vars: `os.getenv("DEMO_EMAIL", "demo@enviroswarm.local")` and `os.getenv("DEMO_PASSWORD", "...")`. | **NEW** |
| H3 | **High** | `seed_demo.py` | 312 | **`global API_BASE` mutation makes `run_seed()` non-reentrant.** If `run_seed()` is called programmatically multiple times with different `api_base` values, the first call mutates the module-level global, and subsequent calls without `api_base` inherit the mutated value. | Pass `api_base` as a local variable throughout; never mutate module globals. | **NEW** |
| H4 | **High** | `generators/reading_generator.py` | 33 | **Diurnal temperature cycle uses UTC hour, not local solar time.** `_temperature_value` extracts `hour = timestamp.hour` from a UTC timestamp. For Tokyo (UTC+9), the "warmest ~noon" peak occurs at 21:00 local time. For NYC (UTC-5/4), it occurs at ~07:00 local time. All non-UTC cities have physically incorrect temperature curves. | Convert `timestamp` to the city's local timezone (or apply a city-specific UTC offset) before extracting the hour. | **NEW** |
| H5 | **High** | `seed_demo.py` | 42–44 | **Crash on import if env vars are malformed.** `BATCH_SIZE = int(os.getenv("BATCH_SIZE", "500"))`, `BATCH_DELAY_SECONDS = float(...)`, and `DEFAULT_INGEST_TIMEOUT = float(...)` will raise `ValueError` at **module import time** if the env var contains non-numeric text (e.g., `"abc"`). The script crashes before `main()` is even called. | Wrap each in `try/except` or validate inside `run_seed()` / `main()`. | **NEW** |

---

## Medium Issues

| # | Severity | File | Line | Description | Fix Suggestion | Status |
|---|----------|------|------|-------------|---------------|--------|
| M1 | **Medium** | `seed_demo.py` | 392–405 | **Cleanup deletes ALL stations for the demo user, not just demo stations.** The `list_stations` + `delete_station` loop has no filter. If the demo account has manually created non-demo stations, they are destroyed. | Filter by station name pattern (e.g., names ending in `(city_name)` from the demo pool) or add a `--cleanup-all` vs `--cleanup-demo` flag. | **NEW** |
| M2 | **Medium** | `generators/reading_generator.py` | 80–85 | **PM10 can be less than PM2.5, which is physically impossible.** `_pm10_value` computes `pm25 * ratio + noise` with `ratio = 1.2–2.5`. If `noise` is strongly negative (e.g., `pm25=10, ratio=1.2, noise=-20`), `pm10` becomes `-8` → clamped to `0`. But `pm25` is `10`, so `pm10 < pm25`. Even with mild noise, `pm10` can be `12 - 5 = 7 < pm25=10`. PM10 is a superset of PM2.5 and must always be ≥ PM2.5. | Enforce `max(pm25, ...)` in the return: `return round(max(pm25, min(200.0, pm25 * ratio + noise)), 2)`. | **NEW** |
| M3 | **Medium** | `seed_demo.py` | 340–353 | **`wait_for_backend` considers any HTTP status < 500 as "up".** The probe checks `probe.status_code < 500`. If the backend returns `404 Not Found` or `401 Unauthorized`, the script reports "Backend is up." and continues. A proper health check should require `200 OK` from a known endpoint. | Check `probe.status_code == 200` and optionally validate the response body. | **NEW** |
| M4 | **Medium** | `mqtt/subscriber.py` | 234 | **`clean_session=True` (default) causes message loss on reconnect.** If the subscriber disconnects (network blip, broker restart), the broker discards any QoS 1 messages published during the outage because the session is not persistent. | Add `clean_session=False` to `mqtt.Client(...)` and ensure `client_id` is stable across reconnects. | **NEW** |
| M5 | **Medium** | `mqtt/subscriber.py` | 111–148 | **Worker thread is not restarted if it dies.** Although the worker now has a top-level `try/except` (Cycle 4 fix), if a fatal error like `MemoryError` or `SystemExit` occurs, the thread exits and is never restarted. The main thread does not poll `worker_thread.is_alive()`. Messages accumulate in the queue with no consumer. | Periodically check `worker_thread.is_alive()` in the main loop and restart the worker if it has died. | **STILL OPEN** (N3 partial) |
| M6 | **Medium** | `mqtt/subscriber.py` | 172–182 | **Drain timeout may be too short for large queues.** `_drain_and_shutdown` waits up to 5 seconds for the queue to drain. With a 1000-item queue and a slow backend (e.g., 2s per POST), draining takes ~2000s. The 5s timeout expires, `join()` times out, and `sys.exit(0)` kills the daemon worker, losing all remaining messages. | Make the shutdown timeout configurable (e.g., `--shutdown-timeout`) or compute it dynamically based on queue size and observed latency. | **STILL OPEN** (N2 partial) |
| M7 | **Medium** | `mqtt/subscriber.py` | 52–62 | **Gzip-compressing single-message payloads is wasteful.** `_post_with_retry` compresses a single reading (~150–250 bytes). Gzip overhead (~18 bytes header + Huffman table) often makes the compressed payload **larger** than the raw JSON, while adding CPU cost on both sides. | Only compress if payload size exceeds a threshold (e.g., 1 KB), or skip gzip for single-message forwards. | **NEW** |
| M8 | **Medium** | `seed_demo.py` | 407–431 | **Existing stations block ALL new readings.** If `cleanup=False` and existing stations are found, the script returns early with `readings_generated=0`. There is no way to append new historical readings to existing demo stations without deleting them first. | Add an `--append` flag that skips station creation but still generates and ingests readings for existing stations. | **NEW** |
| M9 | **Medium** | `seed_demo.py` | 392–405 | **Cleanup deletes stations but not their readings.** The backend may not cascade-delete readings. Orphaned reading rows without a matching station can accumulate, polluting the database and causing FK constraint issues. | After deleting stations, query and delete associated readings, or verify the backend has `ON DELETE CASCADE`. | **NEW** |
| M10 | **Medium** | `seed_demo.py` | 240 | **Idempotency key is random per call, not deterministic per batch.** `_ingest_with_payload` generates a new `uuid.uuid4()` for every HTTP request. If the script crashes and is re-run, the same logical batch gets a different key, so the backend cannot deduplicate duplicate insertions. | Generate a deterministic idempotency key from batch content (e.g., `hashlib.sha256` of station IDs + timestamp range + batch index). | **NEW** |
| M11 | **Medium** | `mqtt/config/mosquitto.conf` | 7 | **`allow_anonymous true` remains in production config.** No `password_file`, `acl_file`, or TLS. Acceptable only for a single-developer laptop. | Add `mosquitto.conf.production` template with auth and TLS, or document the security risk explicitly. | **STILL OPEN** (Issue 26) |
| M12 | **Medium** | `mqtt/subscriber.py` | 26–28 | **Crash on import if env vars are malformed.** `DEFAULT_MAX_QUEUE_SIZE`, `DEFAULT_INGEST_TIMEOUT`, and `DEFAULT_INGEST_RETRY` parse env vars with `int()`/`float()` at module import time. Malformed values crash the subscriber before `main()` is called. | Validate env vars inside `start_subscriber()` or `main()`, not at module level. | **NEW** |
| M13 | **Medium** | `mqtt/subscriber.py` | 293 | **Same crash-on-import for `MQTT_BROKER_PORT`.** `default=int(os.getenv("MQTT_BROKER_PORT", "1883"))` crashes on malformed env var. | Validate in `main()` or use a safe parse function with fallback. | **NEW** |

---

## Low Issues

| # | Severity | File | Line | Description | Fix Suggestion | Status |
|---|----------|------|------|-------------|---------------|--------|
| L1 | **Low** | `generators/station_factory.py` | 82 | **Incorrect type annotation.** `per_city: int = None` is invalid; a parameter typed as `int` cannot accept `None` without `Optional`. | Change to `per_city: Optional[int] = None`. | **NEW** |
| L2 | **Low** | `seed_demo.py` | 454–458 | **`merged` dict doesn't fallback to local coordinates on API null.** `api_station.get("latitude")` returns `None` if the API response omits the field, overwriting the local value with `None`. | Use `api_station.get("latitude", station["latitude"])` for both coordinate fields. | **NEW** |
| L3 | **Low** | `seed_demo.py` | 33–35 | **No env-var or CLI overrides for demo credentials / tier.** `DEMO_EMAIL`, `DEMO_PASSWORD`, and `DEMO_TIER` are hardcoded with no `--email`, `--password`, or `--tier` CLI flags. | Add corresponding CLI arguments and env-var fallbacks. | **NEW** |
| L4 | **Low** | `seed_demo.py` | 372 | **`duration_months=1` is hardcoded in `subscribe_user` call.** The demo always subscribes for exactly 1 month. | Make it configurable via CLI or env var. | **NEW** |
| L5 | **Low** | `seed_demo.py` | 503–506 | **`except Exception` in the batch loop is overly broad.** It catches `RuntimeError`, `ValueError`, `AttributeError`, etc. indiscriminately. While `KeyboardInterrupt` is safe (`BaseException`), the broad catch makes debugging harder. | Catch specific exceptions: `requests.RequestException`, `RuntimeError`, `ValueError`. | **NEW** |
| L6 | **Low** | `generators/reading_generator.py` | 160–161 | **`end_time` does not truncate microseconds.** If `generate_readings_for_station` is called directly (without `seed_demo.py`'s truncation), timestamps include fractional seconds. | Truncate microseconds: `datetime.now(timezone.utc).replace(microsecond=0)`. | **NEW** |
| L7 | **Low** | `docker-compose.mqtt.yml` | 1–15 | **No `healthcheck` stanza for the Mosquitto service.** Docker Compose cannot detect if the broker is actually listening on 1883, leading to false "healthy" states during startup. | Add `healthcheck: test: ["CMD", " mosquitto_pub", "-t", "test", "-m", "ok"]` or a port-check. | **NEW** |
| L8 | **Low** | `requirements.txt` | 1 | **`requests>=2.31.0` has no upper bound.** A future major version of `requests` could introduce breaking changes (e.g., API changes in `Session` or `Retry`). | Pin to a known-safe range: `requests>=2.31.0,<3.0.0`. | **NEW** |
| L9 | **Low** | `mqtt/subscriber.py` | 88 | **408 Request Timeout not included in retry list.** `_post_with_retry` retries 429/500/502/503/504 but omits 408, a common transient timeout from proxies/load balancers. | Add `408` to the retry status list. | **NEW** |
| L10 | **Low** | `mqtt/publisher.py` | 21–22 | **`_on_publish` callback is empty.** While harmless, it suppresses the ability to track publish confirmations asynchronously. | Log publish confirmations or remove the no-op callback. | **NEW** |
| L11 | **Low** | `mqtt/publisher.py` | 100–101 | **Disconnection order is suboptimal.** `client.loop_stop()` is called before `client.disconnect()`. While `wait_for_publish()` already confirmed the last message, the standard pattern is `disconnect()` then `loop_stop()` to ensure the DISCONNECT packet is sent while the loop is running. | Swap the order: `client.disconnect()` first, then `client.loop_stop()`. | **NEW** |
| L12 | **Low** | `seed_demo.py` | 501 | **Redundant `isinstance(result, dict)` check.** `result` is always a `dict` because `_unwrap` returns `body.get("data", body)` which is always a dict for the ingest endpoint. | Simplify to `inserted = result.get("inserted", "?")`. | **NEW** |
| L13 | **Low** | `README.md` | 89–91 | **Troubleshooting section is outdated.** It mentions increasing `BATCH_DELAY` in `seed_demo.py` (code edit), but `--batch-delay` and `--batch-size` CLI flags exist and are not documented. | Document `--batch-delay`, `--batch-size`, `--ingest-timeout`, and `--wait-for-backend` CLI flags. | **NEW** |

---

## Summary

### Resolved Since Cycle 4 (15 issues)

| Issue | Resolution |
|-------|------------|
| Issue 15 (hardcoded `BATCH_DELAY_SECONDS`) | Now configurable via `BATCH_DELAY_SECONDS` env var, `--batch-delay` CLI flag, and adaptive rate-limiting logic in the batch loop. |
| Issue 20 (subscriber no retry) | `_post_with_retry` implements per-message retry with exponential backoff and 413 handling. |
| Issue 25 (floating Mosquitto tag) | Pinned to `eclipse-mosquitto:2.0.18` in `docker-compose.mqtt.yml`. |
| N1 (unbounded queue) | `queue.Queue(maxsize=...)` with `maxsize` configurable via `MQTT_MAX_QUEUE_SIZE` env var. |
| N4 (hardcoded tier limits) | `seed_demo.py` now queries `/api/v1/pricing` dynamically and falls back to the backend's advertised limits. |
| Plus 10 additional Low issues from Cycle 4 | Various import cleanups, type-hint fixes, `sys.exit(1)` on errors, `User-Agent` header, `Content-Type` redundancy removal, empty-readings guard, `SIGTERM` handler, `wait_for_publish` confirmation, `is_connected` polling, `UnicodeDecodeError` catch, `microsecond` truncation in seeder, `Optional[List[str]]` fix, `BATCH_SIZE` validation, `stations_created` only counts API successes. |

### Still Open from Cycle 4 (3 issues)

| Issue | Status |
|-------|--------|
| Issue 26 (`allow_anonymous true`) | No production auth template added; still documented as dev-only. |
| N2 (message loss on shutdown) | `_drain_and_shutdown` added but the 5s timeout is often insufficient for large queues. |
| N3 (silent worker death) | Top-level `try/except` added but worker is still not restarted on fatal exit. |

### New in Cycle 6 (20 issues)

The most significant new findings are:

1. **README password mismatch (H1):** The README documents the wrong password, directly breaking the manual-login workflow.
2. **Hardcoded credentials (H2):** `DEMO_EMAIL` and `DEMO_PASSWORD` are baked into source code with no env-var escape hatch.
3. **Non-reentrant `run_seed()` (H3):** `global API_BASE` mutation makes the function unsafe for programmatic reuse or concurrent testing.
4. **UTC-hour diurnal bug (H4):** All cities outside UTC have their temperature curves shifted by their timezone offset, producing physically wrong data (e.g., Tokyo's warmest reading at 21:00 local time).
5. **Import-time crashes (H5, M12, M13):** Malformed env vars cause `ValueError` at module import before any CLI help or validation can run.
6. **Destructive cleanup (M1):** `--cleanup` deletes every station for the demo user, not just demo-created ones.
7. **PM10 < PM2.5 physics violation (M2):** The `_pm10_value` generator can emit values below the corresponding PM2.5 reading, which is impossible.
8. **No persistent MQTT session (M4):** Subscriber uses `clean_session=True`, so any broker disconnect causes permanent message loss for QoS 1 traffic.
9. **Gzip overhead on single messages (M7):** Compressing ~200-byte single-message payloads is CPU-negative and can inflate size.
10. **Non-deterministic idempotency (M10):** Random UUIDs per request mean the backend cannot deduplicate across script reruns.

### Recommendation

Do not promote the data pipeline to production-like environments until the **High** issues are addressed, especially:
- Fix the README password (H1).
- Move credentials out of source code (H2).
- Remove the `global API_BASE` mutation (H3).
- Apply city-local timezone offsets to the diurnal temperature model (H4).
- Guard all env-var parsing against malformed input (H5, M12, M13).

Additionally, resolve the remaining **Medium** issues before running the subscriber in any staging environment:
- Add `clean_session=False` (M4) to prevent message loss.
- Scope `--cleanup` to demo stations only (M1).
- Fix the PM10 lower bound (M2).
- Make the shutdown drain timeout configurable (M6).
- Add worker restart logic (M5).

---
*End of QA Cycle 6 Data Pipeline Re-Review Report*
