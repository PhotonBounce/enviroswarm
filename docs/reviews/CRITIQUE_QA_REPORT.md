# ENViroSwarm — Critique & QA Review Report

> **Reviewer:** critique-qa  
> **Worktree:** `D:/photonbounce/.worktrees/critique`  
> **Branch:** `agent/critique`  
> **Date:** 2025-06-30  
> **Scope:** Architecture, Security, Code Quality, Scalability, Bugs, Missing Features, Test Coverage, Performance  

---

## Executive Summary

**CRITICAL FINDING: The project contains zero implementation code.**

All source directories (`backend/`, `web-dashboard/`, `android-app/`, `data-pipeline/`) are empty. Only specification documents (`AGENT_SPEC.md`, `docs/ARCHITECTURE.md`, `README.md`) exist. This is not a "pre-launch review" — this is a **pre-implementation review**. The project is not ready for any form of launch, internal testing, or stakeholder demo.

This report therefore critiques the **design documents themselves** for architectural flaws, security holes, specification inconsistencies, and missing MVP requirements. It also flags that the entire implementation is absent.

**Severity Legend:**
- 🔴 **Critical** — Blocks launch, could cause data loss, breach, or system failure
- 🟡 **High** — Significant risk, requires fix before production
- 🟢 **Medium** — Should be addressed before public release
- 🔵 **Low** — Nice-to-have, technical debt

---

## 1. Architecture Review

### Overall Assessment: Weak

The architecture document (`docs/ARCHITECTURE.md`) describes a simplistic monolithic stack with no resilience patterns, no observability, and no horizontal scaling story. It is suitable for a weekend prototype, not a SaaS platform monetizing environmental data.

### 🔴 Single Points of Failure (SPOFs)

1. **Single PostgreSQL/TimescaleDB instance** — `docs/ARCHITECTURE.md:40` shows only one database. No read replicas, no failover, no backup strategy documented. If the DB node fails, the entire platform is offline.
2. **Single FastAPI container** — No load balancer, no horizontal pod autoscaling, no health-check-based restart policy.
3. **No message queue for ingest** — Sensor data goes directly to the REST API → database. If the API is down or slow, data is lost. There is no MQTT broker mentioned in the architecture diagram despite `AGENT_SPEC.md:15` listing it.
4. **No CDN** — Static dashboard assets served from the same container.
5. **No Redis / cache layer** — Every query hits the database. Geo queries and aggregations will be expensive.

### 🟡 Design Smells

- **"Swarm" concept is purely marketing** — The architecture does not implement any swarm-like behavior: no peer-to-peer relay, no mesh networking, no edge computing, no distributed consensus. It is a standard CRUD SaaS with a buzzword. `docs/ARCHITECTURE.md:12-19` describes the concept but does not map it to any technical design.
- **No async worker tier** — Heavy operations (aggregations, data exports, retention cleanup) will block the API. No Celery, RQ, or Arq mentioned.
- **No CI/CD pipeline** — No GitHub Actions, no build artifacts, no deployment strategy.
- **No monitoring stack** — No Prometheus, Grafana, or even structured logging. A platform handling physical IoT data must know when sensors go dark.
- **No backup / DR plan** — TimescaleDB hypertables require specific backup strategies. Not mentioned.
- **Phase-based scalability plan is hand-wavy** — `docs/ARCHITECTURE.md:128-133` lists phases but no migration path, no data re-sharding strategy, no blue-green deployment.

### 🟢 Recommendation: Architecture

1. Introduce a message queue (RabbitMQ / NATS / Redis Streams) for ingest decoupling.
2. Add a Redis layer for caching and rate-limiting.
3. Design for at least 2 API replicas behind a load balancer from day one.
4. Add a separate worker tier for background jobs.
5. Include a monitoring stack (Prometheus + Grafana + Loki).
6. Document the backup strategy for TimescaleDB.

---

## 2. Security Audit

### 🔴 Critical Issues

1. **No refresh token mechanism** — `AGENT_SPEC.md:17` states JWT with PyJWT. `docs/ARCHITECTURE.md:121` says "JWT tokens with 24h expiry". A 24-hour access token with no refresh token means every mobile user is forced to re-authenticate daily. This is poor UX and will lead to users storing credentials insecurely or disabling auth. Mobile apps especially need refresh tokens.

2. **No HTTPS / TLS enforcement documented** — The spec does not mention TLS termination, HSTS, or certificate management. IoT devices sending data to `/api/v1/ingest` over plain HTTP is a data breach waiting to happen.

3. **No secret management strategy** — JWT secrets, DB passwords, and API key peppering must live in a secrets manager (AWS SM, Vault, Doppler, or at least `.env` with warnings). The spec says nothing about how secrets are managed. `README.md:16-25` shows `docker-compose up` and local commands, implying secrets are in local env files — dangerous for production.

4. **API key design is risky** — `AGENT_SPEC.md:27` says `ApiKey` stores `key_hash`. But with no `key_prefix` field, there is no way to identify which key is being used without hashing every incoming key against every row. This is an O(n) lookup that becomes a timing-attack vector and a performance bottleneck. Additionally, the table stores `permissions` as JSONB with no schema validation.

5. **No audit logging** — Sensitive operations (generating API keys, changing tiers, deleting stations) have no audit trail. A compromised account can delete all data with no traceability.

### 🟡 High Issues

6. **No rate limiting implementation details** — `AGENT_SPEC.md:17` says "Rate limiting per tier" but the actual middleware, algorithm (sliding window? token bucket?), and storage backend are absent. Without Redis, rate limiting must be in-memory (not shared across replicas) or DB-backed (slow).

7. **No CORS origin whitelist documented** — `docs/ARCHITECTURE.md:126` says "CORS configured for known origins" but does not list them. During development this will become `*` and likely be forgotten in production.

8. **No password complexity requirements** — `AGENT_SPEC.md:34` shows `POST /api/v1/auth/register` with `email` and `password`. No minimum length, no complexity rules, no breach-database checking (e.g., Have I Been Pwned). FastAPI + bcrypt defaults are not enough.

9. **No input sanitization for JSONB metadata** — `AGENT_SPEC.md:26` says `metadata` is JSONB. With no schema or size limit, attackers can store arbitrary data, potentially causing storage exhaustion or injecting keys that confuse downstream consumers.

10. **No mobile security hardening** — `AGENT_SPEC.md:14` specifies React Native (Expo). No mention of certificate pinning, root/jailbreak detection, or secure storage for tokens. Expo SecureStore is the minimum and is not mentioned.

11. **No CSRF protection** — The web dashboard (`AGENT_SPEC.md:13`) will use cookies or localStorage for JWT. If cookies are used, CSRF is a risk. If localStorage is used, XSS is a risk. Neither is addressed.

12. **No data encryption at rest** — Sensor data may include sensitive location information (home addresses of users). No mention of disk encryption, column-level encryption, or customer-managed keys.

### 🟢 Medium Issues

13. **No RBAC** — The only access control is `tier` (free/pro/enterprise). There is no role system (admin, user, read-only). A single compromised Pro account can delete everything.

14. **SQL injection "prevention via ORM" is too vague** — `docs/ARCHITECTURE.md:125` claims safety via SQLAlchemy ORM, but raw SQL can still be used for geo queries and hypertable operations. Without a clear policy, developers will write raw SQL for performance and introduce injection risks.

15. **No webhook signature verification** — `AGENT_SPEC.md:47` says "Stripe-style checkout (mock for MVP)". Even a mock webhook must verify signatures to prevent spoofing. No secret or verification logic is documented.

---

## 3. Code Quality

### 🔴 Critical Finding: Zero Code Exists

There are **no source code files** in:
- `backend/` — empty directory
- `web-dashboard/` — empty directory
- `android-app/` — empty directory
- `data-pipeline/` — empty directory

This means there are:
- ❌ No tests
- ❌ No linting configuration
- ❌ No type checking
- ❌ No CI/CD pipelines
- ❌ No dependency management files (`requirements.txt`, `package.json`, `build.gradle`, etc.)
- ❌ No Dockerfiles (despite `README.md:16` referencing `docker-compose up`)
- ❌ No docker-compose files

### 🟡 Specification Inconsistencies (Design-Level Code Smell)

Where the spec will become code, these inconsistencies will create bugs:

1. **Inconsistent rate-limit field names** — `AGENT_SPEC.md:27` has `rate_limit` on `ApiKey`; `docs/ARCHITECTURE.md:104` has `rate_limit_per_min`. This will cause schema mismatches.

2. **Inconsistent user table definitions** — `AGENT_SPEC.md:24` lists `User` with `id, email, hashed_password, tier, created_at`. `docs/ARCHITECTURE.md:48-55` adds `updated_at` and changes `tier` from enum/string to `VARCHAR(20)`. The AGENT_SPEC does not mention `updated_at`, which will break ORM models that rely on the spec.

3. **Missing `Subscription` table in architecture** — `AGENT_SPEC.md:28` defines `Subscription` entity. `docs/ARCHITECTURE.md` does **not** include it in the SQL schema. The MVP cannot implement subscriptions without a database table.

4. **Duplicated geo columns** — `docs/ARCHITECTURE.md:60-71` stores both `latitude`/`longitude` columns and a `location GEOGRAPHY(POINT, 4326)` column. This is redundant and requires a trigger or application logic to keep in sync. Without one, data drift is guaranteed.

5. **No enum constraints** — `sensor_types TEXT[]` in `docs/ARCHITECTURE.md:66` and `sensor_type VARCHAR(30)` in `docs/ARCHITECTURE.md:79` allow invalid strings. No `CHECK` constraints or PostgreSQL enums are defined.

6. **No soft deletes** — Every table uses hard `DELETE`. For a data platform, accidental deletion is irreversible. No `deleted_at` columns anywhere.

7. **No `updated_at` triggers** — `docs/ARCHITECTURE.md` includes `updated_at` columns but no `ON UPDATE` triggers or ORM auto-update logic. They will remain stale.

8. **No `is_active` / `is_verified` on users** — A user can be created but never verified. No way to disable accounts without deleting them.

9. **No API key prefix** — The spec stores `key_hash` but no prefix. Without a prefix, you cannot identify which key is being used in logs or support tickets without querying the database.

10. **No `name` field on `ApiKey` in AGENT_SPEC** — `docs/ARCHITECTURE.md:100` has `name VARCHAR(100) NOT NULL`; `AGENT_SPEC.md:27` does not mention `name`. Another schema mismatch.

---

## 4. Scalability Assessment

### Can it handle 10K sensors? 1M readings/day?

**No. The system as designed cannot handle even 1K sensors sustainably.**

### 🟡 Ingest Bottlenecks

1. **No batch ingest endpoint** — `AGENT_SPEC.md:40` defines `POST /api/v1/ingest` with no body schema shown. A single-reading-per-request design at 1M readings/day = **11.57 requests per second average**, with burst spikes from IoT sensors (e.g., 100 sensors reporting every 5 seconds = 1,200 req/s). Without a batch endpoint, the HTTP overhead alone will saturate the API before the database.

2. **No message queue** — Direct REST→DB writes mean every ingest blocks a database connection. With SQLAlchemy async, this is better, but still unbounded. If the DB is slow (e.g., a large aggregation query is running), ingest will back up and time out.

3. **No connection pooling config** — Default `asyncpg` pool size is small. Not configured for 1M+ writes/day.

4. **No backpressure handling** — No circuit breaker, no request queue, no shedding strategy. The API will crash under load.

### 🟡 Query Bottlenecks

5. **No caching layer** — `GET /api/v1/data` with aggregations will scan hypertable chunks. Repeated queries (e.g., dashboard charts) will recompute the same aggregates every time.

6. **Geo query is incorrectly indexed** — `docs/ARCHITECTURE.md:93`:
   ```sql
   CREATE INDEX idx_readings_geo ON sensor_readings USING GIST (station_id, timestamp);
   ```
   This is **not a geo index**. It is a GIST index on `UUID + TIMESTAMPTZ`, which is invalid and useless for geo queries. The `nearby` endpoint (`AGENT_SPEC.md:42`) cannot use this.

7. **No read replicas** — Dashboard queries and API consumer queries will compete with ingest for the same database CPU and I/O.

8. **Hypertable chunk interval too small** — `docs/ARCHITECTURE.md:88` sets `chunk_time_interval => INTERVAL '1 day'`. At 1M readings/day, each chunk is ~1M rows. For 10K sensors at 1 reading/minute = 14.4M readings/day. A 1-day chunk becomes 14M rows. Querying a 7-day range means scanning 7 chunks. Better: tune chunk size based on actual data volume, or use 1-day for MVP and increase later.

9. **No async aggregation worker** — Time-series aggregations (hourly averages, daily summaries) should be precomputed or materialized. Computing them on-the-fly will kill query performance.

### 🔵 Scalability Recommendation

- Add a `POST /api/v1/ingest/batch` endpoint immediately.
- Use a message queue (NATS / Redis Streams / Kafka) for ingest.
- Add Redis for caching and read replicas for analytics queries.
- Implement continuous aggregates (TimescaleDB feature) for common queries.
- Use a CDN for the dashboard.

---

## 5. Bug Hunt

Since there is **no implementation code**, there are no runtime bugs to find. However, there are **design bugs** in the architecture documents that will become code bugs if implemented literally.

### 🔴 Design Bugs (Will Become Code Bugs)

1. **Invalid GIST index** — `docs/ARCHITECTURE.md:93`:
   ```sql
   CREATE INDEX idx_readings_geo ON sensor_readings USING GIST (station_id, timestamp);
   ```
   **Bug:** `station_id` is `UUID` and `timestamp` is `TIMESTAMPTZ`. GIST indexes require geometry or geographic types, not UUID+timestamp. This SQL will either fail or be ignored by the planner. The `nearby` endpoint cannot function without a proper spatial index. **Fix:** Add a `location` column to `sensor_readings` (or join to `sensor_stations` location) and index that.

2. **Missing `Subscription` table in SQL** — `AGENT_SPEC.md:28` defines `Subscription` but `docs/ARCHITECTURE.md` never creates the table. Implementing `POST /api/v1/subscribe` will fail with a missing table error.

3. **Foreign key on hypertable** — `docs/ARCHITECTURE.md:76-84`:
   ```sql
   station_id UUID REFERENCES sensor_stations(id) ON DELETE CASCADE
   ```
   **Bug:** TimescaleDB hypertables have restrictions on foreign keys. While supported in newer versions, `ON DELETE CASCADE` on a hypertable foreign key can cause severe performance degradation during deletes and may not be supported in all partitioning scenarios. Without testing, this is a landmine.

4. **No pagination on list endpoints** — `GET /api/v1/stations` and `GET /api/v1/apikeys` have no pagination. A user with many stations (or an admin viewing all) will cause an unbounded memory query and likely an OOM.

5. **No `limit` cap on `GET /api/v1/data`** — `AGENT_SPEC.md:41` lists `limit` as a query param but does not specify a maximum. A query with `limit=9999999` will scan the entire hypertable.

6. **Aggregate query without validation** — `AGENT_SPEC.md:41` says `aggregate` is a query param but does not define valid values (`avg`, `sum`, `min`, `max`, `count`). If passed directly to SQL, this is a SQL injection vector.

7. **Race condition on API key generation** — `POST /api/v1/apikeys` (`AGENT_SPEC.md:43`) will generate a key, hash it, and store the hash. If two requests arrive simultaneously for the same user, the database will handle it, but there is no uniqueness constraint on `key_hash` (not that you can have one securely with hashing). This is acceptable but worth noting.

8. **No idempotency on ingest** — If a sensor retries a `POST /api/v1/ingest` due to a timeout, duplicate readings will be inserted. No `idempotency_key` or `ON CONFLICT` logic is specified.

9. **Missing `ON DELETE` for `sensor_readings` when station is deleted** — The `sensor_stations` table has `ON DELETE CASCADE` on `user_id`, but `sensor_readings` references `sensor_stations(id)`. If a station is deleted, readings are orphaned unless a separate cleanup job runs. The schema does not specify `ON DELETE CASCADE` for the readings→stations FK.

10. **Decimal precision loss on geo coordinates** — `latitude DECIMAL(10, 8)` allows 8 decimal places (~1.1mm precision). `longitude DECIMAL(11, 8)` allows 11 total digits with 8 decimal. At 180° longitude, `180.00000000` is 11 digits total — okay, but at 3 digits before decimal, it's fine. However, no validation for `latitude` range (-90, 90) or `longitude` (-180, 180) is specified. Invalid coordinates will be stored silently.

11. **No `NOT NULL` on `timestamp`** — Wait, `timestamp` IS `NOT NULL`. But `metadata` has `DEFAULT '{}'` which is fine. `unit` is `NOT NULL` but no check on valid units.

12. **`users` table `tier` has no CHECK constraint** — Any string can be stored. Application-level validation can be bypassed by raw SQL or bugs.

---

## 6. Missing Features (MVP Blockers)

The following features are required for a functional MVP but are completely absent from the specification:

### 🔴 Critical Missing

1. **Password reset / forgot password flow** — No endpoint, no email service integration.
2. **Email verification** — Users can register with any email, including fake ones. No `is_verified` flag.
3. **Health check endpoint** — `README.md:16` mentions `curl http://localhost:8000/api/v1/health` but `AGENT_SPEC.md` does not define this route. The validation step cannot pass.
4. **Docker & docker-compose files** — `AGENT_SPEC.md:17` and `README.md:16` reference Docker, but no files exist.
5. **Database migration system** — No Alembic, no Flyway, no schema versioning. The SQL in `ARCHITECTURE.md` is static text, not a runnable migration.
6. **OpenAPI / Swagger generation** — FastAPI provides this, but no code means no docs. The `README.md:31` claims `http://localhost:8000/docs` will work.

### 🟡 High Missing

7. **Station deletion endpoint** — `AGENT_SPEC.md:39` has `GET` and `POST` for stations, no `DELETE` or `PATCH`.
8. **User profile update / password change** — No `PATCH /api/v1/me` or `POST /api/v1/me/password`.
9. **Data export** — Enterprise tier promises bulk historical exports. No endpoint or format (CSV, Parquet, JSONL) is defined.
10. **Real-time data push** — No WebSocket, SSE, or MQTT endpoint for live dashboard updates.
11. **Sensor offline alerting** — A platform monitoring environmental sensors should alert when a station stops reporting. No cron job, no threshold logic.
12. **Data validation / range checks** — `value DECIMAL(15, 6)` accepts any decimal. Negative PM2.5, 10,000°C temperature, etc., are all valid. No per-sensor-type min/max.
13. **Data retention job** — The tiers specify 7-day, 90-day, 2-year retention. No cron job or TimescaleDB retention policy is defined.
14. **Admin endpoints** — No way to list all users, moderate content, or manage tiers.
15. **Search / filter on stations** — `GET /api/v1/stations` returns all stations. No filtering by status, sensor type, or location.
16. **API key usage analytics** — No way to view call volume per key, which is essential for pay-per-query billing.
17. **Webhook endpoint for billing events** — Even a mock Stripe needs a webhook receiver.
18. **Mobile offline support** — The Android app will often be used in the field without connectivity. No local storage or sync queue is specified.
19. **Onboarding flow** — No first-run experience, no tutorial, no sample data.
20. **Terms of Service / Privacy Policy** — A platform handling user data and selling API access requires legal pages. Not mentioned.

---

## 7. Test Coverage

### Result: 0% — No Tests Exist

There are no test files, no test frameworks configured, no test data, and no CI pipeline to run tests.

### Missing Test Coverage

| Component | What Should Be Tested |
|---|---|
| **Backend** | Unit tests for auth (JWT encode/decode, expiry), rate limiting, tier enforcement, Pydantic validation, SQLAlchemy models, API route integration tests, geo query accuracy |
| **Web Dashboard** | Component tests (React Testing Library), E2E (Playwright / Cypress), build verification, accessibility (a11y) |
| **Android App** | Unit tests (Jest), integration tests for sensor submission, offline sync, Expo build sanity |
| **Data Pipeline** | Demo data generation correctness, seed script idempotency, MQTT message parsing |
| **Infrastructure** | Docker build tests, docker-compose health checks, migration roll-forward/rollback |
| **Security** | Fuzz tests on ingest, SQL injection attempts, JWT manipulation, rate-limit bypasses |
| **Performance** | Load tests for 1M readings/day, geo query latency, aggregation response times |

---

## 8. Performance Review

### N+1 Queries

The specification implies several N+1 query patterns:

1. **`GET /api/v1/stations` returning readings** — The natural dashboard use case is "list my stations with latest reading". Without an eager join or subquery, each station will trigger a separate `SELECT` for its latest reading.
2. **`GET /api/v1/apikeys` returning usage** — Showing "last used" and "call count" per key requires extra queries.
3. **`GET /api/v1/data` with no covering index** — Queries filtering by `station_id` + `sensor_type` + `timestamp` will use `idx_readings_station_time` or `idx_readings_type_time`, but not both efficiently. A composite index `(station_id, sensor_type, timestamp DESC)` is missing.

### Missing Indexes

1. **No composite index for common dashboard query** — Dashboards typically query `station_id + sensor_type + time range`. Missing: `CREATE INDEX idx_readings_dashboard ON sensor_readings (station_id, sensor_type, timestamp DESC);`
2. **No partial index for active stations** — If most stations are inactive, filtering by `status = 'active'` is common. No partial index.
3. **No index on `user_id` in `sensor_stations`** — `GET /api/v1/stations` filters by `user_id`. No index defined.
4. **No index on `api_keys.user_id`** — Listing keys by user is a common query.

### Inefficient Aggregations

1. **On-the-fly aggregation** — `GET /api/v1/data?aggregate=hourly` will run `time_bucket` or `date_trunc` over potentially millions of rows. No continuous aggregates or materialized views are defined.
2. **No TimescaleDB continuous aggregates** — The architecture mentions TimescaleDB but uses none of its advanced features beyond hypertables. Continuous aggregates for daily/hourly averages are essential.

---

## 9. Recommendations (Prioritized)

### 🔴 P0 — Launch Blockers (Do Not Deploy Without These)

1. **Write the actual code.** The project is 100% specification. No backend, no frontend, no mobile app, no pipeline.
2. **Implement the database schema correctly.** Fix the invalid GIST index (`docs/ARCHITECTURE.md:93`). Add the missing `Subscription` table. Add `CHECK` constraints and proper indexes.
3. **Add batch ingest endpoint.** `POST /api/v1/ingest/batch` is mandatory for any IoT workload.
4. **Implement JWT + refresh tokens.** 24-hour access tokens without refresh is unacceptable for a mobile app.
5. **Add rate limiting middleware.** Use Redis + sliding window. Document per-tier limits.
6. **Add health check endpoint.** `GET /api/v1/health` must exist for load balancers and monitoring.
7. **Add password reset and email verification.** MVP cannot launch without basic auth lifecycle.
8. **Add Docker & docker-compose files.** The README references them but they do not exist.
9. **Add database migrations.** Use Alembic. Do not rely on manual `CREATE TABLE` scripts.
10. **Add tests.** At minimum: backend integration tests for auth, ingest, and query; dashboard build test; mobile smoke test.

### 🟡 P1 — High Priority (Fix Before Public Beta)

11. **Add a message queue for ingest.** Decouple sensor ingestion from API availability.
12. **Implement proper geo queries.** Fix the spatial index or use PostGIS `ST_DWithin` with a proper location column.
13. **Add pagination to all list endpoints.** `limit`, `offset`, or `cursor`.
14. **Add data validation.** Per-sensor-type min/max ranges, unit validation.
15. **Add Redis caching layer.** Cache dashboard data, pricing tiers, and station lists.
16. **Add monitoring & alerting.** Prometheus, Grafana, structured logging, and PagerDuty/Slack alerts for sensor downtime.
17. **Add API key prefix + lookup.** Store a prefix for O(1) identification and O(log n) lookup.
18. **Add data retention cron job.** TimescaleDB retention policy or background worker.
19. **Add CI/CD pipeline.** GitHub Actions to build, test, and lint on every PR.
20. **Add input validation and size limits.** Cap `metadata` JSONB size, cap `limit` param, validate `aggregate` values against a whitelist.
21. **Add idempotency for ingest.** `Idempotency-Key` header or deterministic `ON CONFLICT`.
22. **Add audit logging.** Log all key generation, tier changes, and deletions.
23. **Add secret management.** Use a secrets manager or encrypted env file, never commit secrets.
24. **Add TLS/HTTPS enforcement.** Even for MVP, TLS is mandatory for any data collection platform.

### 🟢 P2 — Medium Priority (Before GA / Revenue)

25. **Implement continuous aggregates.** Precompute hourly/daily averages.
26. **Add read replicas.** Separate ingest from analytics queries.
27. **Add horizontal scaling.** Load balancer, multiple API replicas, connection pooling.
28. **Add admin dashboard.** User management, tier overrides, content moderation.
29. **Add data export functionality.** CSV/Parquet for enterprise tier.
30. **Add real-time push.** WebSocket or SSE for live dashboard updates.
31. **Add offline sync for mobile.** Local SQLite + sync queue in Expo.
32. **Add caching headers & CDN.** For dashboard static assets.
33. **Add soft deletes.** `deleted_at` columns for all entities.
34. **Add RBAC.** Roles beyond tier-based access.
35. **Add backup & disaster recovery.** Automated DB backups, tested restore procedure.

### 🔵 P3 — Nice to Have (Post-Launch)

36. **Implement the "swarm" concept.** Edge nodes, peer relay, mesh networking — or remove the buzzword.
37. **Add load testing.** k6 or Locust to validate 1M readings/day and 10K sensors.
38. **Add security audit / penetration testing.** Third-party audit before handling sensitive data.
39. **Add DDoS protection.** Cloudflare or AWS Shield in front of the API.
40. **Add multi-region deployment.** For latency-sensitive geo queries.

---

## Appendix: File Inventory

| File Path | Status | Notes |
|---|---|---|
| `AGENT_SPEC.md` | ✅ Present | Specification only; 10 API routes defined |
| `docs/ARCHITECTURE.md` | ✅ Present | SQL schema, component diagram, security plan |
| `README.md` | ✅ Present | Quick start commands reference non-existent files |
| `backend/` | ❌ **Empty** | No FastAPI code, no models, no routes, no tests |
| `web-dashboard/` | ❌ **Empty** | No React code, no components, no build config |
| `android-app/` | ❌ **Empty** | No Expo code, no mobile screens, no sensor integration |
| `data-pipeline/` | ❌ **Empty** | No Python scripts, no seed data, no MQTT config |
| `design/` | ❌ **Empty** | No mockups, no design system, no user flows |

---

> **Final Verdict:** This project is at the **specification phase**, not the **pre-launch phase**. The architecture documents contain significant design flaws (invalid SQL, missing tables, inconsistent schemas) that would create immediate bugs if implemented. The most critical action is to **begin implementation** while fixing the architectural issues identified above. Do not attempt to launch, demo, or test this project in its current state.
