"""Billing / subscription router."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Subscription, User
from app.schemas import StandardResponse, PricingTier, SubscriptionRequest, SubscriptionResponse

router = APIRouter(prefix="", tags=["billing"])


PRICING_TIERS = [
    PricingTier(
        name="free",
        price_monthly=0.0,
        stations=1,
        readings_per_day=100,
        retention_days=7,
        api_keys=0,
        description="Free tier for individual contributors",
    ),
    PricingTier(
        name="pro",
        price_monthly=29.0,
        stations=10,
        readings_per_day=10000,
        retention_days=90,
        api_keys=1,
        description="Pro tier for small teams and researchers",
    ),
    PricingTier(
        name="enterprise",
        price_monthly=299.0,
        stations=9999,
        readings_per_day=99999999,
        retention_days=730,
        api_keys=10,
        description="Enterprise tier with SLA support",
    ),
]


@router.get("/pricing", response_model=StandardResponse)
async def get_pricing() -> StandardResponse:
    return StandardResponse(data=[t.model_dump() for t in PRICING_TIERS])


@router.post("/subscribe", response_model=StandardResponse)
async def subscribe(
    body: SubscriptionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    tier_names = {t.name for t in PRICING_TIERS}
    if body.tier not in tier_names:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tier"
        )

    # Check for existing active subscription
    now = datetime.now(timezone.utc)
    existing_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.deleted_at.is_(None),
            Subscription.end_date >= now,
        )
    )
    existing_sub = existing_result.scalar_one_or_none()
    if existing_sub:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already has an active subscription",
        )

    start_date = now
    end_date = start_date + timedelta(days=30 * body.duration_months)

    sub = Subscription(
        user_id=user.id,
        tier=body.tier,
        start_date=start_date,
        end_date=end_date,
        payment_status="pending",
    )
    db.add(sub)

    # Update user tier
    user.tier = body.tier
    try:
        await db.commit()
        await db.refresh(sub)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription",
        )

    return StandardResponse(
        data=SubscriptionResponse.model_validate(sub).model_dump(mode="json")
    )
