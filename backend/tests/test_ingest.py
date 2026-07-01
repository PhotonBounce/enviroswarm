"""Tests for ingest endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from datetime import datetime, timezone

from app.main import app
from app.database import get_engine, Base
from app.dependencies import _rate_limit_store


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    _rate_limit_store.clear()
    yield


@pytest_asyncio.fixture
async def auth_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={
            "email": "ingest@example.com",
            "password": "Password123"
        })
        r = await ac.post("/api/v1/auth/login", json={
            "email": "ingest@example.com",
            "password": "Password123"
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
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metadata": {"source": "test"}
            }
        ]
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["inserted"] == 1
