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


@pytest_asyncio.fixture
async def other_user_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={
            "email": "other@example.com",
            "password": "Password123"
        })
        r = await ac.post("/api/v1/auth/login", json={
            "email": "other@example.com",
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


@pytest.mark.asyncio
async def test_list_stations_status_filter(auth_client: AsyncClient):
    await auth_client.post("/api/v1/stations", json={
        "name": "Active Station",
        "latitude": 40.0,
        "longitude": -74.0,
        "sensor_types": ["temperature"],
        "status": "active"
    })
    await auth_client.post("/api/v1/stations", json={
        "name": "Inactive Station",
        "latitude": 41.0,
        "longitude": -75.0,
        "sensor_types": ["co2"],
        "status": "inactive"
    })

    r = await auth_client.get("/api/v1/stations?status=active")
    assert r.status_code == 200
    data = r.json()
    assert all(s["status"] == "active" for s in data["data"])

    r = await auth_client.get("/api/v1/stations?status=inactive")
    assert r.status_code == 200
    data = r.json()
    assert all(s["status"] == "inactive" for s in data["data"])


@pytest.mark.asyncio
async def test_update_station(auth_client: AsyncClient):
    create_r = await auth_client.post("/api/v1/stations", json={
        "name": "Update Station",
        "latitude": 40.0,
        "longitude": -74.0,
        "sensor_types": ["temperature"],
        "status": "active"
    })
    station_id = create_r.json()["data"]["id"]

    r = await auth_client.patch(f"/api/v1/stations/{station_id}", json={
        "name": "Updated Name"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["data"]["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_station(auth_client: AsyncClient):
    create_r = await auth_client.post("/api/v1/stations", json={
        "name": "Delete Station",
        "latitude": 40.0,
        "longitude": -74.0,
        "sensor_types": ["temperature"],
        "status": "active"
    })
    station_id = create_r.json()["data"]["id"]

    r = await auth_client.delete(f"/api/v1/stations/{station_id}")
    assert r.status_code == 200

    r = await auth_client.get(f"/api/v1/stations/{station_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_station_tier_limit(auth_client: AsyncClient):
    # Free tier limit is 1 station
    r = await auth_client.post("/api/v1/stations", json={
        "name": "First Station",
        "latitude": 40.0,
        "longitude": -74.0,
        "sensor_types": ["temperature"],
        "status": "active"
    })
    assert r.status_code == 200

    r = await auth_client.post("/api/v1/stations", json={
        "name": "Second Station",
        "latitude": 41.0,
        "longitude": -75.0,
        "sensor_types": ["co2"],
        "status": "active"
    })
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_unauthorized_station_access(other_user_client: AsyncClient, auth_client: AsyncClient):
    # auth_client creates a station
    create_r = await auth_client.post("/api/v1/stations", json={
        "name": "Private Station",
        "latitude": 40.0,
        "longitude": -74.0,
        "sensor_types": ["temperature"],
        "status": "active"
    })
    station_id = create_r.json()["data"]["id"]

    # other_user_client tries to access it
    r = await other_user_client.get(f"/api/v1/stations/{station_id}")
    assert r.status_code == 404

    r = await other_user_client.patch(f"/api/v1/stations/{station_id}", json={
        "name": "Hacked"
    })
    assert r.status_code == 404

    r = await other_user_client.delete(f"/api/v1/stations/{station_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_station_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/stations")
        assert r.status_code == 401

        r = await ac.post("/api/v1/stations", json={
            "name": "No Auth Station",
            "latitude": 40.0,
            "longitude": -74.0,
            "sensor_types": ["temperature"],
            "status": "active"
        })
        assert r.status_code == 401
