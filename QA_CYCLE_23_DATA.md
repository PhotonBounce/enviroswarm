# QA Cycle 23 — Data Pipeline Review

**Status**: ❌ FAIL — Issues found.

**Scope**: All Python files, Docker Compose, MQTT config, and README in `data-pipeline/`
**Date**: 2026-07-01
**Reviewer**: Senior QA Engineer (Zero-Defect Protocol)

---

## Executive Summary

A comprehensive review of the ENViroSwarm data pipeline revealed **multiple critical and high-severity issues** across security, correctness, performance, and maintainability. The most severe findings are **credential exposure via CLI arguments** (`--password`, `--auth-token`) and **absence of batching in the MQTT subscriber**, which will cause severe API pressure under any realistic load.

---

## 1. Security Issues

### CRITICAL-SE1: Password Exposed via CLI Argument and `--help`
- **Severity**: Critical
- **File**: `seed_demo.py`
- **Line**: 649–654
- **Issue**: `parser.add_argument("--password", type=str, default=DEMO_PASSWORD, ...)` passes the password as a CLI argument. This exposes it in process command lines (`ps`, `/proc/*/cmdline`), shell history, and audit logs. Additionally, `argparse` automatically appends the default value to `--help`, meaning if `DEMO_PASSWORD` is set, the password is printed in plain text when users run `--help`. The `help` text claims `default: ***hidden***`, which is misleading.
- **Fix**: Remove `--password` from argparse. Read exclusively from the `DEMO_PASSWORD` environment variable. For interactive use, use `getpass.getpass()`. If argparse is required, use `default=argparse.SUPPRESS` and retrieve the value from `os.environ` if `args.password` is absent.

### CRITICAL-SE2: Auth Token Exposed via CLI Argument and `--help`
- **Severity**: Critical
- **File**: `mqtt/subscriber.py`
- **Line**: 355–358
- **Issue**: `parser.add_argument("--auth-token", default=os.getenv("AUTH_TOKEN", None), ...)` has the same `argparse` default-leakage vulnerability. If `AUTH_TOKEN` is set, the token is printed in `--help` output and visible in process lists.
- **Fix**: Use `default=argparse.SUPPRESS` and read the token from `os.environ["AUTH_TOKEN"]` directly if `args.auth_token` is not provided.

### MED-SE3: No MQTT TLS/SSL Support
- **Severity**: Medium
- **File**: `mqtt/publisher.py` (55–56), `mqtt/subscriber.py` (286–287)
- **Issue**: Both `publish_readings()` and `start_subscriber()` connect to the MQTT broker over plaintext TCP. There are no parameters to enable TLS, meaning credentials and sensor data are transmitted unencrypted in any non-local deployment.
- **Fix**: Add optional `tls_cafile`, `tls_certfile`, `tls_keyfile` parameters. If provided, call `client.tls_set()` before `client.connect()`.

### MED-SE4: README Recommends Insecure `--password` Flag
- **Severity**: Medium
- **File**: `README.md`
- **Line**: 30
- **Issue**: The README explicitly states: "You can also override it per-run with `--password`." This actively encourages users to expose secrets in shell history and process lists.
- **Fix**: Remove the recommendation. Direct users to use the `DEMO_PASSWORD` environment variable exclusively.

### MED-SE5: No MQTT Topic Wildcard Sanitization
- **Severity**: Medium
- **File**: `mqtt/publisher.py` (84–86)
- **Issue**: `topic = f"{topic_prefix}/{station_id}/{sensor_type}"` interpolates raw strings into an MQTT topic. If `station_id` or `sensor_type` contains `#` or `+`, the topic hierarchy breaks or causes unintended broad subscriptions.
- **Fix**: Sanitize topic components by replacing `#` and `+` with safe characters (e.g., `_`) before interpolation, or validate and reject them.

---

## 2. Correctness Issues

### HIGH-CO1: Subscriber Lacks Batching — One HTTP POST per MQTT Message
- **Severity**: High
- **File**: `mqtt/subscriber.py` (56–64, 118–170)
- **Issue**: The worker thread drains the queue one item at a time, wrapping each payload in a single-element list (`body = {"readings": [payload]}`) and sending one HTTP POST per message. Under any realistic load, this will overwhelm the ingest API with connection overhead and serial latency.
- **Fix**: Refactor the worker to accumulate messages from the queue (time-based or size-based window) and POST them in batches. The backend already supports `{"readings": [...]}` with multiple items.

### HIGH-CO2: Graceful Drain Does Not Guarantee Queue Empty
- **Severity**: High
- **File**: `mqtt/subscriber.py` (198–220)
- **Issue**: `_drain_and_shutdown()` passively polls `q.empty()` for up to 30s, then sets `stop_event`. The worker thread exits immediately upon seeing `stop_event`, leaving any remaining queued items unprocessed. This causes data loss under backpressure or slow API conditions.
- **Fix**: Use a sentinel value (e.g., `None`) injected into the queue to signal the worker to finish after draining all preceding items. Alternatively, keep `stop_event` unset during the drain phase and call `q.join()` after the worker finishes.

### MED-CO3: Naive `end_time` Causes Runtime Crash
- **Severity**: Medium
- **File**: `reading_generator.py` (194)
- **Issue**: `end_time = (end_time or datetime.now(timezone.utc)).replace(microsecond=0)` accepts a naive `datetime`. If the caller passes one, `_local_hour()` later calls `timestamp.astimezone(tz)`, which raises `TypeError: astimezone() cannot be applied to a naive datetime`.
- **Fix**: Validate `end_time` with `if end_time.tzinfo is None: raise ValueError("end_time must be timezone-aware")` or coerce it to UTC via `.replace(tzinfo=timezone.utc)`.

### MED-CO4: Missing Station ID Validation
- **Severity**: Medium
- **File**: `reading_generator.py` (207)
- **Issue**: `station_id = station.get("id")` allows `None`. This propagates to readings with `"station_id": None` and MQTT topics containing `None/`, which the backend may reject or misroute.
- **Fix**: Validate required keys: `if not station.get("id"): raise ValueError("station must contain a valid 'id'")`. Also validate `sensor_types` and `city`.

### MED-CO5: Orphaned Persistent MQTT Sessions
- **Severity**: Medium
- **File**: `mqtt/subscriber.py` (269–271)
- **Issue**: `clean_session=False` with a randomly generated `client_id` (UUID hex prefix) means every invocation creates a new persistent session on the broker that is never resumed. This leaks broker state and memory over time.
- **Fix**: Either default `clean_session=True` for random IDs, or require the caller to provide a stable `client_id` when `clean_session=False`.

### MED-CO6: Signal Handler Registered Inside Library Function
- **Severity**: Medium
- **File**: `mqtt/subscriber.py` (278–284)
- **Issue**: `start_subscriber()` calls `signal.signal(signal.SIGTERM, _signal_handler)`. This is inappropriate for a reusable library function. If called from a non-main thread, it raises `ValueError`. It also silently overwrites any previously registered handler.
- **Fix**: Move signal registration to the `main()` CLI entry point. Expose a shutdown callback or `threading.Event` for programmatic use.

### LOW-CO7: Docker Compose v1 Command Reference
- **Severity**: Low
- **File**: `docker-compose.mqtt.yml` (20–21)
- **Issue**: Comments reference `docker-compose` (Compose v1, now deprecated/removed on newer systems) instead of `docker compose` (Compose v2).
- **Fix**: Update comments to `docker compose -f docker-compose.mqtt.yml up -d`.

---

## 3. Performance Issues

### HIGH-PE1: Unbounded Memory Growth in Reading Generator
- **Severity**: High
- **File**: `reading_generator.py` (336–347)
- **Issue**: `generate_all_readings()` accumulates every reading for every station into a single Python list before returning. For large parameters (e.g., 1000 stations × 365 days × 4 readings/hour × 6 sensors), this can consume multiple gigabytes of RAM.
- **Fix**: Convert to a generator (`yield from readings`) or accept a callback/batch size so consumers can process readings incrementally without holding the entire dataset in memory.

### MED-PE2: Per-Message Publish Blocking
- **Severity**: Medium
- **File**: `mqtt/publisher.py` (97–98)
- **Issue**: `info.wait_for_publish(timeout=5)` with `qos=1` blocks the loop for each individual message, waiting for PUBACK. Combined with `delay_seconds=0.01`, this makes bulk publishing throughput extremely low.
- **Fix**: For high-throughput demo publishing, use `qos=0` (fire-and-forget). If `qos=1` is required, publish all messages first, then call `wait_for_publish()` only on the last `MQTTMessageInfo` to confirm the batch.

### MED-PE3: No Backpressure Metrics or Counters
- **Severity**: Medium
- **File**: `mqtt/subscriber.py` (191–193)
- **Issue**: When the queue is full, messages are dropped with a `print`, but there is no metric, counter, or structured log for dropped messages. This makes it impossible to observe data loss in production.
- **Fix**: Add a `dropped_messages` counter (or use `logging.warning`) and optionally expose it via a health endpoint or Prometheus metric.

---

## 4. Maintainability Issues

### MED-MA1: `print` Statements Used Instead of Logging
- **Severity**: Medium
- **File**: `mqtt/publisher.py` (multiple), `mqtt/subscriber.py` (multiple), `seed_demo.py` (multiple)
- **Issue**: All modules use `print()` for diagnostics. `print` bypasses log levels, timestamps, and structured formatting. It also cannot be redirected to files or centralized log aggregators without shell redirection.
- **Fix**: Replace all `print` statements with `logging.getLogger(__name__).info/debug/warning/error()`. Configure `logging.basicConfig()` in `main()` entry points.

### MED-MA2: Duplicated Sensor Clamp Logic and Magic Numbers
- **Severity**: Medium
- **File**: `reading_generator.py` (276–305)
- **Issue**: Outlier clamping logic repeats hardcoded min/max values (e.g., `100.0`, `600.0`, `150.0`) that already appear in the generation functions. This is a maintenance hazard: changing a range in one place requires remembering to update the clamp.
- **Fix**: Define a single `_SENSOR_LIMITS` dictionary at module level (e.g., `{"co2": (350, 600), ...}`) and use it for both generation and outlier clamping.

### MED-MA3: Function-Level Constants Redefined on Every Call
- **Severity**: Medium
- **File**: `reading_generator.py` (56–62, 92–95, 103, 122–124)
- **Issue**: `city_bases`, `urban_bump`, and noise base constants are defined as local dicts inside functions. They are recreated on every invocation, wasting CPU and memory.
- **Fix**: Move immutable lookup tables to module-level constants.

### LOW-MA4: Misleading Variable Name in Drain Logic
- **Severity**: Low
- **File**: `mqtt/subscriber.py` (203)
- **Issue**: `remaining = time.monotonic() - drain_start` computes *elapsed* time, not remaining time. The math works because `timeout - remaining` is used later, but the name is confusing.
- **Fix**: Rename to `elapsed`.

### LOW-MA5: Non-Cryptographic Random for Client IDs
- **Severity**: Low
- **File**: `mqtt/publisher.py` (51)
- **Issue**: `random.randint(1000, 9999)` is used for publisher client ID suffixes. `random` is not cryptographically secure and has a small collision space.
- **Fix**: Use `secrets.token_hex(4)` for client ID generation.

---

## 5. Standards Issues

### MED-ST1: Missing Type Hints in MQTT Callbacks
- **Severity**: Medium
- **File**: `mqtt/publisher.py` (14, 21), `mqtt/subscriber.py` (32, 40, 175)
- **Issue**: `_on_connect`, `_on_publish`, `_on_disconnect`, and `_on_message` lack type annotations for parameters (`client`, `userdata`, `flags`, `rc`, `mid`, `msg`). This hinders IDE support and static analysis.
- **Fix**: Add full type hints. For paho-mqtt 1.6.x, use `mqtt.Client`, `Any`, `Dict[str, int]`, `int`, `mqtt.MQTTMessage` as appropriate.

### MED-ST2: Missing Type Hint in `generate_all_readings` Return
- **Severity**: Medium
- **File**: `reading_generator.py` (336–347)
- **Issue**: The function signature is correct, but the implementation builds a massive list in memory. The type hint is correct (`List[Dict[str, Any]]`), but the pattern is non-idiomatic for large datasets.
- **Fix**: (Same as HIGH-PE1) Consider returning `Iterator[Dict[str, Any]]` or `Generator[Dict[str, Any], None, None]`.

### LOW-ST3: `__init__.py` Files Lack Package Exports
- **Severity**: Low
- **File**: `generators/__init__.py`, `mqtt/__init__.py`
- **Issue**: Both package `__init__.py` files contain only a comment. They do not expose the public API, forcing consumers to import from submodules directly.
- **Fix**: Add `from .reading_generator import generate_readings_for_station, generate_all_readings` and `from .station_factory import create_station, create_stations` to `generators/__init__.py`. Similarly for `mqtt/__init__.py`.

---

## Issue Count by Severity

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High     | 3 |
| Medium   | 13 |
| Low      | 5 |
| **Total**| **23** |

---

## Remediation Priority

1. **Immediately**: Fix CRITICAL-SE1 and CRITICAL-SE2 (credential exposure).
2. **Next Sprint**: Fix HIGH-CO1 (subscriber batching) and HIGH-PE1 (unbounded memory).
3. **Next Sprint**: Fix HIGH-CO2 (graceful drain data loss) and MED-CO3 (naive datetime crash).
4. **Following Sprint**: Address all Medium-severity security, correctness, and maintainability issues.
5. **Ongoing**: Resolve Low-severity standards and documentation issues during regular refactoring.

---

*End of QA Cycle 23 — Data Pipeline Review*
