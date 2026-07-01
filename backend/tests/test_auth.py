"""Tests for auth endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_engine, Base


@pytest_asyncio.fixture(scope="function")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # Register
    r = await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "Password123"
    })
    assert r.status_code == 201
    data = r.json()
    assert data["success"] is True
    assert data["data"]["email"] == "test@example.com"

    # Login
    r = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "Password123"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "access_token" in data["data"]


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient):
    # Register
    await client.post("/api/v1/auth/register", json={
        "email": "me@example.com",
        "password": "Password123"
    })
    # Login
    r = await client.post("/api/v1/auth/login", json={
        "email": "me@example.com",
        "password": "Password123"
    })
    token = r.json()["data"]["access_token"]

    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["data"]["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    # Register
    await client.post("/api/v1/auth/register", json={
        "email": "refresh@example.com",
        "password": "Password123"
    })
    # Login
    r = await client.post("/api/v1/auth/login", json={
        "email": "refresh@example.com",
        "password": "Password123"
    })
    old_access_token = r.json()["data"]["access_token"]
    refresh_token = r.json()["data"]["refresh_token"]

    # Refresh
    r = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["access_token"] != old_access_token


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "dup@example.com",
        "password": "Password123"
    })
    r = await client.post("/api/v1/auth/register", json={
        "email": "dup@example.com",
        "password": "Password123"
    })
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json={
        "email": "weak@example.com",
        "password": "pass"
    })
    assert r.status_code in (400, 422)


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "wrongpass@example.com",
        "password": "Password123"
    })
    r = await client.post("/api/v1/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "WrongPassword123"
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_missing_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_malformed_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer badtoken"})
    assert r.status_code == 401
