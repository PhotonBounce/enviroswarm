"""Tests for station endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_engine, Base


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def auth_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register and login
        await ac.post("/api/v1/auth/register", json={
            "email": "station@example.com",
            "password": "Password123"
        })
        r = await ac.post("/api/v1/auth/login", json={
            "email": "station@example.com",
            "password": "Password123"
        })
        token = r.json()["data"]["access_token"]
        ac.headers["Authorization"] = f"Bearer {token}"
        yield ac


@pytest.mark.asyncio
async def test_create_station(auth_client: AsyncClient):
    r = await auth_client.post("/api/v1/stations", json={
        "name": "Test Station",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "sensor_types": ["temperature", "co2"],
        "status": "active"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Test Station"


@pytest.mark.asyncio
async def test_list_stations(auth_client: AsyncClient):
    await auth_client.post("/api/v1/stations", json={
        "name": "Station A",
        "latitude": 40.0,
        "longitude": -74.0,
        "sensor_types": ["temperature"],
        "status": "active"
    })
    r = await auth_client.get("/api/v1/stations")
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1
