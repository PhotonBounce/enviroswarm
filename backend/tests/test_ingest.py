"""Tests for ingest endpoints."""

import pytest
from httpx import AsyncClient

from app.main import app
from app.database import engine, Base


@pytest.fixture(autouse=True)
async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
async def auth_client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={
            "email": "ingest@example.com",
            "password": "password123"
        })
        r = await ac.post("/api/v1/auth/login", json={
            "email": "ingest@example.com",
            "password": "password123"
        })
        token = r.json()["data"]["access_token"]
        ac.headers["Authorization"] = f"Bearer {token}"

        # Create a station
        station_r = await ac.post("/api/v1/stations", json={
            "name": "Ingest Station",
            "latitude": 40.0,
            "longitude": -74.0,
            "sensor_types": ["temperature"],
            "status": "active"
        })
        station_id = station_r.json()["data"]["id"]
        ac.station_id = station_id
        yield ac


@pytest.mark.asyncio
async def test_ingest_data(auth_client: AsyncClient):
    r = await auth_client.post("/api/v1/ingest", json={
        "readings": [
            {
                "station_id": auth_client.station_id,
                "sensor_type": "temperature",
                "value": 22.5,
                "unit": "C",
                "timestamp": "2024-06-01T12:00:00Z",
                "metadata": {"source": "test"}
            }
        ]
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["inserted"] == 1
