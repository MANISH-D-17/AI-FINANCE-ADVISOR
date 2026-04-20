from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() - timedelta(hours=24)
    cached = (
        db.query(Insight)
        .filter(Insight.user_id == current_user.id, Insight.generated_at >= cutoff)
        .all()
    )
    is_cached = bool(cached)
    insights = cached if cached else await generate_insights(db, current_user.id)
    return InsightListResponse(
        insights=[InsightResponse.model_validate(i) for i in insights],
        cached=is_cached,
    )


@router.post("/refresh", response_model=InsightListResponse)
async def refresh_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Force delete cache and regenerate
    db.query(Insight).filter(Insight.user_id == current_user.id).delete()
    db.commit()
    insights = await generate_insights(db, current_user.id)
    return InsightListResponse(
        insights=[InsightResponse.model_validate(i) for i in insights],
        cached=False,
    )
