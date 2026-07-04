"""Audit logging router (admin only)."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission, get_current_user_or_api_key
from app.models import User
from app.models.audit_log import AuditLog
from app.schemas import StandardResponse, AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["audit"])


def _is_admin(user: User) -> bool:
    """Check if user has admin privileges."""
    # Simple admin check based on email domain or explicit flag
    # In production, use a dedicated is_admin field or role system
    return getattr(user, "tier", "free") == "enterprise" and user.email.endswith("@enviroswarm.app")


@router.get("", response_model=StandardResponse)
async def list_audit_logs(
    action: Optional[str] = Query(None, pattern="^(create|update|delete)$"),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """View audit trail (admin only)."""
    if not _is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    if start:
        stmt = stmt.where(AuditLog.created_at >= start)
    if end:
        stmt = stmt.where(AuditLog.created_at <= end)

    count_stmt = stmt.with_only_columns(func.count(AuditLog.id))
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return StandardResponse(
        data=[AuditLogResponse.model_validate(log).model_dump(mode="json") for log in logs],
        meta={"page": (offset // limit) + 1, "limit": limit, "total": total},
    )
