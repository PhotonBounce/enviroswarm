"""Alerts router."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import Alert, SensorStation, User
from app.schemas import (
    StandardResponse,
    AlertCreateRequest,
    AlertUpdateRequest,
    AlertResponse,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("", response_model=StandardResponse)
async def create_alert(
    body: AlertCreateRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("write")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Create a new alert for a station."""
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

    alert = Alert(
        user_id=user.id,
        station_id=body.station_id,
        name=body.name,
        sensor_type=body.sensor_type,
        condition=body.condition,
        threshold=body.threshold,
        notify_methods=body.notify_methods,
        cooldown_minutes=body.cooldown_minutes,
        is_active=body.is_active,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return StandardResponse(
        data=AlertResponse.model_validate(alert).model_dump(mode="json")
    )


@router.get("", response_model=StandardResponse)
async def list_alerts(
    station_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """List alerts for the authenticated user."""
    stmt = select(Alert).where(
        Alert.user_id == user.id, Alert.deleted_at.is_(None)
    )
    if station_id is not None:
        stmt = stmt.where(Alert.station_id == station_id)
    if is_active is not None:
        stmt = stmt.where(Alert.is_active == is_active)

    count_stmt = stmt.with_only_columns(func.count(Alert.id))
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    stmt = stmt.order_by(Alert.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return StandardResponse(
        data=[AlertResponse.model_validate(a).model_dump(mode="json") for a in alerts],
        meta={"page": (offset // limit) + 1, "limit": limit, "total": total},
    )


@router.get("/{alert_id}", response_model=StandardResponse)
async def get_alert(
    alert_id: UUID,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Get a single alert by ID."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.user_id == user.id,
            Alert.deleted_at.is_(None),
        )
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    return StandardResponse(
        data=AlertResponse.model_validate(alert).model_dump(mode="json")
    )


@router.patch("/{alert_id}", response_model=StandardResponse)
async def update_alert(
    alert_id: UUID,
    body: AlertUpdateRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("write")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Update an existing alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.user_id == user.id,
            Alert.deleted_at.is_(None),
        )
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )

    if body.name is not None:
        alert.name = body.name
    if body.sensor_type is not None:
        alert.sensor_type = body.sensor_type
    if body.condition is not None:
        alert.condition = body.condition
    if body.threshold is not None:
        alert.threshold = body.threshold
    if body.notify_methods is not None:
        alert.notify_methods = body.notify_methods
    if body.cooldown_minutes is not None:
        alert.cooldown_minutes = body.cooldown_minutes
    if body.is_active is not None:
        alert.is_active = body.is_active

    await db.commit()
    await db.refresh(alert)
    return StandardResponse(
        data=AlertResponse.model_validate(alert).model_dump(mode="json")
    )


@router.delete("/{alert_id}", response_model=StandardResponse)
async def delete_alert(
    alert_id: UUID,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("write")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Soft-delete an alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.user_id == user.id,
            Alert.deleted_at.is_(None),
        )
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    alert.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return StandardResponse(data={"deleted": str(alert_id)})
