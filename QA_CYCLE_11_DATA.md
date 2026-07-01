# ENViroSwarm Data Pipeline — QA Cycle 11 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 4 |
| **Low** | 8 |
| **Total** | **12** |

---

## Previous Fix Verification

All fixes from QA Cycles 2, 4, 6, 8, and 10 were verified present and correct in the current `main` branch.

| Cycle | Fix | Status | Verification |
|-------|-----|--------|------------|
| **2** | Critical #1–6 (password complexity, tier registration, lat/lon keys, ingest envelope, subscriber auth, subscriber envelope) | ✅ Verified | `seed_demo.py:33–38`, `107–133`, `226–242`, `277–315`; `subscriber.py:70–71`, `73–74` |
| **2** | High #7–15 (correlation precompute, additive outliers, async subscriber, cleanup, retry adapter, tier cascading, paho-mqtt pin, rate limiting) | ✅ Verified | `reading_generator.py:224–226`, `203–288`; `subscriber.py:131–203`; `seed_demo.py:66–81`, `558–565` |
| **4** | N1–N4 (bounded queue, graceful drain, worker respawn, dynamic pricing) | ✅ Verified | `subscriber.py:140`, `206–216`, `169–181`; `seed_demo.py:162–167`, `399–416` |
| **6** | H1–H5 (README password, env-var credentials, reentrant API base, local solar time, safe env parsing) | ✅ Verified | `README.md:37`; `seed_demo.py:33–38`, `342`, `47–59`; `reading_generator.py:19–23` |
| **6** | M1–M13 (scoped cleanup, PM10 ≥ PM25, backend 200-check, clean_session, worker restart, drain timeout, gzip threshold, append mode, deterministic idempotency, safe subscriber env parsing) | ✅ Verified | `seed_demo.py:558–565`, `421–434`, `260`; `reading_generator.py:97–104`; `subscriber.py:261`, `140`, `206–216`, `74`, `28–39` |
| **8** | All 5 Cycle-6 High issues resolved | ✅ Verified | See H1–H5 above |
| **10** | H1 (duplicate auth block) | ✅ Verified | `seed_demo.py:362–416` — single auth block only |
| **10** | M1–M7 (2xx check, double retry, disconnect order, interval validation, rate validation, WQI/humidity clamp, mosquitto user) | ✅ Verified | `subscriber.py:92`, `session` has no retry adapter, `214–215`; `reading_generator.py:181–186`, `279–285`; `docker-compose.mqtt.yml:14` |
| **10** | L1–L7 (no hardcoded password, gzip threshold aligned, temp upper clamp, name suffix, gitignore pycache, healthcheck `-d`, input validation) | ✅ Verified | `seed_demo.py:33–38`, `260–262`, `288–289`; `station_factory.py:97–104`; `.gitignore` has `__pycache__/`; `docker-compose.mqtt.yml:16` |

---

## Issues Found

### Medium

#### M1 — `seed_demo.py`: Import-Time `DEMO_PASSWORD` Crash Prevents CLI Override and Leaks Password in `--help`
- **Location:** `seed_demo.py:33–38` and `635–638`
- **Description:** `DEMO_PASSWORD = os.getenv("DEMO_PASSWORD")` followed by an unconditional `raise ValueError` at module import time means the script crashes before `main()` or `argparse` is ever reached. Consequently, the `--password` CLI flag is **unusable** without first setting the environment variable. Furthermore, when the env var *is* set, the f-string `help=f"Demo user password (default: {DEMO_PASSWORD})"` embeds the sensitive credential into the `--help` output, leaking it to shell history and CI logs.
- **Impact:** Operational blocker for CLI-first users; credential leak when `--help` is run.
- **Fix Direction:** Move the `ValueError` into `main()` or `run_seed()` so argparse can parse `--password` before validation. Sanitize the help text to omit the actual default value (e.g., `default: ***hidden***`).

#### M2 — `generators/reading_generator.py`: Outlier Injection Breaks PM10 ≥ PM25 Physical Constraint
- **Location:** `generators/reading_generator.py:217–288`
- **Description:** `pm25` and `pm10` are precomputed from the base (non-outlier) values before the per-sensor loop. Inside the loop, each sensor receives an independent additive outlier. If PM25 receives a large positive outlier (e.g., +400) while PM10 receives none or a smaller one, the final reading can have `pm25 > pm10`, which is physically impossible because PM10 is a superset of PM2.5.
- **Impact:** Physically impossible data is injected into the pipeline, which can corrupt downstream analytics or trigger false alerts.
- **Fix Direction:** After outlier injection, enforce `value = max(pm25_outliered, value)` for PM10, or recompute PM10 from the outliered PM25.

#### M3 — `mqtt/subscriber.py`: Random UUID Idempotency Key Prevents Deduplication on QoS 1 Redelivery
- **Location:** `mqtt/subscriber.py:82`
- **Description:** `_post_with_retry` generates `headers["X-Idempotency-Key"] = str(uuid.uuid4())` for every forward. MQTT QoS 1 guarantees at-least-once delivery. If the subscriber successfully POSTs to the API but the broker’s PUBACK is lost, the broker will redeliver the same message. The subscriber forwards it again with a **new** random UUID, so the backend cannot deduplicate it.
- **Impact:** Silent data duplication on every network blip or broker reconnect.
- **Fix Direction:** Replace the random UUID with a deterministic hash of the payload (e.g., `hashlib.sha256(raw_json).hexdigest()`), matching the pattern already used in `seed_demo.py`.

#### M4 — `seed_demo.py`: Batch Ingest Loop Does Not Catch `RuntimeError` from `ingest_bulk`
- **Location:** `seed_demo.py:502–510`
- **Description:** `ingest_bulk` raises `RuntimeError` for any API response with `status_code >= 400` (e.g., 422 validation error, 500 server error). The batch loop only catches `requests.RequestException`. An unhandled `RuntimeError` propagates up, aborting the entire seeding pipeline on the first API error instead of logging the failure and continuing with the next batch.
- **Impact:** Entire demo seed crashes on a single transient or persistent API error; partial seeding is impossible.
- **Fix Direction:** Catch `RuntimeError` (or a custom exception type) alongside `requests.RequestException` in the batch loop, increment `api_errors`, and continue.

---

### Low

#### L1 — `generators/reading_generator.py`: Docstring Claims Coldest at 6am, Formula Coldest at Midnight
- **Location:** `generators/reading_generator.py:27–28`
- **Description:** The docstring says "coldest ~6am, warmest ~noon (12h)", but the sinusoidal formula `sin((hour - 6) / 24 * 2π)` evaluates to -1 at `hour = 0` (midnight), 0 at `hour = 6`, and +1 at `hour = 12`. The coldest point is at midnight, not 6am.
- **Impact:** Documentation/implementation mismatch; misleading for anyone calibrating the physics model.
- **Fix Direction:** Update the docstring to "coldest ~midnight (0h), warmest ~noon (12h)" or adjust the phase shift to match the stated physics.

#### L2 — `generators/reading_generator.py`: `end_time` Microseconds Only Truncated on Default
- **Location:** `generators/reading_generator.py:178–179`
- **Description:** `if end_time is None: end_time = datetime.now(timezone.utc).replace(microsecond=0)` truncates microseconds only when the default is used. If a caller passes an `end_time` with microseconds (e.g., from another module), the generated timestamps retain fractional seconds, bloating storage and breaking clean 15-minute alignment.
- **Impact:** Minor inconsistency; downstream consumers may see unexpected microsecond precision.
- **Fix Direction:** Always truncate microseconds: `end_time = (end_time or datetime.now(timezone.utc)).replace(microsecond=0)`.

#### L3 — `docker-compose.mqtt.yml`: Missing `mqtt/data` and `mqtt/log` Directories Cause Permission Failures
- **Location:** `docker-compose.mqtt.yml:10–13`
- **Description:** The compose file bind-mounts `./mqtt/data` and `./mqtt/log`, but these directories do not exist in the repository. On Linux, Docker creates missing bind-mount directories as **root-owned**. The `user: "1883:1883"` directive then prevents the Mosquitto process from writing persistence files or logs, causing the container to crash-loop on startup.
- **Impact:** Operational failure on Linux deployments despite the `user` directive.
- **Fix Direction:** Add empty directories with a `.gitkeep` file, or add a `mkdir -p` / `chown` startup step in the compose file.

#### L4 — `seed_demo.py`: Inconsistent Step Numbering in Console Output
- **Location:** `seed_demo.py:364`, `390`, `399`, `447`, `476`, `495`, `559`
- **Description:** `run_seed` prints `[1/6]`, `[2/6]`, `[3/6]`, then conditionally `[4/6]` (append mode only), then `[5/6]`, `[6/6]`, and finally `[7/7]`. The denominator changes from 6 to 7, and step 4 is missing in non-append mode, producing confusing output.
- **Impact:** Minor operational confusion when reading logs.
- **Fix Direction:** Use a consistent denominator (e.g., 7) and renumber steps so append mode uses a separate label rather than skipping a number.

#### L5 — `mqtt/subscriber.py`: API URL Construction Inconsistent with Seeder Helper
- **Location:** `mqtt/subscriber.py:68`
- **Description:** `_post_with_retry` builds the URL as `f"{api_base}/api/v1/ingest"`, which produces a double slash if `api_base` ends with `/`. `seed_demo.py` already has a robust `_api_url` helper that normalizes slashes. The subscriber duplicates this logic poorly.
- **Impact:** Minor inconsistency; potential broken URL if `api_base` is configured with a trailing slash.
- **Fix Direction:** Reuse a shared URL helper (or inline `api_base.rstrip('/') + '/api/v1/ingest'`) to match the seeder’s behavior.

#### L6 — `mqtt/subscriber.py`: Global Mutation of `API_BASE` and `TOPIC_PREFIX`
- **Location:** `mqtt/subscriber.py:248–250`
- **Description:** `start_subscriber` mutates module-level globals `API_BASE` and `TOPIC_PREFIX`. The `_on_connect` callback reads the global `TOPIC_PREFIX`. If `start_subscriber` is called twice concurrently (e.g., in tests or multi-tenant scenarios), the first subscriber’s reconnect may subscribe to the second subscriber’s topic prefix.
- **Impact:** Non-thread-safe; race conditions during concurrent or repeated invocations.
- **Fix Direction:** Pass `topic_prefix` into the callback via `client.user_data_set()` or a closure, avoiding module-level global mutation.

#### L7 — `seed_demo.py`: `duration_months` Parameter Not Validated
- **Location:** `seed_demo.py:647–649` and `171–179`
- **Description:** The CLI accepts `--duration-months` and passes it directly to `subscribe_user`. There is no validation that `duration_months >= 1`. The backend schema requires `1 <= duration_months <= 12`, but the seeder allows zero or negative values, which will fail with a 422 from the backend.
- **Impact:** Poor UX; cryptic backend error instead of a clear client-side validation message.
- **Fix Direction:** Add `if duration_months < 1: raise ValueError("duration_months must be >= 1")` in `main()` or `run_seed()`.

#### L8 — `README.md`: Does Not Document Required `DEMO_PASSWORD` Environment Variable
- **Location:** `README.md:7–31` and `87–91`
- **Description:** The README states that running `python seed_demo.py` performs the full demo, and documents the default credentials as `demo@enviroswarm.local / Demo12345!`. It does not mention that `DEMO_PASSWORD` is now a **required** environment variable, nor that the script will crash on import if it is missing. The Troubleshooting section also incorrectly implies the `--password` flag can be used without the env var.
- **Impact:** Users following the README will encounter an immediate `ValueError` instead of a successful demo run.
- **Fix Direction:** Add an explicit step: `export DEMO_PASSWORD=Demo12345!` before running the seeder, and update the Troubleshooting section to clarify that the env var is mandatory.

---

*Report generated by QA Cycle 11 review. All previous fixes verified; no fixes applied.*
