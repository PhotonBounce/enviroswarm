# QA Cycle 24 — Data Pipeline Review

**Status**: ⚠️ REVIEW — 1 High issue found
**Total issues**: 7 (1 High, 4 Medium, 2 Low)
**Scope**: All Python files in `data-pipeline/` + docker-compose + mosquitto configs
**Date**: 2026-07-01

---

## Critical Issues

*None found.*

---

## High Issues

### 1. Positional argument mismatch in `_start_worker()` causes silent parameter mis-mapping and complete breakage

- **Severity**: High
- **File**: `mqtt/subscriber.py`, lines 307–309
- **Issue**: `start_subscriber()` calls `_start_worker()` with positional arguments, but the argument order is wrong. Specifically:
  - `ingest_timeout` (5th arg) is passed where `_start_worker` expects `batch_size`
  - `max_retries` (6th arg) is passed where `_start_worker` expects `ingest_timeout`
  - `max_retries` (7th parameter) falls back to its default (`DEFAULT_INGEST_RETRY = 3`)

  **Impact**:
  - `batch_size` is silently set to the value of `ingest_timeout` (default 10.0 instead of 50)
  - `ingest_timeout` is silently set to the value of `max_retries` (default 3 instead of 10)
  - `max_retries` is hard-coded to 3 regardless of what the caller passes
  - If a user passes `--max-retries 0` (which passes validation), `batch_size` becomes `0` and `ingest_timeout` becomes `0`. Every POST times out immediately, and the subscriber is completely non-functional.

- **Fix**: Change the call to use keyword arguments to eliminate the positional mismatch:

```python
q, stop_event, thread_ref = _start_worker(
    session,
    api_base,
    auth_token,
    max_queue_size=max_queue_size,
    batch_size=DEFAULT_BATCH_SIZE,  # or expose batch_size in start_subscriber()
    ingest_timeout=ingest_timeout,
    max_retries=max_retries,
)
```

  Additionally, consider exposing `--batch-size` in the CLI so the batch size is configurable rather than hard-coded.

---

## Medium Issues

### 2. MQTT publisher lacks TLS configuration option

- **Severity**: Medium
- **File**: `mqtt/publisher.py`, lines 25–60
- **Issue**: `publish_readings()` has no parameters or code path to enable TLS (`client.tls_set()`). For any production deployment over the public internet, credentials and sensor payloads would be transmitted in plaintext.
- **Fix**: Add optional `tls_cafile`, `tls_certfile`, `tls_keyfile` parameters and call `client.tls_set()` before `connect()` when provided.

### 3. MQTT subscriber lacks TLS configuration option

- **Severity**: Medium
- **File**: `mqtt/subscriber.py`, lines 265–338
- **Issue**: `start_subscriber()` has no TLS configuration parameters. The MQTT client connects to `broker_host:broker_port` in plaintext. Combined with the default `allow_anonymous true` in the active mosquitto config, this creates a production-readiness gap.
- **Fix**: Add optional TLS parameters to `start_subscriber()` and `main()`, and call `client.tls_set()` before `connect()` when provided.

### 4. Default mosquitto config allows anonymous access

- **Severity**: Medium
- **File**: `mqtt/config/mosquitto.conf`, line 7
- **Issue**: `allow_anonymous true` is active in the default config. While explicitly documented as "demo only", the default config is what Docker mounts on a fresh clone. A developer could accidentally deploy this config to a reachable environment without switching to `mosquitto.conf.production`.
- **Fix**: Set `allow_anonymous false` in the default config and provide a `mosquitto.conf.development` file that explicitly opts in to anonymous mode for local use. Or add a startup check in the subscriber that warns when connecting to an anonymous broker without TLS.

### 5. Cleanup in seed_demo only runs on successful completion

- **Severity**: Medium
- **File**: `seed_demo.py`, lines 598–605
- **Issue**: The `--cleanup` logic lives inside the `try` block, not a `finally` block. If an exception occurs during seeding (e.g., API timeout, network error), the demo stations created in that run are never deleted, leaving orphaned data.
- **Fix**: Move the cleanup loop into the `finally` block so it always executes (when `cleanup=True` and `dry_run=False` and `created_station_ids` is non-empty), even if an exception was raised earlier.

---

## Low Issues

### 6. Publisher uses short random client IDs with collision risk

- **Severity**: Low
- **File**: `mqtt/publisher.py`, line 51
- **Issue**: `client_id` defaults to `enviroswarm-pub-{random.randint(1000,9999)}`. If multiple publisher instances run concurrently (e.g., parallel seeding jobs), there is a ~1/9000 chance of client ID collision. When two MQTT clients share the same ID, the broker disconnects the older connection, causing intermittent publish failures.
- **Fix**: Use `uuid.uuid4().hex` (like the subscriber does) or accept a mandatory `client_id` in production contexts.

### 7. Drain shutdown doesn't account for in-flight batches

- **Severity**: Low
- **File**: `mqtt/subscriber.py`, lines 240–262
- **Issue**: `_drain_and_shutdown()` spins on `q.empty()` to wait for the queue to drain, but it has no visibility into whether the worker thread is currently processing a batch that was already pulled from the queue. The `thread_ref["thread"].join()` timeout is calculated as `timeout - time_spent_waiting_for_queue`, which may leave very little time for the worker to finish its current POST if the queue was slow to drain.
- **Fix**: Track an "in-flight" flag (e.g., `threading.Event` set when the worker starts a batch and cleared when it finishes) and wait for both `q.empty()` AND `not in_flight` before beginning the join countdown.

---

## Summary

- **Critical**: 0
- **High**: 1 (positional argument bug in `_start_worker` call)
- **Medium**: 4 (missing TLS in publisher/subscriber, anonymous mosquitto default, cleanup not in finally)
- **Low**: 2 (client ID collision risk, shutdown race with in-flight batches)

**Recommendation**: Fix the High-severity positional argument mismatch before any production deployment. The Medium issues should be addressed in the next sprint to harden the pipeline for production use.
