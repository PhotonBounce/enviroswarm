"""Billing / subscription router."""

from datetime import datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_permission, rate_limit_dependency
from app.models import Subscription, User
from app.schemas import StandardResponse, PricingTier, SubscriptionRequest, SubscriptionResponse

router = APIRouter(prefix="", tags=["billing"])


from app.constants import RETENTION_DAYS, STATION_TIER_LIMITS, READING_TIER_LIMITS, API_KEY_TIER_LIMITS

PRICING_TIERS = [
    PricingTier(
        name="free",
        price_monthly=0.0,
        stations=STATION_TIER_LIMITS["free"],
        readings_per_day=READING_TIER_LIMITS["free"],
        retention_days=RETENTION_DAYS["free"],
        api_keys=API_KEY_TIER_LIMITS["free"],
        description="Free tier for individual contributors",
    ),
    PricingTier(
        name="pro",
        price_monthly=29.0,
        stations=STATION_TIER_LIMITS["pro"],
        readings_per_day=READING_TIER_LIMITS["pro"],
        retention_days=RETENTION_DAYS["pro"],
        api_keys=API_KEY_TIER_LIMITS["pro"],
        description="Pro tier for small teams and researchers",
    ),
    PricingTier(
        name="enterprise",
        price_monthly=299.0,
        stations=STATION_TIER_LIMITS["enterprise"],
        readings_per_day=READING_TIER_LIMITS["enterprise"],
        retention_days=RETENTION_DAYS["enterprise"],
        api_keys=API_KEY_TIER_LIMITS["enterprise"],
        description="Enterprise tier with SLA support",
    ),
]


@router.get("/pricing", response_model=StandardResponse)
async def get_pricing() -> StandardResponse:
    return StandardResponse(data=[t.model_dump() for t in PRICING_TIERS])


@router.post("/subscribe", response_model=StandardResponse)
async def subscribe(
    body: SubscriptionRequest,
    user: User = Depends(require_permission("write")),
    _rate_limited: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    tier_names = {t.name for t in PRICING_TIERS}
    if body.tier not in tier_names:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tier"
        )

    # Lock user row to prevent race condition on duplicate active subscriptions.
    # TODO: Add DB migration: CREATE UNIQUE INDEX uq_active_subscription ON subscriptions(user_id) WHERE deleted_at IS NULL AND end_date >= NOW()
    await db.execute(select(User).where(User.id == user.id).with_for_update())

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
    end_date = start_date + relativedelta(months=body.duration_months)

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
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription",
        ) from exc

    return StandardResponse(
        data=SubscriptionResponse.model_validate(sub).model_dump(mode="json")
    )
