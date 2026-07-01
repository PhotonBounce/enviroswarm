"""JWT utilities, password hashing, and current-user dependency."""

import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

def validate_password(password: str) -> None:
    """Raise ValueError if password does not meet complexity requirements."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one digit")


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


# ---------------------------------------------------------------------------
# JWT encode / decode
# ---------------------------------------------------------------------------

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + expires_delta,
        "type": "access",
        "jti": secrets.token_urlsafe(16),  # unique token ID for revocation
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
        "type": "refresh",
        "jti": secrets.token_urlsafe(16),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token


async def _decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    if payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected {expected_type} token",
        )
    if not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub claim",
        )
    if expected_type == "refresh":
        jti = payload.get("jti")
        if jti and await is_refresh_token_revoked(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )
    return payload


async def decode_access_token(token: str) -> dict:
    return await _decode_token(token, "access")


async def decode_refresh_token(token: str) -> dict:
    return await _decode_token(token, "refresh")


# ---------------------------------------------------------------------------
# Refresh token revocation (database-backed)
# ---------------------------------------------------------------------------

from app.database import get_sessionmaker
from app.models import RevokedToken


async def revoke_refresh_token(jti: str, expires_at: datetime) -> None:
    async with get_sessionmaker()() as session:
        session.add(RevokedToken(jti=jti, revoked_at=datetime.now(timezone.utc), expires_at=expires_at))
        await session.commit()


async def is_refresh_token_revoked(jti: str) -> bool:
    async with get_sessionmaker()() as session:
        result = await session.execute(select(RevokedToken).where(RevokedToken.jti == jti))
        return result.scalar_one_or_none() is not None


async def cleanup_revoked_tokens() -> None:
    """Delete expired revoked token entries."""
    async with get_sessionmaker()() as session:
        from sqlalchemy import delete
        await session.execute(
            delete(RevokedToken).where(RevokedToken.expires_at < datetime.now(timezone.utc))
        )
        await session.commit()


# ---------------------------------------------------------------------------
# Current user dependency
# ---------------------------------------------------------------------------

async def _get_user_from_token(token: str, db: AsyncSession) -> User:
    payload = await decode_access_token(token)
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID in token"
        )

    result = await db.execute(select(User).where(User.id == user_uuid, User.is_active == True, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found, inactive, or deleted"
        )
    return user


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    request: Optional[Request] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate user from JWT in Authorization header OR httpOnly cookie."""
    # Try header first
    if token:
        try:
            return await _get_user_from_token(token, db)
        except HTTPException:
            pass
    # Fallback to cookie (for web clients using httpOnly cookies)
    if request:
        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            return await _get_user_from_token(cookie_token, db)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )
