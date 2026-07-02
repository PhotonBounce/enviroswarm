# ENViroSwarm Data Pipeline

Demo data generators, simulated sensor networks, and MQTT broker setup for testing and demonstration.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the MQTT Broker (Optional)

```bash
docker-compose -f docker-compose.mqtt.yml up -d
```

This starts an Eclipse Mosquitto broker on:
- `localhost:1883` — MQTT
- `localhost:9001` — WebSocket

### 3. Set Demo Password

```bash
export DEMO_PASSWORD=<your-demo-password>
```

> The `DEMO_PASSWORD` environment variable is **required**.
> You can also override it per-run with `--password`.

### 4. Run the Demo Seeder

```bash
# Dry-run (no API calls, just verify generation logic)
python seed_demo.py --dry-run

# Full run (requires backend running on http://localhost:8000)
python seed_demo.py
```

## What It Does

`seed_demo.py` performs the following steps:

1. **Registers a demo user** (`demo@enviroswarm.local` / `<your-demo-password>`) if not already present
2. **Logs in** to obtain a JWT access token
3. **Creates 30 simulated sensor stations** across 5 cities:
   - New York City, USA
   - Los Angeles, USA
   - London, UK
   - Tokyo, Japan
   - Berlin, Germany
4. **Generates 30 days of historical readings** per station per sensor type, at 15-minute intervals
5. **Submits data in batches** to the backend ingest API (`POST /api/v1/ingest`)
6. **Simulates real-world imperfections** — random missing readings and occasional outliers

## Sensor Types & Ranges

| Sensor Type | Unit | Range | Notes |
|-------------|------|-------|-------|
| `temperature` | °C | -20 to 40 (outliers: -80 to +90) | Seasonal bias applied per city |
| `humidity` | % | 10 to 100 | Inversely correlated with temperature |
| `co2` | ppm | 350 to 600 | Higher in urban areas |
| `pm25` | µg/m³ | 0 to 150 | Higher in dense cities |
| `pm10` | µg/m³ | 0 to 200 | Correlated with pm25 |
| `noise_level` | dB | 30 to 100 | Higher near city centers |
| `radiation` | µSv/h | 0.05 to 0.30 | Baseline + small variance |
| `air_quality` | AQI | 0 to 200 | Derived from pm25 + pm10 |
| `water_quality` | WQI | 0 to 100 | Higher = better |
| `voc` | ppb | 50 to 1000 | Volatile organic compounds |

## MQTT Components

- `mqtt/publisher.py` — Publishes sensor readings to the local MQTT broker in JSON format
- `mqtt/subscriber.py` — Subscribes to sensor topics and forwards payloads to the ingest API

## Project Structure

```
data-pipeline/
├── requirements.txt
├── docker-compose.mqtt.yml
├── seed_demo.py              # Main demo script
├── generators/
│   ├── station_factory.py    # Generate demo stations with realistic coordinates
│   └── reading_generator.py  # Generate time-series sensor readings
├── mqtt/
│   ├── config/
│   │   └── mosquitto.conf    # Broker configuration
│   ├── publisher.py          # MQTT publish example
│   └── subscriber.py         # MQTT subscribe + API forward example
└── README.md
```

## Troubleshooting

- **Backend not running**: Ensure `docker-compose up --build -d` is running in the `backend/` directory before running the full seeder.
- **DEMO_PASSWORD missing**: If you see `DEMO_PASSWORD environment variable is required`, export it first: `export DEMO_PASSWORD=<your-demo-password>` or pass `--password`.
- **Auth failures**: The demo user is auto-created; if it already exists, the script will login instead. You can override credentials with `--email`, `--password`, and `--tier` flags.
- **Rate limiting**: If you hit rate limits, increase `--batch-delay` or reduce `--batch-size`.
- **Appending readings**: Use `--append` to add new readings to existing stations without creating duplicates.
- **Cleanup**: Use `--cleanup` to delete demo stations created during the run. Note: only stations created in the current run are removed.
- **Duration**: Use `--duration-months` to change the subscription duration (default: 1).
