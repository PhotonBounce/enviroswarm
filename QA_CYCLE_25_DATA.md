# QA Cycle 25 — Data Pipeline Review

**Status**: ❌ FAIL — Critical and High issues found.  
**Total issues**: 10 (2 Critical, 3 High, 3 Medium, 2 Low)  
**Scope**: All Python files in `data-pipeline/` + `docker-compose.mqtt.yml` + `mqtt/config/mosquitto.conf`  
**Date**: 2026-07-01  

---

## Critical Issues

### 1. Permanent data loss on API ingest failure (Subscriber)
- **Severity**: Critical  
- **File**: `mqtt/subscriber.py`, lines 147–158, 163–175, 178–191  
- **Issue**: When `_post_with_retry` exhausts all retries and returns `False`, the worker thread calls `q.task_done()` for every item in the batch and then discards the batch permanently. There is no dead-letter queue, disk buffering, or re-queue mechanism. Messages that were successfully received from the MQTT broker are silently lost.  
- **Fix**: When `_post_with_retry` returns `False`, do not call `q.task_done()`; instead, re-enqueue the batch items (or write to a local dead-letter file) and implement exponential backoff before retrying. Alternatively, change the worker to only call `task_done()` after the API returns success.

### 2. Unrecoverable data loss when inbound queue is full (Subscriber)
- **Severity**: Critical  
- **File**: `mqtt/subscriber.py`, lines 233–235  
- **Issue**: The `on_message` callback uses `q.put_nowait(payload)` and drops the message when the queue is full. Because paho-mqtt v1.x auto-acknowledges QoS 1 messages **before** invoking `on_message`, the broker believes the message was delivered. The dropped messages are gone forever with no recovery path.  
- **Fix**: Either (a) switch to QoS 0 so the broker does not expect delivery guarantees, or (b) implement a blocking backpressure strategy (e.g., `q.put(block=True, timeout=…)` with a graceful MQTT disconnect before the queue overflows) so the broker buffers messages instead. Alternatively, upgrade to paho-mqtt v2 and use the callback API to defer PUBACK until the message is safely queued.

---

## High Issues

### 3. Shutdown race condition kills worker mid-flight, causing batch loss
- **Severity**: High  
- **File**: `mqtt/subscriber.py`, lines 240–262, 327–330  
- **Issue**: `_drain_and_shutdown` waits for `q.empty()` but does not account for a batch that has already been removed from the queue and is currently being POSTed by the worker. If the drain timeout expires, the signal handler calls `sys.exit(0)`, which terminates the daemon worker thread while it is in the middle of an HTTP request. The batch in flight is lost.  
- **Fix**: In `_drain_and_shutdown`, set `stop_event` immediately, then join the worker with the **full** timeout (not the remaining timeout after queue polling). Only call `client.disconnect()` and `sys.exit()` after `thread_ref["thread"].join()` returns. If the worker is still alive after the full timeout, log a warning and call `sys.exit()`; accept that the in-flight batch may be lost but document this behavior.

### 4. Worker thread crash loses in-flight batch
- **Severity**: High  
- **File**: `mqtt/subscriber.py`, lines 137–193, 200–211  
- **Issue**: The `batch` list is local to the worker function. If the worker thread crashes (e.g., `SystemExit`, `KeyboardInterrupt`, or a non-`Exception` base exception), the watcher respawns it, but the `batch` variable is gone. The items already removed from the queue via `q.get()` are permanently lost.  
- **Fix**: Wrap the worker body in a broad `except BaseException` handler that logs the exception and persists the current `batch` to a dead-letter file before re-raising. Alternatively, use a `multiprocessing.Queue` or disk-backed queue so items survive process/thread crashes.

### 5. Unauthenticated MQTT broker exposed to host network
- **Severity**: High  
- **File**: `docker-compose.mqtt.yml` (lines 5–7) + `mqtt/config/mosquitto.conf` (lines 1–8)  
- **Issue**: The Docker Compose file maps ports `1883:1883` and `9001:9001` to the host. The active `mosquitto.conf` has `allow_anonymous true` with no password file and no TLS. Any device on the local network can publish, subscribe, and potentially inject malicious sensor data into the pipeline. Even though this is intended for local development, the active configuration is a security vulnerability if deployed on any shared network.  
- **Fix**: For the default dev config, bind Mosquitto to `127.0.0.1` only (`listener 1883 127.0.0.1`) and add a commented-out password file path with instructions. In `docker-compose.mqtt.yml`, add a note that this must not be used in production without switching to `mosquitto.conf.production`.

---

## Medium Issues

### 6. Ineffective MQTT persistent session configuration
- **Severity**: Medium  
- **File**: `mqtt/subscriber.py`, line 317  
- **Issue**: The subscriber sets `clean_session=False` but generates a random `client_id` using `uuid.uuid4().hex[:8]`. If the subscriber reconnects, the broker has no session state for the new client ID, so the persistent session feature is completely ineffective.  
- **Fix**: Either use a deterministic client ID (e.g., derived from the host name or a stable config value) so the broker can resume the session, or set `clean_session=True` to accurately reflect the non-persistent behavior.

### 7. Risk of duplicate POST retries on transient failures
- **Severity**: Medium  
- **File**: `seed_demo.py`, lines 54–66  
- **Issue**: The `requests` HTTP adapter is configured to retry `POST` requests on 429/5xx errors (`allowed_methods=["POST", "GET", "DELETE"]`). While the code sends an `X-Idempotency-Key`, the subscriber (`mqtt/subscriber.py`) does **not** use the same retry adapter. More importantly, if the backend ingest API does not strictly honor the idempotency key for every retry attempt, duplicate readings could be inserted.  
- **Fix**: In `seed_demo.py`, remove `"POST"` from `allowed_methods` in the retry adapter and rely on the explicit application-level retry logic already present in `ingest_bulk`. Or, verify that the backend idempotency implementation is atomic and covers the full retry window.

### 8. Publisher lacks TLS and authentication options
- **Severity**: Medium  
- **File**: `mqtt/publisher.py`, lines 25–117  
- **Issue**: `publish_readings` connects to the MQTT broker in plaintext with no TLS and no authentication support. The function signature accepts `broker_host` and `broker_port` but offers no `tls_context`, `cafile`, `username`, or `password` parameters. In a production environment, this would transmit sensor data unencrypted.  
- **Fix**: Add optional `tls_cafile`, `username`, and `password` parameters to `publish_readings`. If provided, call `client.tls_set()` and `client.username_pw_set()` before `client.connect()`.

---

## Low Issues

### 9. Unbounded memory growth in reading generator for large history ranges
- **Severity**: Low  
- **File**: `generators/reading_generator.py`, lines 214–217  
- **Issue**: `generate_readings_for_station` pre-computes all timestamps into an `intervals` list before iterating. For very large `days` values (e.g., years of history), this list can consume significant memory.  
- **Fix**: Convert the pre-computed list to a generator that yields timestamps on demand, eliminating the `intervals` list entirely:
  ```python
  current = start_time
  while current <= end_time:
      yield current
      current += timedelta(minutes=interval_minutes)
  ```

### 10. Signal handler only covers SIGTERM, not SIGINT
- **Severity**: Low  
- **File**: `mqtt/subscriber.py`, line 332  
- **Issue**: Only `SIGTERM` is registered. On Unix, `Ctrl+C` sends `SIGINT` which raises `KeyboardInterrupt` in the main thread. The `try/except KeyboardInterrupt` blocks do call `_drain_and_shutdown`, so the behavior is correct. However, registering `SIGINT` explicitly would make the shutdown path more robust and consistent across platforms.  
- **Fix**: Add `signal.signal(signal.SIGINT, _signal_handler)` alongside the existing `SIGTERM` handler.

---

## Summary

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 2     | Data loss (2) |
| High     | 3     | Race condition / data loss (2), Security (1) |
| Medium   | 3     | Incorrect MQTT pattern, Idempotency risk, Missing TLS |
| Low      | 2     | Memory, Signal handling |
| **Total**| **10**|            |

**Recommendation**: Do not promote this pipeline to production until the **Critical** data-loss issues (1 and 2) are addressed. The **High** shutdown race condition (3) and the **High** security vulnerability (5) should be resolved before any staging deployment.
