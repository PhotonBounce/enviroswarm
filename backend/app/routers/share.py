"""Public dashboard sharing router."""

import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import SensorStation, SensorReading, ShareToken, User
from app.schemas import (
    StandardResponse,
    ShareCreateRequest,
    ShareResponse,
    PublicDashboardResponse,
    DataQueryResponse,
    StationResponse,
)

router = APIRouter(prefix="/share", tags=["share"])


def _generate_share_token() -> str:
    """Generate a cryptographically secure random share token."""
    return secrets.token_urlsafe(32)


@router.post("/dashboard", response_model=StandardResponse)
async def create_share_link(
    body: ShareCreateRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Create a public read-only link for a dashboard or station."""
    if body.station_id is not None:
        result = await db.execute(
            select(SensorStation).where(
                SensorStation.id == body.station_id,
                SensorStation.user_id == user.id,
                SensorStation.deleted_at.is_(None),
            )
        )
        station = result.scalar_one_or_none()
        if station is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Station not found"
            )

    token = _generate_share_token()
    share = ShareToken(
        user_id=user.id,
        station_id=body.station_id,
        token=token,
        expires_at=body.expires_at,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)
    return StandardResponse(
        data=ShareResponse.model_validate(share).model_dump(mode="json")
    )


@router.get("/{token}", response_model=StandardResponse)
async def access_public_dashboard(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Access a public dashboard via share token (no auth required)."""
    result = await db.execute(
        select(ShareToken).where(
            ShareToken.token == token,
            ShareToken.deleted_at.is_(None),
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired share link"
        )
    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="Share link has expired"
        )

    station_data = None
    readings_data = []

    if share.station_id is not None:
        station_result = await db.execute(
            select(SensorStation).where(
                SensorStation.id == share.station_id,
                SensorStation.deleted_at.is_(None),
            )
        )
        station = station_result.scalar_one_or_none()
        if station is not None:
            station_data = StationResponse.model_validate(station).model_dump(mode="json")
            # Return last 100 readings
            stmt = (
                select(SensorReading)
                .where(SensorReading.station_id == station.id)
                .where(SensorReading.deleted_at.is_(None))
                .order_by(SensorReading.timestamp.desc())
                .limit(100)
            )
            readings_result = await db.execute(stmt)
            readings = readings_result.scalars().all()
            readings_data = [
                DataQueryResponse.model_validate(r).model_dump(mode="json") for r in readings
            ]

    return StandardResponse(
        data=PublicDashboardResponse(
            station=station_data,
            readings=readings_data,
        ).model_dump(mode="json")
    )


@router.delete("/{token}", response_model=StandardResponse)
async def revoke_share_link(
    token: str,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("write")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Revoke a public share link."""
    result = await db.execute(
        select(ShareToken).where(
            ShareToken.token == token,
            ShareToken.user_id == user.id,
            ShareToken.deleted_at.is_(None),
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found"
        )
    share.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return StandardResponse(data={"revoked": token})
