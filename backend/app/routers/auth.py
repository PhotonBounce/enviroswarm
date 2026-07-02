"""Auth router: register, login, refresh, me."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

import bcrypt

from app.auth import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    verify_password,
    get_current_user,
    revoke_refresh_token,
)
from app.database import get_db
from app.models import User
from app.schemas import (
    StandardResponse,
    UserRegisterRequest,
    UserLoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
)
from app.config import get_settings
from app.dependencies import check_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])

settings = get_settings()

_DUMMY_HASH = bcrypt.hashpw(b"dummy", bcrypt.gensalt(rounds=4)).decode("utf-8")


# Cookie settings for web clients
COOKIE_SETTINGS = {
    "key": "access_token",
    "httponly": True,
    "secure": settings.is_production,
    "samesite": "lax",
    "max_age": settings.access_token_expire_minutes * 60,
}

REFRESH_COOKIE_SETTINGS = {
    "key": "refresh_token",
    "httponly": True,
    "secure": settings.is_production,
    "samesite": "lax",
    "max_age": settings.refresh_token_expire_days * 86400,
}


@router.post("/register", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    body: UserRegisterRequest, db: AsyncSession = Depends(get_db)
) -> StandardResponse:
    # Normalize email for case-insensitive comparison.
    # NOTE: A migration should add a functional unique index on lower(email) to enforce case-insensitive uniqueness.
    body.email = body.email.lower().strip()

    # Rate limit registration by IP to prevent mass account creation
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        from ipaddress import ip_address
        try:
            addr = ip_address(client_ip)
            if addr.is_private or addr.is_loopback:
                client_ip = forwarded.split(",")[0].strip()
        except ValueError:
            pass

    if not await check_rate_limit(f"register:global:{client_ip}", "/auth/register", 3):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts",
        )

    # Rate limit registration by email
    if not await check_rate_limit(f"register:{body.email}", "/auth/register", 3):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts",
        )

    # Check duplicate email (including soft-deleted)
    result = await db.execute(
        select(User).where(User.email == body.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        tier="free",
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError as exc:
        await db.rollback()
        if hasattr(exc, "orig") and exc.orig and "uq_users_email" in str(exc.orig):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database integrity error"
        )

    return StandardResponse(
        data=UserResponse.model_validate(user).model_dump(mode="json")
    )


@router.post("/login", response_model=StandardResponse)
async def login(
    request: Request,
    body: UserLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    # Normalize email for case-insensitive lookup
    body.email = body.email.lower().strip()

    # IP-based rate limiting to prevent credential stuffing
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        from ipaddress import ip_address
        try:
            addr = ip_address(client_ip)
            if addr.is_private or addr.is_loopback:
                client_ip = forwarded.split(",")[0].strip()
        except ValueError:
            pass

    if not await check_rate_limit(f"login:ip:{client_ip}", "/auth/login", 20):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts from this IP.",
        )

    # Basic brute-force protection: limit login attempts per email
    login_key = f"login:{body.email}"
    if not await check_rate_limit(login_key, "/auth/login", 5):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )

    result = await db.execute(
        select(User).where(
            User.email == body.email,
            User.is_active == True,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        # Dummy hash check to equalize timing and prevent email enumeration
        verify_password(body.password, _DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    # Set httpOnly cookies for web clients
    response.set_cookie(value=access_token, **COOKIE_SETTINGS)
    response.set_cookie(value=refresh_token, **REFRESH_COOKIE_SETTINGS)

    return StandardResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        ).model_dump(mode="json")
    )


@router.post("/refresh", response_model=StandardResponse)
async def refresh_token(
    body: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    refresh_token_str = body.refresh_token or request.cookies.get("refresh_token")
    if not refresh_token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    payload = await decode_refresh_token(refresh_token_str)

    # Rate limit refresh by user_id
    user_id = payload.get("sub")
    if not await check_rate_limit(f"refresh:{user_id}", "/auth/refresh", 10):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many refresh attempts",
        )

    try:
        user_uuid = UUID(user_id)
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
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive"
        )

    # Revoke old refresh token BEFORE creating new tokens
    old_jti = payload.get("jti")
    old_exp = payload.get("exp")
    if old_jti and old_exp:
        from datetime import datetime, timezone
        expires_at = datetime.fromtimestamp(old_exp, tz=timezone.utc)
        if not await revoke_refresh_token(old_jti, expires_at):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

    new_access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))

    # Update cookies
    response.set_cookie(value=new_access, **COOKIE_SETTINGS)
    response.set_cookie(value=new_refresh, **REFRESH_COOKIE_SETTINGS)

    return StandardResponse(
        data=TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
        ).model_dump(mode="json")
    )


@router.post("/logout", response_model=StandardResponse)
async def logout(
    response: Response,
    request: Request,
    body: Optional[RefreshTokenRequest] = None,
) -> StandardResponse:
    """Clear auth cookies and log out the user."""
    token_found = False

    # Always clear cookies if they exist in the request
    had_cookies = bool(request.cookies.get("access_token") or request.cookies.get("refresh_token"))
    if had_cookies:
        response.delete_cookie(
            COOKIE_SETTINGS["key"],
            path="/",
            secure=COOKIE_SETTINGS["secure"],
            httponly=COOKIE_SETTINGS["httponly"],
            samesite=COOKIE_SETTINGS["samesite"],
        )
        response.delete_cookie(
            REFRESH_COOKIE_SETTINGS["key"],
            path="/",
            secure=REFRESH_COOKIE_SETTINGS["secure"],
            httponly=REFRESH_COOKIE_SETTINGS["httponly"],
            samesite=REFRESH_COOKIE_SETTINGS["samesite"],
        )

    # Try access token from header or cookie
    auth_header = request.headers.get("Authorization", "")
    access_token = auth_header[7:].strip() if auth_header.lower().startswith("bearer ") else None
    if not access_token:
        access_token = request.cookies.get("access_token")
    if access_token:
        token_found = True

    # Fallback to refresh token from cookie or body
    refresh_token = request.cookies.get("refresh_token") or (body.refresh_token if body else None)
    if refresh_token:
        token_found = True
        try:
            payload = await decode_refresh_token(refresh_token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                from datetime import datetime, timezone
                expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
                await revoke_refresh_token(jti, expires_at)
        except HTTPException:
            pass

    if token_found or had_cookies:
        return StandardResponse(data={"logged_out": True})

    return StandardResponse(data={"logged_out": False}, error="No token found")


@router.get("/me", response_model=StandardResponse)
async def me(user: User = Depends(rate_limit_dependency)) -> StandardResponse:
    return StandardResponse(
        data=UserResponse.model_validate(user).model_dump(mode="json")
    )
