from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.dashboard_service import get_dashboard_summary
from services.cache_service import get_cached, set_cached
from services.pdf_service import generate_monthly_report_pdf

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/export")
async def export_monthly_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export the monthly financial report as a PDF."""
    pdf_buffer = await generate_monthly_report_pdf(db, current_user.id)
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=financial_report_{current_user.id}.pdf"}
    )


@router.get("/summary")
async def dashboard_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"summary_{current_user.id}_{month}_{year}"
    cached_data = await get_cached(cache_key)
    if cached_data:
        return cached_data
    
    summary = await get_dashboard_summary(db, current_user.id, month, year)
    await set_cached(cache_key, summary, expire_seconds=300)
    return summary
