# ENViroSwarm — Agent Coordination Spec

## Vision
A **swarm-like environmental sensor data network** that collects, aggregates, and monetizes environmental sensor data (air quality, noise, temperature, radiation, water quality). Users contribute sensor data via mobile apps or IoT devices. The platform sells curated API access to researchers, city planners, agriculture, and health organizations.

---

## Stack

| Layer | Technology |
|---|---|
| SaaS API | Python FastAPI + async SQLAlchemy + PostgreSQL/TimescaleDB |
| Web Dashboard | React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts |
| Android App | React Native (Expo) + TypeScript |
| Data Pipeline | Python async collectors + MQTT/WebSocket ingest |
| Auth | JWT (PyJWT) + bcrypt |
| DevOps | Docker + docker-compose |

---

## Data Model (Shared Contract — Do Not Change Without Approval)

### Entities
- `User` — id, email, hashed_password, tier (free/pro/enterprise), created_at
- `SensorStation` — id, user_id, name, lat, lon, sensor_types[], status, created_at
- `SensorReading` — id, station_id, sensor_type (enum), value (float), unit (str), timestamp (TIMESTAMPTZ), metadata (JSONB)
- `ApiKey` — id, user_id, key_hash, permissions (JSONB), rate_limit, expires_at
- `Subscription` — id, user_id, tier, start_date, end_date, payment_status

### Sensor Types Enum
`air_quality`, `temperature`, `humidity`, `noise_level`, `radiation`, `water_quality`, `co2`, `pm25`, `pm10`, `voc`

### API Routes (Contract)
- `POST /api/v1/auth/register` — body: `{email, password}`
- `POST /api/v1/auth/login` — body: `{email, password}` → `{access_token, token_type}`
- `GET /api/v1/me` — returns current user
- `POST /api/v1/stations` — create station (auth required)
- `GET /api/v1/stations` — list user's stations
- `GET /api/v1/stations/{id}` — get station details
- `POST /api/v1/ingest` — ingest sensor data (API key or JWT)
- `GET /api/v1/data` — query sensor data (query params: `station_id`, `sensor_type`, `start`, `end`, `limit`, `aggregate`)
- `GET /api/v1/data/nearby` — geo-query: `lat`, `lon`, `radius_km`, `sensor_type`
- `POST /api/v1/apikeys` — generate API key (pro/enterprise only)
- `GET /api/v1/apikeys` — list keys
- `DELETE /api/v1/apikeys/{id}` — revoke key
- `GET /api/v1/pricing` — public pricing tiers
- `POST /api/v1/subscribe` — Stripe-style checkout (mock for MVP)

### Response Format
All JSON responses: `{ success: bool, data: any, error?: string, meta?: {page, limit, total} }`

---

## Worker Slices & Ownership

| Worker | Scope | Allowed Edit | Forbidden |
|---|---|---|---|
| **backend** | FastAPI app, models, schemas, routes, auth, database | `backend/` | `web-dashboard/`, `android-app/`, `data-pipeline/` |
| **web-dashboard** | React webapp, dashboard pages, charts, auth context | `web-dashboard/` | `backend/`, `android-app/`, `data-pipeline/` |
| **android-app** | React Native Expo app, sensor submission, map view | `android-app/` | `backend/`, `web-dashboard/`, `data-pipeline/` |
| **data-pipeline** | Demo data generators, MQTT broker config, seed scripts | `data-pipeline/` | `backend/`, `web-dashboard/`, `android-app/` |
| **critique-qa** | Review code, find bugs, suggest improvements | Read-only all dirs | — |
| **monetization** | Pricing model, business plan, monetization strategy | `docs/business/` | Code dirs |
| **ui-ux** | Design system, mockups, user flows | `design/` | Code dirs (except CSS variables via feedback) |

---

## Merge Order
1. `backend` (API must exist first)
2. `web-dashboard` (depends on backend contracts)
3. `android-app` (depends on API)
4. `data-pipeline` (seeds demo data, no blockers)
5. Main agent integrates, runs tests, fixes conflicts

---

## Validation
- Backend: `docker-compose up --build -d` then `curl http://localhost:8000/api/v1/health`
- Web Dashboard: `npm run build` must pass
- Android: `npx expo prebuild` or `npx expo start` sanity check
- Data Pipeline: Python scripts run without errors

---

## Monetization (Baseline)
- **Free Tier**: 1 station, 100 readings/day, 7-day retention, no API key
- **Pro Tier ($29/mo)**: 10 stations, 10K readings/day, 90-day retention, 1 API key
- **Enterprise ($299/mo)**: Unlimited stations, unlimited readings, 2-year retention, 10 API keys, SLA support
- **Pay-per-query**: $0.001 per API call beyond tier limits
- **Data Licensing**: Bulk historical data exports for research institutions
