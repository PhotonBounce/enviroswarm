# ENViroSwarm Data Pipeline — QA Cycle 10 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 1 |
| **Medium** | 7 |
| **Low** | 6 |
| **Total** | **14** |

## Notes on Previous Cycles
No QA cycle artifacts (`QA_CYCLE_1.md` through `QA_CYCLE_9.md`) were found in the repository. Therefore, verification of previous fixes could not be performed.

---

## Issues Found

### High

#### H1 — `seed_demo.py`: Duplicate Auth Block Causes Double API Calls
- **Location:** `seed_demo.py`, lines 355–409 and 414–469
- **Description:** The entire authentication / initialization block (backend probe, user registration, login, tier subscription) is duplicated. When `dry_run=False`, both blocks execute sequentially, causing:
  - Duplicate backend availability probes.
  - Duplicate registration attempts.
  - Duplicate login and JWT token generation.
  - Duplicate tier subscription calls.
  - The first `session` and `token` are overwritten by the second block.
- **Impact:** Wastes API resources, pollutes logs with duplicate step numbers, and can trigger rate limits or duplicate billing events depending on backend idempotency guarantees.
- **Fix Direction:** Remove the first block (lines 355–409) and keep the second block (lines 414–469) which correctly precedes the append-mode logic.

---

### Medium

#### M1 — `subscriber.py`: Strict `== 200` Check Causes False Failures on 2xx
- **Location:** `mqtt/subscriber.py`, `_post_with_retry`, lines 96–107
- **Description:** The function only treats `resp.status_code == 200` as success. If the ingest API returns `201 Created`, `204 No Content`, or any other 2xx success code, the payload is treated as a failure and dropped.
- **Impact:** Inconsistent with `seed_demo.py`'s `_unwrap()`, which accepts any 2xx. This can cause silent data loss if the backend ever returns a non-200 2xx.
- **Fix Direction:** Replace `resp.status_code == 200` with `resp.status_code < 400` (or `resp.ok`) and maintain the `body_json.get("success")` check.

#### M2 — `subscriber.py`: Double Retry Layers Cause Excessive Backoff
- **Location:** `mqtt/subscriber.py`, `_start_worker` / `_post_with_retry`, lines 252–261 and 84–127
- **Description:** The `requests.Session` is mounted with an `HTTPAdapter` that has `Retry(total=3, ...)`. `_post_with_retry` performs its own manual retry loop (`max_retries` default 3). On a transient 503, the adapter can retry up to 3 times, and then `_post_with_retry` retries up to 3 more times, yielding up to 16 total attempts with compounded backoff delays.
- **Impact:** Unpredictable latency, potential thundering-herd on recovery, and difficulty debugging which retry layer is active.
- **Fix Direction:** Remove the `HTTPAdapter` retry and rely solely on `_post_with_retry`, or vice versa. If keeping both, set `HTTPAdapter` retries to `0`.

#### M3 — `subscriber.py`: Incorrect MQTT Shutdown Order
- **Location:** `mqtt/subscriber.py`, `_drain_and_shutdown`, lines 214–215
- **Description:** `client.loop_stop()` is called before `client.disconnect()`. The network loop must be running to send the DISCONNECT packet.
- **Impact:** The broker may not receive a clean disconnect, causing the session to linger until the keep-alive timeout expires.
- **Fix Direction:** Swap the order: `client.disconnect()` first, then `client.loop_stop()`. (Note: `publisher.py` already uses the correct order.)

#### M4 — `reading_generator.py`: `interval_minutes <= 0` Causes Infinite Loop
- **Location:** `generators/reading_generator.py`, `generate_readings_for_station`, lines 190–193
- **Description:** `while current <= end_time: ... current += timedelta(minutes=interval_minutes)` will never advance if `interval_minutes` is 0 or negative. This is a public API parameter with no validation.
- **Impact:** Calling code will hang indefinitely.
- **Fix Direction:** Add `if interval_minutes <= 0: raise ValueError(...)` at the top of the function.

#### M5 — `reading_generator.py`: Missing Validation on Rate Parameters
- **Location:** `generators/reading_generator.py`, `generate_readings_for_station`, lines 212 and 266
- **Description:** `missing_rate` and `outlier_rate` are not validated. Values > 1.0 cause all intervals to be dropped or all readings to be flagged as outliers. Negative values are silently accepted.
- **Impact:** Unpredictable simulation output; a caller passing `outlier_rate=2.0` would produce 100% outliers without any warning.
- **Fix Direction:** Validate `0 <= missing_rate <= 1` and `0 <= outlier_rate <= 1`.

#### M6 — `reading_generator.py`: Outliers Exceed Physical Maxima for WQI and Humidity
- **Location:** `generators/reading_generator.py`, lines 272–274
- **Description:** The outlier logic clamps negative values to `0.0` for non-negative sensors but does not clamp upper bounds. For `water_quality` (WQI 0–100) and `humidity` (relative humidity 0–100%), values above 100 are physically impossible (WQI is defined on a 0–100 scale; relative humidity cannot exceed 100%). The base generation functions clamp to these limits, but outliers bypass them.
- **Impact:** Physically impossible data is injected into the pipeline, which can corrupt analytics or trigger false alerts in downstream systems.
- **Fix Direction:** Add `water_quality` and `humidity` to the upper-bound clamping logic (or cap all outliers to their documented maxima).

#### M7 — `docker-compose.mqtt.yml`: Mosquitto Volume Permissions Not Handled
- **Location:** `data-pipeline/docker-compose.mqtt.yml`, lines 10–13
- **Description:** The official `eclipse-mosquitto` image runs as user `mosquitto` (UID 1883). On Linux hosts, bind-mounted directories created by Docker often inherit root ownership, causing the broker to fail to write persistence files or logs.
- **Impact:** On Linux deployments, the container may crash-loop or fail to persist session state.
- **Fix Direction:** Add a `user: "1883:1883"` directive or pre-create the host directories with the correct UID/GID, or add a startup script to fix permissions.

---

### Low

#### L1 — `seed_demo.py`: Hardcoded Demo Password in Source
- **Location:** `seed_demo.py`, line 35
- **Description:** `DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "Demo12345!")` embeds a weak, hardcoded password in the source file.
- **Impact:** Credential leakage if the repo is published; violates the principle of no secrets in source.
- **Fix Direction:** Remove the default and require the environment variable to be set (or fail with a clear error if missing).

#### L2 — Inconsistent Gzip Compression Policy Between Seeder and Subscriber
- **Location:** `seed_demo.py` `_ingest_with_payload` (lines 260–262) vs `mqtt/subscriber.py` `_post_with_retry` (lines 74–80)
- **Description:** The seeder always applies `gzip.compress` regardless of payload size. The subscriber only compresses if `len(raw_json) > 1024`.
- **Impact:** Minor inconsistency; the seeder wastes CPU on tiny payloads.
- **Fix Direction:** Align both to the same threshold (e.g., compress only if > 1024 bytes).

#### L3 — `reading_generator.py`: Temperature Outlier Upper Bound Not Enforced
- **Location:** `generators/reading_generator.py`, lines 275–276
- **Description:** The README documents temperature outliers as “-80 to +90”, but the code only clamps the lower bound (`max(-80.0, value)`). A base value near 43 °C plus a +50 outlier can reach ~93 °C, exceeding the documented +90 limit.
- **Impact:** Minor deviation from documented spec.
- **Fix Direction:** Add `value = min(90.0, value)` for temperature outliers.

#### L4 — `station_factory.py`: Station Name Pool Repeats After 48 Stations
- **Location:** `generators/station_factory.py`, lines 33–38 and 97–104
- **Description:** `STATION_NAMES` contains 48 entries. If a caller requests `total > 48`, names wrap around via modulo arithmetic, producing duplicate names.
- **Impact:** Reduced demo realism; duplicate names may confuse downstream UI or tests.
- **Fix Direction:** Dynamically generate unique names (e.g., append a numeric suffix) once the pool is exhausted.

#### L5 — `__pycache__` Directories Committed to Repository
- **Location:** `data-pipeline/__pycache__/`, `data-pipeline/generators/__pycache__/`, `data-pipeline/mqtt/__pycache__/`
- **Description:** Compiled Python bytecode directories are present in the working tree. The root `.gitignore` (`D:/photonbounce/enviroswarm/.gitignore`) does not include `__pycache__` or `*.pyc`.
- **Impact:** Repository bloat; risk of merge conflicts from stale bytecode.
- **Fix Direction:** Add `__pycache__/` and `*.pyc` to the root `.gitignore` and remove the committed directories.

#### L6 — `docker-compose.mqtt.yml`: Malformed Healthcheck Argument
- **Location:** `docker-compose.mqtt.yml`, line 16
- **Description:** The healthcheck command uses `-d 1`. In `mosquitto_pub`, `-d` is a flag (no argument). The trailing `1` is parsed as a positional topic argument, overriding `-t health`.
- **Impact:** The healthcheck still tests connectivity (any topic works), but it does not publish to the intended `health` topic.
- **Fix Direction:** Remove the `1` (use `-d` alone) or remove `-d` entirely from the healthcheck.

#### L7 — Missing Input Validation in Several Public Functions
- **Location:** `mqtt/subscriber.py` (`start_subscriber`), `mqtt/publisher.py` (`publish_readings`), `seed_demo.py` (`run_seed`)
- **Description:** `broker_port`, `delay_seconds`, `max_queue_size`, `ingest_timeout`, `days`, `batch_delay`, `stations` are accepted without range validation. Negative values can cause `time.sleep()` to raise or `requests` to behave unexpectedly.
- **Impact:** Poor user experience; cryptic exceptions from deep in the call stack.
- **Fix Direction:** Add `>= 0` (or `> 0`) validations at the CLI / API boundary for all operational parameters.

---

*Report generated by QA Cycle 10 review. All issues documented; no fixes applied.*
