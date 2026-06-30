# ENViroSwarm Architecture

## System Overview

ENViroSwarm is a multi-tenant SaaS platform that:
1. Ingests environmental sensor data from distributed sources (mobile devices, IoT sensors, manual entry)
2. Stores time-series data in a purpose-built database
3. Provides a REST API for querying aggregated and raw data
4. Offers a web dashboard for visualization and management
5. Provides an Android app for field data collection and mobile access

## Swarm Concept

The "swarm" aspect is realized through:
- **Distributed Sensor Nodes**: Each user/device becomes a data source
- **Network Effect**: More sensors = better coverage = more valuable data = more users
- **Self-Reinforcing**: Free users contribute data, paid users consume aggregated insights
- **Geo-Mesh**: Data quality improves with density; the platform becomes more valuable as it grows

## Component Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Android App    │     │  Web Dashboard  │     │  External API   │
│  (React Native) │     │  (React)        │     │  Consumers      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │   FastAPI Backend         │
                    │   - Auth (JWT)            │
                    │   - Rate Limiting         │
                    │   - Subscription Tiers    │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   PostgreSQL +            │
                    │   TimescaleDB             │
                    │   (Time-series hypertable)│
                    └───────────────────────────┘
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    tier VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Sensor Stations Table
```sql
CREATE TABLE sensor_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    sensor_types TEXT[] NOT NULL, -- array of sensor type enums
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, maintenance
    location GEOGRAPHY(POINT, 4326), -- PostGIS point
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Sensor Readings Hypertable (TimescaleDB)
```sql
CREATE TABLE sensor_readings (
    id UUID DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES sensor_stations(id) ON DELETE CASCADE,
    sensor_type VARCHAR(30) NOT NULL,
    value DECIMAL(15, 6) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}',
    PRIMARY KEY (id, timestamp)
);

-- Convert to hypertable for time-series performance
SELECT create_hypertable('sensor_readings', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Critical indexes
CREATE INDEX idx_readings_station_time ON sensor_readings (station_id, timestamp DESC);
CREATE INDEX idx_readings_type_time ON sensor_readings (sensor_type, timestamp DESC);
CREATE INDEX idx_readings_geo ON sensor_readings USING GIST (station_id, timestamp); -- for geo queries
```

### API Keys Table
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '{"read": true, "write": false}',
    rate_limit_per_min INT DEFAULT 60,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Design Principles

1. **Versioned**: All routes under `/api/v1/`
2. **Consistent**: All responses wrapped in `{success, data, error, meta}`
3. **Rate-Limited**: Per API key or per user
4. **Geo-Enabled**: Native geo queries for nearby sensors
5. **Aggregated**: Support for time-based aggregation (hourly, daily, monthly averages)

## Security

- JWT tokens with 24h expiry
- API keys with granular permissions
- Rate limiting per tier
- Input validation with Pydantic
- SQL injection prevention via SQLAlchemy ORM
- CORS configured for known origins

## Scalability Plan

1. **Phase 1 (MVP)**: Single Docker container, local PostgreSQL
2. **Phase 2**: Separate API and DB containers, Redis for caching/rate limiting
3. **Phase 3**: Kubernetes, read replicas, CDN for dashboard
4. **Phase 4**: Multi-region, edge ingestion points, Kafka for high-volume ingest
