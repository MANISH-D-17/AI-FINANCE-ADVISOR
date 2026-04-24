from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.health_score_service import compute_health_score
from services.cache_service import get_cached, set_cached

router = APIRouter(prefix="/health-score", tags=["Health Score"])


@router.get("")
async def get_health_score(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"health_{current_user.id}"
    cached_data = await get_cached(cache_key)
    if cached_data:
        return cached_data

    score = await compute_health_score(db, current_user.id)
    await set_cached(cache_key, score, expire_seconds=1800)
    return score


@router.put("/income")
async def update_income(
    income: float = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user's monthly income estimate for health score calculation."""
    current_user.income = str(income)
    await db.commit()
    return {"message": "Income updated", "income": income}
