# ENViroSwarm Data Pipeline — QA Cycle 12 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 1 |
| **High** | 0 |
| **Medium** | 2 |
| **Low** | 5 |
| **Total** | **8** |

## Issues Found

### Critical

#### C1 — `subscriber.py`: Idempotency Key Computation Crashes on Every Forward (Complete Data Loss)
- **Location:** `mqtt/subscriber.py`, line 83
- **Description:** `_post_with_retry` computes `raw_json = json.dumps(body).encode("utf-8")` (bytes), then calls `hashlib.sha256(raw_json.encode()).hexdigest()`. Calling `.encode()` on a `bytes` object raises `AttributeError`. The worker thread catches this in a broad `except Exception`, prints the error, and drops the message. **Every single MQTT message forwarded by the subscriber is silently lost.**
- **Root Cause:** This is a regression introduced by the Cycle 11 M3 fix (deterministic idempotency key). The fix correctly replaced `uuid.uuid4()` with `hashlib.sha256`, but mistakenly added an extra `.encode()` call on an already-encoded bytes object.
- **Fix Direction:** Change line 83 to `hashlib.sha256(raw_json).hexdigest()` (remove the erroneous `.encode()`).

### Medium

#### M1 — `subscriber.py`: No `KeyboardInterrupt` Handler During Timed Runs
- **Location:** `mqtt/subscriber.py`, lines 291–295
- **Description:** The `run_duration_seconds` branch uses a bare `time.sleep(run_duration_seconds)`. If the user presses Ctrl+C (SIGINT), `KeyboardInterrupt` is raised and propagates uncaught, producing a stack trace and skipping graceful shutdown. The `else` branch (infinite loop) correctly wraps the sleep in a `try/except KeyboardInterrupt` handler that triggers `_drain_and_shutdown`.
- **Fix Direction:** Wrap the `time.sleep` in the `if run_duration_seconds:` block with the same `try/except KeyboardInterrupt` pattern used in the `else` branch.

#### M2 — `mqtt/config/mosquitto.conf`: `allow_anonymous true` Remains Without Production Template
- **Location:** `mqtt/config/mosquitto.conf`, line 7
- **Description:** The configuration file still enables anonymous MQTT access with no `password_file`, `acl_file`, or TLS configuration. While acceptable for local development, no production-ready template (`mosquitto.conf.production`) or documentation has been provided. This issue has been open since QA Cycle 6 (M11), QA Cycle 8 (M11), and QA Cycle 11 (M11) without resolution.
- **Fix Direction:** Add a `mosquitto.conf.production` template with `allow_anonymous false`, `password_file`, and TLS listener configuration, or add a clear `SECURITY.md` note about the demo-only nature of the bundled config.

### Low

#### L1 — `seed_demo.py`: Unused Import `random`
- **Location:** `seed_demo.py`, line 16
- **Description:** `import random` is present but never referenced in the module. The module's randomization needs are fully satisfied by `generators/station_factory` and `generators/reading_generator`.
- **Fix Direction:** Remove the unused import.

#### L2 — `seed_demo.py`: Unused Import `uuid`
- **Location:** `seed_demo.py`, line 19
- **Description:** `import uuid` is present but never referenced in the module. UUID generation is performed inside `generators/station_factory`.
- **Fix Direction:** Remove the unused import.

#### L3 — `subscriber.py`: Unused Import `uuid`
- **Location:** `mqtt/subscriber.py`, line 13
- **Description:** `import uuid` is present but never referenced in the module. The previous usage for random idempotency keys was removed in the Cycle 11 M3 fix but the import was not cleaned up.
- **Fix Direction:** Remove the unused import.

#### L4 — `seed_demo.py`: Incorrect Type Hint for `password` Parameter
- **Location:** `seed_demo.py`, line 334
- **Description:** `run_seed` signature declares `password: str = DEMO_PASSWORD`, but `DEMO_PASSWORD = os.getenv("DEMO_PASSWORD")` can be `None`. This creates a type-safety mismatch that type checkers and IDEs will flag.
- **Fix Direction:** Change the parameter declaration to `password: Optional[str] = DEMO_PASSWORD`.

#### L5 — `publisher.py`: Suboptimal MQTT Disconnection Order on Connection Timeout
- **Location:** `mqtt/publisher.py`, lines 68–71
- **Description:** When the publisher fails to connect within the polling timeout, the cleanup code calls `client.loop_stop()` before `client.disconnect()`. While the client is not yet connected (so the functional impact is nil), the standard pattern is `disconnect()` first, then `loop_stop()`, to ensure the DISCONNECT packet is sent while the network loop is running.
- **Fix Direction:** Swap the order: `client.disconnect()` before `client.loop_stop()`.

## Previous Fix Verification

All fixes from QA Cycles 2–11 were verified present and correct in the current `main` branch, with the following exceptions:

| Cycle | Issue | Status | Notes |
|-------|-------|--------|-------|
| 6, 8, 11 | M11 — `allow_anonymous true` | **Still open** | See M2 above. |
| 11 | M3 — Random UUID idempotency key | **Fixed, but regressed** | The deterministic hash fix is correct in logic, but the implementation introduced a Critical `AttributeError` (see C1 above). |

Verified fixes include:
- Cycle 2 Critical #1–6 (password, tier registration, lat/lon keys, ingest envelope, subscriber auth, subscriber envelope)
- Cycle 2 High #7–15 (correlation precompute, additive outliers, async subscriber, cleanup, retry adapter, tier cascading, paho-mqtt pin, rate limiting)
- Cycle 6 High #1–5 (README password, env-var credentials, reentrant API base, local solar time, safe env parsing)
- Cycle 10 High #1 (duplicate auth block)
- Cycle 10 Medium #1–7 (2xx check, double retry, disconnect order, interval validation, rate validation, WQI/humidity clamp, mosquitto user)
- Cycle 10 Low #1–7 (no hardcoded password, gzip threshold, temp upper clamp, name suffix, gitignore pycache, healthcheck `-d`, input validation)
- Cycle 11 Medium #1–4 (import-time password crash, PM10≥PM25 enforcement, deterministic idempotency in seeder, RuntimeError catch in batch loop)
- Cycle 11 Low #1–8 (docstring, microsecond truncation, mqtt directories, step numbering, URL helper, global mutation, duration validation, README documentation)

---
*Report generated by QA Cycle 12 review. All previous fixes verified; no new fixes applied.*
