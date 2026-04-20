from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.health_score_service import compute_health_score
from services.cache_service import get_cached, set_cached

router = APIRouter(prefix="/health-score", tags=["Health Score"])


@router.get("")
def get_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"health_{current_user.id}"
    cached_data = get_cached(cache_key)
    if cached_data:
        return cached_data

    score = compute_health_score(db, current_user.id)
    set_cached(cache_key, score, expire_seconds=1800)
    return score


@router.put("/income")
def update_income(
    income: float = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user's monthly income estimate for health score calculation."""
    current_user.income = str(income)
    db.commit()
    return {"message": "Income updated", "income": income}
