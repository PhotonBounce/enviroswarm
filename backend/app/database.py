"""Async database engine and session setup."""

from functools import lru_cache
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

class Base(DeclarativeBase):
    pass

_engine = None
_AsyncSessionLocal = None


def get_engine():
    """Lazy factory for the async SQLAlchemy engine."""
    global _engine
    if _engine is None:
        settings = get_settings()
        kwargs = {
            "echo": False,
            "future": True,
            "pool_pre_ping": settings.db_pool_pre_ping,
            "pool_recycle": settings.db_pool_recycle,
        }
        # SQLite does not support pool_size / max_overflow
        if not settings.database_url.startswith("sqlite"):
            kwargs["pool_size"] = settings.db_pool_size
            kwargs["max_overflow"] = settings.db_max_overflow
        _engine = create_async_engine(
            settings.database_url,
            **kwargs,
        )
    return _engine


def get_sessionmaker():
    """Lazy factory for the async sessionmaker."""
    global _AsyncSessionLocal
    if _AsyncSessionLocal is None:
        _AsyncSessionLocal = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with get_sessionmaker()() as session:
        yield session
