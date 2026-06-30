"""Auth router: register, login, me."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, hash_password, verify_password, get_current_user
from app.database import get_db
from app.models import User
from app.schemas import (
    StandardResponse,
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=StandardResponse)
async def register(
    body: UserRegisterRequest, db: AsyncSession = Depends(get_db)
) -> StandardResponse:
    # Check duplicate email
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

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
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = create_access_token(str(user.id))
    return StandardResponse(
        data=TokenResponse(access_token=token).model_dump(mode="json")
    )


@router.get("/me", response_model=StandardResponse)
async def me(user: User = Depends(get_current_user)) -> StandardResponse:
    return StandardResponse(
        data=UserResponse.model_validate(user).model_dump(mode="json")
    )
