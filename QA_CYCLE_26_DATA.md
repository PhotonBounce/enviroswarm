# QA Cycle 26 — Data Pipeline Review

**Status**: ❌ FAIL — Critical/High issues found.  
**Total issues**: 2 (1 Critical + 1 High)  
**Scope**: All Python files in `data-pipeline/`, plus `docker-compose.mqtt.yml` and mosquitto configs  
**Date**: 2026-07-01

---

## Critical Issues

### 1. Broken MQTT backpressure — `manual_ack` API incompatibility with pinned paho-mqtt v1.x
- **Severity**: Critical
- **File**: `mqtt/subscriber.py`
- **Lines**: 250–252, 357
- **Issue**: The subscriber sets `client.manual_ack = True` (line 357) and calls `client.ack(msg.mid)` (line 252). These are **paho-mqtt v2.x APIs**, but `requirements.txt` pins `paho-mqtt>=1.6.1,<2.0.0`. In paho-mqtt v1.6.1, `manual_ack` does not exist and `ack()` is not a method. The `_ack_if_needed` wrapper catches the `AttributeError` and logs a warning, but the v1.x library **automatically PUBACKs QoS 1 messages when `on_message` returns**.

  This means when the inbound queue is full and the code intentionally drops the message (lines 270–273), the message is still acked to the broker. The broker thinks delivery succeeded and will never redeliver, causing **silent data loss** — the backpressure mechanism is completely broken.
- **Fix**: Choose one of the following paths:
  - **Option A (recommended)**: Upgrade to `paho-mqtt>=2.0.0` and update the `Client` constructor to use `CallbackAPIVersion`:
    ```python
    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=client_id or f"enviroswarm-sub-{uuid.uuid4().hex[:8]}",
        clean_session=False,
    )
    client.manual_ack = True  # now valid in v2.x
    ```
  - **Option B**: Remove the manual-ack logic entirely for v1.x and accept that backpressure via non-ack is not possible with paho-mqtt v1.x. Implement an alternative backpressure mechanism (e.g., set `client.max_queued_messages` or pause the network loop when the queue is full).

---

## High Issues

### 2. `_drain_and_shutdown` does not actually drain the queue
- **Severity**: High
- **File**: `mqtt/subscriber.py`
- **Lines**: 278–298
- **Issue**: The function `_drain_and_shutdown` logs `"Draining queue (%s items remaining)..."` but only sets `stop_event` and waits for the worker thread to finish. The worker thread's shutdown flush (lines 201–218) only processes its current `batch` list (up to `batch_size` items, default 50). Any messages still sitting in the `queue.Queue` (up to `max_queue_size` items, default 1000) are **not processed** and are lost when the process exits. This is data loss during graceful shutdown (e.g., Docker SIGTERM, Kubernetes rolling update, or `Ctrl+C`).
- **Fix**: Extend the worker's shutdown flush to drain the queue before exiting. After the existing batch-flush block, add a queue-drain loop:
  ```python
  # After the existing "if batch:" flush block in the worker:
  try:
      while True:
          payload = q.get_nowait()
          batch.append(payload)
          if len(batch) >= batch_size:
              try:
                  ok = _post_with_retry(
                      session, api_base, batch, auth_token, ingest_timeout, max_retries
                  )
                  if not ok:
                      _persist_dead_letter(batch, "api_retry_exhausted")
              except Exception as e:
                  logger.error("[MQTT Sub] Unhandled worker error during POST: %s", e)
                  _persist_dead_letter(batch, "worker_exception")
              finally:
                  for _ in batch:
                      try:
                          q.task_done()
                      except ValueError:
                          logger.debug("task_done() failed")
              batch = []
  except queue.Empty:
      pass
  
  # Final flush of any remaining partial batch
  if batch:
      ...
  ```
  Also consider increasing the `join` timeout in `_drain_and_shutdown` when the queue is large, or processing the remaining queue directly in `_drain_and_shutdown` after the worker exits.

---

## Notes (non-issues)

- **Security / Credentials**: No hardcoded secrets, passwords, or API keys were found. `DEMO_PASSWORD` and `AUTH_TOKEN` are read from environment variables. The `docker-compose.mqtt.yml` correctly binds to `127.0.0.1` only, and the `mosquitto.conf` is explicitly marked as local-development-only with appropriate warnings.
- **TLS**: None of the Python MQTT clients configure TLS. This is acceptable for the local-dev default, but production deployments must pass `tls_set()` / `tls_set_context()` parameters.
- **Race conditions / Memory growth**: No unbounded memory growth or classic race conditions were found. The queue is bounded (`max_queue_size`), and batch sizes are capped.
- **Blocking I/O in async paths**: There are no `async`/`await` paths in the codebase; all I/O is synchronous and runs in dedicated threads, which is acceptable for this architecture.
- **Docker compose**: The `user: "1883:1883"` mapping in `docker-compose.mqtt.yml` is appropriate for the `eclipse-mosquitto:2.0.18` image, which runs as UID 1883 by default.
