"""Audit logging utilities for ENViroSwarm."""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog

logger = logging.getLogger("enviroswarm")


def _serialize_values(values: Optional[Dict[str, Any]]) -> Optional[str]:
    if values is None:
        return None
    try:
        return json.dumps(values, default=str)
    except (TypeError, ValueError) as exc:
        logger.warning("Failed to serialize audit values: %s", exc)
        return str(values)


async def log_audit(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    user_id: Optional[Any] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Create an audit log entry."""
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=_serialize_values(old_values),
            new_values=_serialize_values(new_values),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(log)
    except Exception as exc:
        logger.error("Failed to create audit log: %s", exc, exc_info=True)
