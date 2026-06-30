# ENViroSwarm

> A swarm-like environmental sensor data network. Collect, aggregate, and monetize environmental data.

## Architecture

- **Backend**: Python FastAPI + PostgreSQL/TimescaleDB
- **Web Dashboard**: React + Vite + TypeScript + Tailwind + shadcn/ui
- **Android App**: React Native (Expo) + TypeScript
- **Data Pipeline**: Python async generators + MQTT ingest

## Quick Start

```bash
# Start backend + database
cd backend && docker-compose up --build -d

# Start web dashboard
cd web-dashboard && npm install && npm run dev

# Start Android app (requires Expo Go on phone or emulator)
cd android-app && npm install && npx expo start

# Seed demo data
pip install -r data-pipeline/requirements.txt
python data-pipeline/seed_demo.py
```

## API Docs

Once backend is running: `http://localhost:8000/docs`

## License

MIT
