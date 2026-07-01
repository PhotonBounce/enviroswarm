"""Auth router: register, login, refresh, me."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
    validate_password,
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
from app.dependencies import check_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


# Cookie settings for web clients
COOKIE_SETTINGS = {
    "key": "access_token",
    "httponly": True,
    "secure": False,  # Set to True in production (HTTPS only)
    "samesite": "lax",
    "max_age": 3600,  # 1 hour
}

REFRESH_COOKIE_SETTINGS = {
    "key": "refresh_token",
    "httponly": True,
    "secure": False,
    "samesite": "lax",
    "max_age": 604800,  # 7 days
}


@router.post("/register", response_model=StandardResponse)
async def register(
    body: UserRegisterRequest, db: AsyncSession = Depends(get_db)
) -> StandardResponse:
    # Rate limit registration by email
    if not await check_rate_limit(f"register:{body.email}", "/auth/register", 3):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts",
        )

    # Check duplicate email
    result = await db.execute(
        select(User).where(User.email == body.email, User.deleted_at.is_(None))
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    try:
        validate_password(body.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        tier="free",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return StandardResponse(
        data=UserResponse.model_validate(user).model_dump(mode="json")
    )


@router.post("/login", response_model=StandardResponse)
async def login(
    body: UserLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
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
    if not user or not verify_password(body.password, user.hashed_password):
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
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    payload = decode_refresh_token(body.refresh_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    # Rate limit refresh by user_id
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

    new_access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))

    # Revoke old refresh token
    old_jti = payload.get("jti")
    if old_jti:
        revoke_refresh_token(old_jti)

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
    user: User = Depends(get_current_user),
) -> StandardResponse:
    """Clear auth cookies and log out the user."""
    response.delete_cookie(COOKIE_SETTINGS["key"])
    response.delete_cookie(REFRESH_COOKIE_SETTINGS["key"])
    return StandardResponse(data={"logged_out": True})


@router.get("/me", response_model=StandardResponse)
async def me(user: User = Depends(get_current_user)) -> StandardResponse:
    return StandardResponse(
        data=UserResponse.model_validate(user).model_dump(mode="json")
    )
