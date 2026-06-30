"""Rate limiting, tier checking, and API key auth dependencies."""

import secrets
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Header, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ApiKey, User
from app.auth import decode_access_token, get_current_user

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ---------------------------------------------------------------------------
# In-memory rate-limit store: { key: (count, window_start) }
# Replace with Redis in production.
# ---------------------------------------------------------------------------

_rate_limit_store: dict = {}

RATE_LIMITS = {
    "free": 10,
    "pro": 100,
    "enterprise": 1000,
}


def _get_rate_limit_key(identifier: str, route: str) -> str:
    return f"{identifier}:{route}"


def check_rate_limit(identifier: str, route: str, limit: int) -> bool:
    """Return True if request is allowed, False if rate-limited."""
    key = _get_rate_limit_key(identifier, route)
    now = int(time.time())
    window = 60  # 1 minute

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
        # The value could be either a JWT or an API key.
        # We distinguish by length: API keys are 64 hex chars.
        token = auth[7:].strip()
        if len(token) == 64 and all(c in "0123456789abcdef" for c in token.lower()):
            return token
    return None


# ---------------------------------------------------------------------------
# API key auth dependency
# ---------------------------------------------------------------------------

async def get_current_user_or_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate via API key (x-api-key header or Bearer token that looks like an API key)
    or fall back to JWT bearer token.
    """
    api_key_val = extract_api_key(request, x_api_key)
    if api_key_val:
        # Hash the provided key and look it up
        key_hash = secrets.token_hex(32)  # dummy — we need to store raw key hash
        # Since we store a hash of the key, we can't look it up directly by hashing again.
        # For MVP, we iterate over the user's keys and compare. In production use Redis.
        result = await db.execute(select(ApiKey))
        keys = result.scalars().all()
        for api_key in keys:
            # Compare using a simple hash check
            from app.routers.apikeys import _hash_key
            if api_key.key_hash == _hash_key(api_key_val):
                if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED, detail="API key expired"
                    )
                # Update last_used_at
                api_key.last_used_at = datetime.now(timezone.utc)
                await db.commit()
                user_result = await db.execute(select(User).where(User.id == api_key.user_id))
                user = user_result.scalar_one_or_none()
                if user is None:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED, detail="API key owner not found"
                    )
                # Attach rate limit info for dependency use later
                request.state.api_key = api_key
                return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )

    # Fall back to JWT
    auth = authorization or request.headers.get("Authorization", "")
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
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
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
    if not check_rate_limit(identifier, route, limit):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
    return user


# ---------------------------------------------------------------------------
# Tier checking
# ---------------------------------------------------------------------------

def require_tier(*allowed_tiers: str):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.tier not in allowed_tiers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires tier: {', '.join(allowed_tiers)}",
            )
        return user
    return checker
