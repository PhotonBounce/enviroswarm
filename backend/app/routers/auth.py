"""Auth router: register, login, refresh, me."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
    validate_password,
    get_current_user,
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


@router.post("/register", response_model=StandardResponse)
async def register(
    body: UserRegisterRequest, db: AsyncSession = Depends(get_db)
) -> StandardResponse:
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
    body: UserLoginRequest, db: AsyncSession = Depends(get_db)
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
    return StandardResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        ).model_dump(mode="json")
    )


@router.post("/refresh", response_model=StandardResponse)
async def refresh_token(
    body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)
) -> StandardResponse:
    payload = decode_refresh_token(body.refresh_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
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
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive"
        )

    new_access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    return StandardResponse(
        data=TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
        ).model_dump(mode="json")
    )


@router.get("/me", response_model=StandardResponse)
async def me(user: User = Depends(get_current_user)) -> StandardResponse:
    return StandardResponse(
        data=UserResponse.model_validate(user).model_dump(mode="json")
    )
