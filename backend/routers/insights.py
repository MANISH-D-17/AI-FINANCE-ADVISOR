from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.insight_service import generate_insights, _compute_stats
from schemas.insight import InsightResponse, InsightListResponse, PeriodComparison
from datetime import datetime, timedelta
from models.insight import Insight

router = APIRouter(prefix="/insights", tags=["Insights"])


async def _build_response(db, user_id, insights, cached) -> InsightListResponse:
    """Build InsightListResponse including comparison period stats."""
    try:
        stats = await _compute_stats(db, user_id)
        comparison = PeriodComparison(
            current_total=stats["curr_total"],
            previous_total=stats["prev_total"],
            change_pct=stats.get("change_pct", 0.0),
            current_cats=stats["curr_cats"],
            previous_cats=stats["prev_cats"],
            top_category=stats["top_category"],
            top_category_amount=stats["top_category_amount"],
            weekend_spend=stats["weekend_spend"],
            weekday_spend=stats["weekday_spend"],
            expense_count=stats["expense_count"],
        )
    except Exception:
        comparison = None

    return InsightListResponse(
        insights=[InsightResponse.model_validate(i) for i in insights],
        cached=cached,
        comparison=comparison,
    )


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
    return await _build_response(db, current_user.id, insights, is_cached)


@router.post("/refresh", response_model=InsightListResponse)
async def refresh_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Force delete cache and regenerate
    await db.execute(delete(Insight).where(Insight.user_id == current_user.id))
    await db.commit()
    insights = await generate_insights(db, current_user.id)
    return await _build_response(db, current_user.id, insights, False)
