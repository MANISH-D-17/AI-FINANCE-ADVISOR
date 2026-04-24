from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.budget import BudgetUpsert, BudgetResponse
from models.budget import Budget
import uuid

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("", response_model=list[BudgetResponse])
async def get_budgets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all budgets with real-time spend and burn rate analysis."""
    stmt = select(Budget).where(Budget.user_id == current_user.id)
    result = await db.execute(stmt)
    budgets = result.scalars().all()
    
    from services.budget_service import get_budget_with_intelligence
    return [await get_budget_with_intelligence(db, b, current_user.id) for b in budgets]

@router.get("/recommendations")
async def budget_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-driven budget limit suggestions based on 90-day history."""
    from services.budget_service import get_budget_recommendations
    return await get_budget_recommendations(db, current_user.id)


@router.post("", response_model=BudgetResponse)
async def upsert_budget(
    data: BudgetUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Budget).where(Budget.user_id == current_user.id, Budget.category == data.category)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.monthly_limit = data.monthly_limit
        await db.commit()
        await db.refresh(existing)
        return existing
    
    budget = Budget(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        category=data.category,
        monthly_limit=data.monthly_limit,
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/{category}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    category: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Budget).where(Budget.user_id == current_user.id, Budget.category == category)
    result = await db.execute(stmt)
    budget = result.scalar_one_or_none()
    
    if budget:
        await db.delete(budget)
        await db.commit()
