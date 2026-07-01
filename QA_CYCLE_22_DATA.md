# ENViroSwarm Data Pipeline — QA Cycle 22 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 1 |
| **Low** | 16 |
| **Total** | **17** |

## Previous Fixes Verification

> **Note:** Historical QA Cycle reports (1–21) were not available in the repository. Therefore, explicit verification of previous fixes could not be performed. The review below is based solely on a zero-tolerance audit of the current `main` branch state.

---

## Issues Found

### Medium

1. **MQTT Subscriber — Hardcoded Default `client_id` Causes Connection Collision**  
   **File:** `mqtt/subscriber.py` (line 274)  
   **Detail:** `start_subscriber()` defaults to `client_id="enviroswarm-sub-001"` when `None` is passed. Running multiple subscriber instances without explicitly providing `--client-id` will cause MQTT broker connection flapping (one client disconnects the other). Best practice for a reusable library/script is to default to `None` and let the broker assign a random ID, or generate a UUID locally.  

---

### Low

2. **Docker Compose — Obsolete `version` Attribute**  
   **File:** `docker-compose.mqtt.yml` (line 1)  
   **Detail:** The `version: "3.8"` top-level element is obsolete in Docker Compose v2. Modern best practice is to omit the `version` key entirely.

3. **MQTT Publisher — Cleanup Suppresses `loop_stop()` on `disconnect()` Failure**  
   **File:** `mqtt/publisher.py` (lines 108–113)  
   **Detail:** Both `disconnect()` and `loop_stop()` are inside a single `try` block. If `disconnect()` raises an exception, `loop_stop()` is never executed, potentially leaving the network loop thread alive. Best practice is to wrap each call in its own `try/except`.

4. **MQTT Subscriber — Cleanup Suppresses `loop_stop()` on `disconnect()` Failure**  
   **File:** `mqtt/subscriber.py` (lines 214–223)  
   **Detail:** Same pattern as above: `disconnect()` and `loop_stop()` share a single `try` block, so a failure in `disconnect()` prevents `loop_stop()` from running.

5. **MQTT Subscriber — Overly Broad Exception Handling on JSON Parse**  
   **File:** `mqtt/subscriber.py` (lines 100–103)  
   **Detail:** `_post_with_retry` catches bare `Exception` when calling `resp.json()`. If an unexpected exception occurs during response parsing, it is silently treated as success (prints "API OK" and returns `True`). Should catch `json.JSONDecodeError` / `requests.exceptions.InvalidJSONError` specifically.

6. **MQTT Subscriber — Non-Deterministic Idempotency Key**  
   **File:** `mqtt/subscriber.py` (line 78)  
   **Detail:** The `X-Idempotency-Key` is computed from `json.dumps(body)` without `sort_keys=True`. While the current dict construction is stable, future refactorings could change key insertion order and break idempotency guarantees. Best practice is `json.dumps(..., sort_keys=True)`.

7. **Seed Demo — Non-Deterministic Idempotency Key**  
   **File:** `seed_demo.py` (line 261)  
   **Detail:** Same issue as above: `hashlib.sha256(json.dumps(payload).encode("utf-8"))` should use `sort_keys=True` for deterministic idempotency hashing.

8. **Seed Demo — Retry Strategy Includes Non-Idempotent `PATCH`**  
   **File:** `seed_demo.py` (line 72)  
   **Detail:** `urllib3.util.retry.Retry` is configured with `allowed_methods=["POST", "GET", "DELETE", "PATCH"]`. While `DELETE` is generally idempotent, `PATCH` is not universally idempotent. Since the script does not currently use `PATCH`, this is latent risk. Best practice is to limit `allowed_methods` to known-idempotent verbs or include `POST` only with explicit design.

9. **Seed Demo — Hardcoded Tier Validation**  
   **File:** `seed_demo.py` (line 357)  
   **Detail:** The tier whitelist `{"free", "pro", "enterprise"}` is hardcoded. If the backend introduces a new tier (e.g., "starter"), the demo script will reject it. Best practice is to query the backend pricing endpoint and validate against the dynamic tier list.

10. **Station Factory — Hardcoded π Constant**  
    **File:** `generators/station_factory.py` (line 47)  
    **Detail:** `random.uniform(0, 2 * 3.141592653589793)` uses a hardcoded literal instead of `math.tau` (or `2 * math.pi`). This is brittle and less readable.

11. **Reading Generator — UTC Offsets Ignore Daylight Saving Time**  
    **File:** `generators/reading_generator.py` (line 10)  
    **Detail:** `_CITY_OFFSETS` uses fixed standard-time offsets. During DST periods, `_local_hour()` will be off by one hour for New York, Los Angeles, London, and Berlin. Best practice is to use `zoneinfo` / `pytz` rather than static offsets.

12. **Reading Generator — Inconsistent Outlier Clamping**  
    **File:** `generators/reading_generator.py` (lines 281–290)  
    **Detail:** After outlier injection, upper-bound clamping is applied inconsistently. `temperature` and `water_quality` are clamped to documented maxima, but `co2`, `pm25`, `pm10`, `noise_level`, `radiation`, `air_quality`, and `voc` are not. This produces values that exceed the README-documented ranges and creates inconsistent data quality.

13. **MQTT Publisher — Type Hint Accepts Non-Optional `List` but Handles `None`**  
    **File:** `mqtt/publisher.py` (lines 25–44)  
    **Detail:** The function signature declares `readings: List[Dict[str, Any]]`, yet the body explicitly handles `readings is None`. The type hint should be `Optional[List[Dict[str, Any]]]` to match runtime behavior.

14. **MQTT Subscriber — `_on_message` Does Not Validate Payload Shape**  
    **File:** `mqtt/subscriber.py` (lines 186–200)  
    **Detail:** The `_on_message` callback puts the result of `json.loads()` directly into the queue without checking that it is a `dict`. If the MQTT topic receives a JSON array or primitive, the worker will forward it to the API inside `{"readings": [<primitive>]}` and the API will reject it. Should validate `isinstance(payload, dict)` before enqueuing.

15. **MQTT Subscriber — Incomplete Type Hints**  
    **File:** `mqtt/subscriber.py` (lines 129, 205)  
    **Detail:** `_start_worker` returns `tuple` without parameterized types (should be `tuple[queue.Queue, threading.Event, dict]`). `_drain_and_shutdown` lacks a return type annotation entirely.

16. **Code Duplication — `_safe_int` / `_safe_float` Duplicated Across Modules**  
    **Files:** `seed_demo.py` (lines 43–54) and `mqtt/subscriber.py` (lines 24–35)  
    **Detail:** The same two helper functions are copy-pasted. This violates DRY and increases maintenance burden.

17. **Reading Generator — Unused `base_temp` Parameter (Dead Code)**  
    **File:** `generators/reading_generator.py` (line 52)  
    **Detail:** `_temperature_value` accepts `base_temp: Optional[float] = None`, but `generate_readings_for_station` never passes it. The parameter is dead code and adds unnecessary API surface area.

18. **README — Hardcoded Demo Password in Documentation**  
    **File:** `README.md` (line 26)  
    **Detail:** The README explicitly shows `export DEMO_PASSWORD=Demo12345!`. While this is a demo environment, zero-defect security best practice is to avoid hardcoded credentials in any documentation, even for local demos. Use a placeholder like `<your-demo-password>` or instruct the user to generate one.

---

*Report generated by QA Cycle 22 automated review.*
*Scope: `data-pipeline/` on branch `main`.*
*Reviewer: Senior QA Engineer (Zero-Defect Protocol).*