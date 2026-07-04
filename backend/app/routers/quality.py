"""Data quality score router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User
from app.schemas import StandardResponse
from app.services.quality import calculate_quality_score

router = APIRouter(prefix="/stations", tags=["quality"])


@router.get("/{station_id}/quality", response_model=StandardResponse)
async def get_station_quality(
    station_id: UUID,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Calculate comprehensive data quality score for a station."""
    result = await calculate_quality_score(db, str(station_id), window_days=7)
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"],
        )
    return StandardResponse(data=result)
