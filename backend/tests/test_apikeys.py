"""Tests for API key endpoints."""

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
            "email": "apikey@example.com",
            "password": "Password123"
        })
        r = await ac.post("/api/v1/auth/login", json={
            "email": "apikey@example.com",
            "password": "Password123"
        })
        token = r.json()["data"]["access_token"]
        ac.headers["Authorization"] = f"Bearer {token}"
        yield ac


@pytest_asyncio.fixture
async def pro_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={
            "email": "pro@example.com",
            "password": "Password123"
        })
        login_r = await ac.post("/api/v1/auth/login", json={
            "email": "pro@example.com",
            "password": "Password123"
        })
        token = login_r.json()["data"]["access_token"]
        ac.headers["Authorization"] = f"Bearer {token}"
        # Upgrade to pro via subscription
        sub_r = await ac.post("/api/v1/subscribe", json={
            "tier": "pro",
            "duration_months": 1
        })
        assert sub_r.status_code == 200
        yield ac


@pytest.mark.asyncio
async def test_create_api_key(pro_client: AsyncClient):
    r = await pro_client.post("/api/v1/apikeys", json={
        "name": "Test Key",
        "permissions": {"read": True, "write": True}
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "key" in data["data"]
    assert data["data"]["name"] == "Test Key"


@pytest.mark.asyncio
async def test_list_api_keys(pro_client: AsyncClient):
    await pro_client.post("/api/v1/apikeys", json={
        "name": "Key 1",
        "permissions": {"read": True, "write": False}
    })
    r = await pro_client.get("/api/v1/apikeys")
    assert r.status_code == 200
    data = r.json()
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_revoke_api_key(pro_client: AsyncClient):
    create_r = await pro_client.post("/api/v1/apikeys", json={
        "name": "Revoke Key",
        "permissions": {"read": True, "write": False}
    })
    key_id = create_r.json()["data"]["id"]
    r = await pro_client.delete(f"/api/v1/apikeys/{key_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["data"]["revoked"] == str(key_id)


@pytest.mark.asyncio
async def test_api_key_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/apikeys")
        assert r.status_code == 401

        r = await ac.post("/api/v1/apikeys", json={"name": "No Auth"})
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_api_key_free_tier_forbidden(auth_client: AsyncClient):
    # Free tier cannot create API keys (limit = 0)
    r = await auth_client.post("/api/v1/apikeys", json={
        "name": "Free Key",
        "permissions": {"read": True, "write": False}
    })
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_api_key_with_api_key_auth(pro_client: AsyncClient):
    create_r = await pro_client.post("/api/v1/apikeys", json={
        "name": "Read Key",
        "permissions": {"read": True, "write": False}
    })
    raw_key = create_r.json()["data"]["key"]

    # Use API key to list keys (read permission)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        ac.headers["X-API-Key"] = raw_key
        r = await ac.get("/api/v1/apikeys")
        assert r.status_code == 200

        # Use API key to create another key (no write permission) → 403
        r = await ac.post("/api/v1/apikeys", json={"name": "New Key"})
        assert r.status_code == 403
