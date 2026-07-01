"""API keys router."""

import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_tier, require_permission, rate_limit_dependency
from app.models import ApiKey, User
from app.schemas import (
    StandardResponse,
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyResponse,
)
from app.utils.crypto import hash_key, extract_prefix

router = APIRouter(prefix="/apikeys", tags=["apikeys"])


def _generate_api_key() -> str:
    return secrets.token_hex(32)


@router.post("", response_model=StandardResponse)
async def create_api_key(
    body: ApiKeyCreateRequest,
    user: User = Depends(require_tier("pro", "enterprise")),
    _perm: User = Depends(require_permission("write")),
    _rate_limited: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    # Lock user row to prevent race condition on tier limit
    await db.execute(select(User).where(User.id == user.id).with_for_update())

    # Check tier limit
    from app.constants import API_KEY_TIER_LIMITS
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.deleted_at.is_(None))
    )
    existing = result.scalars().all()
    tier_limits = API_KEY_TIER_LIMITS
    if len(existing) >= tier_limits.get(user.tier, 0):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key limit reached for your tier",
        )

    raw_key = _generate_api_key()
    key_hash = hash_key(raw_key)
    key_prefix = extract_prefix(raw_key)

    api_key = ApiKey(
        user_id=user.id,
        key_prefix=key_prefix,
        key_hash=key_hash,
        name=body.name,
        permissions=body.permissions if body.permissions is not None else {"read": True, "write": False},
        rate_limit_per_min=100 if user.tier == "pro" else 1000,
        expires_at=body.expires_at,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return StandardResponse(
        data=ApiKeyCreateResponse(
            id=api_key.id,
            name=api_key.name,
            key=raw_key,  # shown only once
            permissions=api_key.permissions,
            rate_limit_per_min=api_key.rate_limit_per_min,
            expires_at=api_key.expires_at,
            created_at=api_key.created_at,
        ).model_dump(mode="json")
    )


@router.get("", response_model=StandardResponse)
async def list_api_keys(
    user: User = Depends(require_permission("read")),
    _rate_limited: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.deleted_at.is_(None))
    )
    keys = result.scalars().all()
    return StandardResponse(
        data=[ApiKeyResponse.model_validate(k).model_dump(mode="json") for k in keys]
    )


@router.delete("/{key_id}", response_model=StandardResponse)
async def revoke_api_key(
    key_id: UUID,
    user: User = Depends(require_permission("write")),
    _rate_limited: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == user.id,
            ApiKey.deleted_at.is_(None),
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="API key not found"
        )
    key.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return StandardResponse(data={"revoked": str(key_id)})
