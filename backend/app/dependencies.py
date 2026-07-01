"""Rate limiting, tier checking, and API key auth dependencies."""

import asyncio
import hmac
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Header, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_sessionmaker
from app.models import ApiKey, User
from app.auth import decode_access_token
from app.utils.crypto import hash_key, extract_prefix
from app.constants import RATE_LIMITS

# ---------------------------------------------------------------------------
# In-memory rate-limit store: { key: (count, window_start) }
# Replace with Redis in production.
# ---------------------------------------------------------------------------

_rate_limit_store: dict = {}
_rate_limit_lock = asyncio.Lock()

_MAX_RATE_LIMIT_ENTRIES = 100_000


def _get_rate_limit_key(identifier: str, route: str) -> str:
    return f"{identifier}:{route}"


def _evict_rate_limit_entries(now: int) -> None:
    """Evict expired entries and enforce max size via LRU."""
    window = 60
    expired = [k for k, (count, window_start) in _rate_limit_store.items() if now - window_start >= window]
    for k in expired:
        _rate_limit_store.pop(k, None)
    # If still too large, evict oldest entries (by window_start)
    if len(_rate_limit_store) > _MAX_RATE_LIMIT_ENTRIES:
        sorted_items = sorted(_rate_limit_store.items(), key=lambda x: x[1][1])
        to_evict = len(_rate_limit_store) - _MAX_RATE_LIMIT_ENTRIES
        for k, _ in sorted_items[:to_evict]:
            _rate_limit_store.pop(k, None)


async def check_rate_limit(identifier: str, route: str, limit: int) -> bool:
    """Return True if request is allowed, False if rate-limited."""
    key = _get_rate_limit_key(identifier, route)
    now = int(time.time())
    window = 60  # 1 minute

    async with _rate_limit_lock:
        _evict_rate_limit_entries(now)
        count, window_start = _rate_limit_store.get(key, (0, now))
        if now - window_start >= window:
            # new window
            _rate_limit_store[key] = (1, now)
            return True

        if count >= limit:
            return False

        _rate_limit_store[key] = (count + 1, window_start)
        return True


# ---------------------------------------------------------------------------
# API key extraction
# ---------------------------------------------------------------------------

def extract_api_key(request: Request, x_api_key: Optional[str] = Header(None)) -> Optional[str]:
    if x_api_key:
        return x_api_key
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        # API keys are 64 hex chars; JWTs are longer and contain dots
        if len(token) == 64 and all(c in "0123456789abcdef" for c in token.lower()):
            return token
    return None


# ---------------------------------------------------------------------------
# API key auth dependency
# ---------------------------------------------------------------------------

async def get_current_user_or_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate via API key (x-api-key header or Bearer token that looks like an API key)
    or fall back to JWT bearer token.
    """
    cached = getattr(request.state, "_cached_user", None)
    if cached is not None:
        return cached

    api_key_val = extract_api_key(request, x_api_key)
    if api_key_val:
        prefix = extract_prefix(api_key_val)
        key_hash = hash_key(api_key_val)
        # O(1) lookup by prefix, then O(1) hash verification
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.key_prefix == prefix,
                ApiKey.deleted_at.is_(None),
            )
        )
        keys = result.scalars().all()
        for api_key in keys:
            if hmac.compare_digest(api_key.key_hash, key_hash):
                if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED, detail="API key expired"
                    )
                # Update last_used_at in a separate session to avoid committing shared session
                async with get_sessionmaker()() as session:
                    await session.execute(
                        update(ApiKey)
                        .where(ApiKey.id == api_key.id)
                        .values(last_used_at=datetime.now(timezone.utc))
                    )
                    await session.commit()
                user_result = await db.execute(
                    select(User).where(
                        User.id == api_key.user_id,
                        User.is_active == True,
                        User.deleted_at.is_(None),
                    )
                )
                user = user_result.scalar_one_or_none()
                if user is None:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED, detail="API key owner not found or inactive"
                    )
                # Attach rate limit info for dependency use later
                request.state.api_key = api_key
                request.state._cached_user = user
                return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )

    # Fall back to JWT
    auth = request.headers.get("Authorization", "")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication"
        )
    token = auth[7:].strip()
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID in token"
        )
    result = await db.execute(
        select(User).where(
            User.id == user_uuid,
            User.is_active == True,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive"
        )
    request.state._cached_user = user
    return user


# ---------------------------------------------------------------------------
# Rate-limit dependency
# ---------------------------------------------------------------------------

async def rate_limit_dependency(
    request: Request,
    user: User = Depends(get_current_user_or_api_key),
) -> User:
    route = f"{request.method}:{request.url.path}"
    limit = RATE_LIMITS.get(user.tier, 10)
    # Check if an API key is in use and has a custom limit
    api_key = getattr(request.state, "api_key", None)
    if api_key:
        limit = api_key.rate_limit_per_min

    identifier = str(user.id)
    if not await check_rate_limit(identifier, route, limit):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
    return user


# ---------------------------------------------------------------------------
# Permission checking
# ---------------------------------------------------------------------------

def require_permission(*allowed_permissions: str):
    """Dependency factory that raises 403 if the API key lacks any of the allowed permissions.

    JWT-authenticated users (no api_key in request.state) are always permitted.
    """
    async def checker(request: Request, user: User = Depends(get_current_user_or_api_key)) -> User:
        api_key = getattr(request.state, "api_key", None)
        if api_key:
            perms = api_key.permissions or {}
            if not any(perms.get(p, False) for p in allowed_permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"API key lacks required permission: {', '.join(allowed_permissions)}",
                )
        return user
    return checker


# ---------------------------------------------------------------------------
# Tier checking
# ---------------------------------------------------------------------------

def require_tier(*allowed_tiers: str):
    async def checker(user: User = Depends(get_current_user_or_api_key)) -> User:
        if user.tier not in allowed_tiers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires tier: {', '.join(allowed_tiers)}",
            )
        return user
    return checker
