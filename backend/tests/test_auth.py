"""Tests for auth endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.database import AsyncSessionLocal, engine, Base
from app.models import User
from app.auth import hash_password


@pytest.fixture(scope="module")
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # Register
    r = await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["email"] == "test@example.com"

    # Login
    r = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
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
        "password": "password123"
    })
    # Login
    r = await client.post("/api/v1/auth/login", json={
        "email": "me@example.com",
        "password": "password123"
    })
    token = r.json()["data"]["access_token"]

    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["data"]["email"] == "me@example.com"
