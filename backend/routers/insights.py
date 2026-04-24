from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.insight_service import generate_insights
from schemas.insight import InsightResponse, InsightListResponse
from datetime import datetime, timedelta
from models.insight import Insight

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/generate", response_model=InsightListResponse)
async def get_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() - timedelta(hours=24)
    stmt = select(Insight).where(Insight.user_id == current_user.id, Insight.generated_at >= cutoff)
    result = await db.execute(stmt)
    cached = result.scalars().all()
    
    is_cached = bool(cached)
    insights = cached if cached else await generate_insights(db, current_user.id)
    return InsightListResponse(
        insights=[InsightResponse.model_validate(i) for i in insights],
        cached=is_cached,
    )


@router.post("/refresh", response_model=InsightListResponse)
async def refresh_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Force delete cache and regenerate
    await db.execute(delete(Insight).where(Insight.user_id == current_user.id))
    await db.commit()
    insights = await generate_insights(db, current_user.id)
    return InsightListResponse(
        insights=[InsightResponse.model_validate(i) for i in insights],
        cached=False,
    )
