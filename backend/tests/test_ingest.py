"""Tests for ingest endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from datetime import datetime, timedelta, timezone

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


@pytest.mark.asyncio
async def test_ingest_daily_limit_exceeded(auth_client: AsyncClient):
    readings = [
        {
            "station_id": str(auth_client.station_id),
            "sensor_type": "temperature",
            "value": 22.5,
            "unit": "C",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        for _ in range(101)
    ]
    r = await auth_client.post("/api/v1/ingest", json={"readings": readings})
    assert r.status_code == 403
    assert "Daily reading limit exceeded" in r.json()["error"]


@pytest.mark.asyncio
async def test_ingest_invalid_sensor_type(auth_client: AsyncClient):
    r = await auth_client.post("/api/v1/ingest", json={
        "readings": [
            {
                "station_id": auth_client.station_id,
                "sensor_type": "invalid_sensor",
                "value": 22.5,
                "unit": "C",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]
    })
    assert r.status_code in (400, 422)


@pytest.mark.asyncio
async def test_ingest_out_of_bounds_timestamp(auth_client: AsyncClient):
    r = await auth_client.post("/api/v1/ingest", json={
        "readings": [
            {
                "station_id": auth_client.station_id,
                "sensor_type": "temperature",
                "value": 22.5,
                "unit": "C",
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
            }
        ]
    })
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_ingest_idempotency_key_replay(auth_client: AsyncClient):
    idem_key = "test-replay-key"
    payload = {
        "readings": [
            {
                "station_id": auth_client.station_id,
                "sensor_type": "temperature",
                "value": 22.5,
                "unit": "C",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]
    }
    r1 = await auth_client.post("/api/v1/ingest", json=payload, headers={"X-Idempotency-Key": idem_key})
    assert r1.status_code == 200
    r2 = await auth_client.post("/api/v1/ingest", json=payload, headers={"X-Idempotency-Key": idem_key})
    assert r2.status_code == 200
    assert r2.json()["data"] == r1.json()["data"]


@pytest.mark.asyncio
async def test_ingest_idempotency_key_too_long(auth_client: AsyncClient):
    long_key = "x" * 257
    r = await auth_client.post("/api/v1/ingest", json={
        "readings": [
            {
                "station_id": auth_client.station_id,
                "sensor_type": "temperature",
                "value": 22.5,
                "unit": "C",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]
    }, headers={"X-Idempotency-Key": long_key})
    assert r.status_code == 400
    assert "too long" in r.json()["error"].lower()


@pytest.mark.asyncio
async def test_ingest_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post("/api/v1/ingest", json={
            "readings": [
                {
                    "station_id": "00000000-0000-0000-0000-000000000000",
                    "sensor_type": "temperature",
                    "value": 22.5,
                    "unit": "C",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ]
        })
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_ingest_api_key_without_write_permission():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={
            "email": "proingest@example.com",
            "password": "Password123"
        })
        login_r = await ac.post("/api/v1/auth/login", json={
            "email": "proingest@example.com",
            "password": "Password123"
        })
        token = login_r.json()["data"]["access_token"]
        ac.headers["Authorization"] = f"Bearer {token}"

        # Subscribe to pro
        sub_r = await ac.post("/api/v1/subscribe", json={
            "tier": "pro",
            "duration_months": 1
        })
        assert sub_r.status_code == 200

        # Create a station
        station_r = await ac.post("/api/v1/stations", json={
            "name": "API Key Station",
            "latitude": 40.0,
            "longitude": -74.0,
            "sensor_types": ["temperature"],
            "status": "active"
        })
        station_id = station_r.json()["data"]["id"]

        # Create API key with read-only permission
        key_r = await ac.post("/api/v1/apikeys", json={
            "name": "Read Only Key",
            "permissions": {"read": True, "write": False}
        })
        assert key_r.status_code == 200
        api_key = key_r.json()["data"]["key"]

        # Try to ingest with read-only API key
        ac.headers.pop("Authorization")
        ac.headers["X-API-Key"] = api_key
        r = await ac.post("/api/v1/ingest", json={
            "readings": [
                {
                    "station_id": station_id,
                    "sensor_type": "temperature",
                    "value": 22.5,
                    "unit": "C",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ]
        })
        assert r.status_code == 403
