"""Report generation router."""

import os
import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import rate_limit_dependency, require_permission
from app.models import Report, SensorStation, User
from app.reports.generator import ReportGenerator
from app.schemas import StandardResponse, ReportGenerateRequest, ReportResponse

router = APIRouter(prefix="/reports", tags=["reports"])

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "generated_reports")


@router.post("/generate", response_model=StandardResponse)
async def generate_report(
    body: ReportGenerateRequest,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """Queue/generate a new report for the authenticated user."""
    # Validate station ownership if station_id provided
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

    report = Report(
        user_id=user.id,
        station_id=body.station_id,
        name=body.name,
        report_format=body.report_format,
        status="processing",
        date_range_start=body.date_range_start,
        date_range_end=body.date_range_end,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # Generate file synchronously for simplicity
    try:
        generator = ReportGenerator(db, user.id)
        file_path = await generator.generate(
            report_format=body.report_format,
            station_id=body.station_id,
            start=body.date_range_start,
            end=body.date_range_end,
            output_dir=REPORTS_DIR,
        )
        report.file_path = file_path
        report.status = "completed"
    except Exception as exc:
        report.status = "failed"
        # Do not leak internal errors
        import logging
        logging.getLogger("enviroswarm").error("Report generation failed: %s", exc, exc_info=True)

    await db.commit()
    await db.refresh(report)
    return StandardResponse(
        data=ReportResponse.model_validate(report).model_dump(mode="json")
    )


@router.get("", response_model=StandardResponse)
async def list_reports(
    status_filter: Optional[str] = Query(None, pattern="^(pending|processing|completed|failed)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse:
    """List reports for the authenticated user."""
    stmt = select(Report).where(
        Report.user_id == user.id, Report.deleted_at.is_(None)
    )
    if status_filter:
        stmt = stmt.where(Report.status == status_filter)

    count_stmt = stmt.with_only_columns(func.count(Report.id))
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    stmt = stmt.order_by(Report.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return StandardResponse(
        data=[ReportResponse.model_validate(r).model_dump(mode="json") for r in reports],
        meta={"page": (offset // limit) + 1, "limit": limit, "total": total},
    )


@router.get("/{report_id}/download")
async def download_report(
    report_id: UUID,
    user: User = Depends(rate_limit_dependency),
    _authorized: User = Depends(require_permission("read")),
    db: AsyncSession = Depends(get_db),
):
    """Download a generated report file."""
    result = await db.execute(
        select(Report).where(
            Report.id == report_id,
            Report.user_id == user.id,
            Report.deleted_at.is_(None),
        )
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )
    if report.status != "completed" or not report.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report is not ready for download",
        )
    if not os.path.exists(report.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found"
        )

    media_type_map = {
        "pdf": "application/pdf",
        "csv": "text/csv",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    filename = os.path.basename(report.file_path)
    return FileResponse(
        report.file_path,
        media_type=media_type_map.get(report.report_format, "application/octet-stream"),
        filename=filename,
    )
