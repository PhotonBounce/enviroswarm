"""Export formats router."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import User
from app.schemas import StandardResponse
from app.services.export import export_geojson, export_netcdf, export_geotiff, export_csv

router = APIRouter(prefix="/export", tags=["export"])


class ExportRequest(BaseModel):
    station_id: Optional[str] = None
    sensor_type: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    format: str = Field(..., pattern="^(geojson|netcdf|geotiff|csv)$")
    width: Optional[int] = Field(default=256, ge=16, le=2048)
    height: Optional[int] = Field(default=256, ge=16, le=2048)


@router.post("/{format}", response_model=StandardResponse)
async def export_data(
    format: str,
    body: Optional[ExportRequest] = None,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Export sensor data in scientific formats (GeoJSON, NetCDF JSON, GeoTIFF JSON, CSV)."""
    if body is None:
        body = ExportRequest(format=format)

    start = body.start.replace(tzinfo=timezone.utc) if body.start and body.start.tzinfo is None else body.start
    end = body.end.replace(tzinfo=timezone.utc) if body.end and body.end.tzinfo is None else body.end

    if format == "geojson":
        data = await export_geojson(
            db, str(user.id), body.station_id, body.sensor_type, start, end
        )
    elif format == "netcdf":
        data = await export_netcdf(
            db, str(user.id), body.station_id, body.sensor_type, start, end
        )
    elif format == "geotiff":
        if not body.sensor_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="sensor_type is required for GeoTIFF export",
            )
        data = await export_geotiff(
            db, str(user.id), body.sensor_type, width=body.width or 256, height=body.height or 256
        )
    elif format == "csv":
        csv_data = await export_csv(
            db, str(user.id), body.station_id, body.sensor_type, start, end
        )
        data = {"format": "csv", "content": csv_data}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format: {format}",
        )

    return StandardResponse(data=data)
