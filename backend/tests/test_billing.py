"""Tests for billing/subscription endpoints."""

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
        await ac.post("/api/v1/auth/register", json={
            "email": "billing@example.com",
            "password": "Password123"
        })
        r = await ac.post("/api/v1/auth/login", json={
            "email": "billing@example.com",
            "password": "Password123"
        })
        token = r.json()["data"]["access_token"]
        ac.headers["Authorization"] = f"Bearer {token}"
        yield ac


@pytest.mark.asyncio
async def test_get_pricing():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/pricing")
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert len(data["data"]) >= 2


@pytest.mark.asyncio
async def test_subscribe(auth_client: AsyncClient):
    r = await auth_client.post("/api/v1/subscribe", json={
        "tier": "pro",
        "duration_months": 1
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["tier"] == "pro"


@pytest.mark.asyncio
async def test_subscribe_duplicate(auth_client: AsyncClient):
    r = await auth_client.post("/api/v1/subscribe", json={
        "tier": "pro",
        "duration_months": 1
    })
    assert r.status_code == 200

    # Second subscription should conflict
    r = await auth_client.post("/api/v1/subscribe", json={
        "tier": "enterprise",
        "duration_months": 1
    })
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_subscribe_invalid_tier(auth_client: AsyncClient):
    r = await auth_client.post("/api/v1/subscribe", json={
        "tier": "free",
        "duration_months": 1
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_subscribe_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post("/api/v1/subscribe", json={
            "tier": "pro",
            "duration_months": 1
        })
        assert r.status_code == 401
