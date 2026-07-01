"""Tests for data query endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta

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
            "email": "data@example.com",
            "password": "Password123"
        })
        r = await ac.post("/api/v1/auth/login", json={
            "email": "data@example.com",
            "password": "Password123"
        })
        token = r.json()["data"]["access_token"]
        ac.headers["Authorization"] = f"Bearer {token}"

        # Create a station
        station_r = await ac.post("/api/v1/stations", json={
            "name": "Data Station",
            "latitude": 40.0,
            "longitude": -74.0,
            "sensor_types": ["temperature"],
            "status": "active"
        })
        ac.station_id = station_r.json()["data"]["id"]
        yield ac


@pytest_asyncio.fixture
async def data_client(auth_client: AsyncClient):
    # Ingest a reading
    now = datetime.now(timezone.utc)
    r = await auth_client.post("/api/v1/ingest", json={
        "readings": [
            {
                "station_id": str(auth_client.station_id),
                "sensor_type": "temperature",
                "value": 22.5,
                "unit": "C",
                "timestamp": now.isoformat().replace("+00:00", "Z"),
                "metadata": {"source": "test"}
            }
        ]
    })
    assert r.status_code == 200
    yield auth_client


@pytest.mark.asyncio
async def test_query_data(data_client: AsyncClient):
    r = await data_client.get("/api/v1/data")
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_query_data_with_sensor_type(data_client: AsyncClient):
    r = await data_client.get("/api/v1/data?sensor_type=temperature")
    assert r.status_code == 200
    data = r.json()
    assert all(item["sensor_type"] == "temperature" for item in data["data"])


@pytest.mark.asyncio
async def test_query_data_start_end(data_client: AsyncClient):
    now = datetime.now(timezone.utc)
    start = (now - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    end = (now + timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    r = await data_client.get(f"/api/v1/data?start={start}&end={end}")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_query_data_start_after_end(data_client: AsyncClient):
    now = datetime.now(timezone.utc)
    start = (now + timedelta(days=1)).isoformat().replace("+00:00", "Z")
    end = (now - timedelta(days=1)).isoformat().replace("+00:00", "Z")
    r = await data_client.get(f"/api/v1/data?start={start}&end={end}")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_query_data_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/data")
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_nearby(data_client: AsyncClient):
    r = await data_client.get("/api/v1/data/nearby?lat=40.0&lon=-74.0&radius_km=10")
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_nearby_sensor_type_filter(data_client: AsyncClient):
    r = await data_client.get("/api/v1/data/nearby?lat=40.0&lon=-74.0&radius_km=10&sensor_type=temperature")
    assert r.status_code == 200
    data = r.json()
    assert all("temperature" in s["sensor_types"] for s in data["data"])


@pytest.mark.asyncio
async def test_nearby_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/data/nearby?lat=40.0&lon=-74.0&radius_km=10")
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_query_data_with_api_key(data_client: AsyncClient):
    # Upgrade to pro to create API key
    sub_r = await data_client.post("/api/v1/subscribe", json={
        "tier": "pro",
        "duration_months": 1
    })
    assert sub_r.status_code == 200

    create_r = await data_client.post("/api/v1/apikeys", json={
        "name": "Read Key",
        "permissions": {"read": True, "write": False}
    })
    raw_key = create_r.json()["data"]["key"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        ac.headers["X-API-Key"] = raw_key
        r = await ac.get("/api/v1/data")
        assert r.status_code == 200

        # No write permission → 403 on ingest (handled by ingest router, not data router)
        r = await ac.get("/api/v1/data/nearby?lat=40.0&lon=-74.0&radius_km=10")
        assert r.status_code == 200
