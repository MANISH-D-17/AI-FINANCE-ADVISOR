from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from dependencies import get_current_user
from models.user import User
from models.savings import SavingsGoal
from schemas.savings import SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalResponse
from typing import List

router = APIRouter(prefix="/savings", tags=["Savings Goals"])


@router.get("", response_model=List[SavingsGoalResponse])
async def get_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all savings goals for the current user with intelligence metrics."""
    stmt = select(SavingsGoal).where(SavingsGoal.user_id == current_user.id)
    result = await db.execute(stmt)
    goals = result.scalars().all()
    
    from services.savings_service import get_goal_with_intelligence
    return [await get_goal_with_intelligence(db, g, current_user.id) for g in goals]


@router.post("", response_model=SavingsGoalResponse)
async def create_goal(
    data: SavingsGoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new savings goal."""
    goal = SavingsGoal(
        user_id=current_user.id,
        **data.model_dump()
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=SavingsGoalResponse)
async def update_goal(
    goal_id: str,
    data: SavingsGoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing goal or add to current contribution."""
    stmt = select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a savings goal."""
    stmt = select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.delete(goal)
    await db.commit()
    return None
