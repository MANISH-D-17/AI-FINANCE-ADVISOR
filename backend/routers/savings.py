from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models.user import User
from models.savings import SavingsGoal
from schemas.savings import SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalResponse
from typing import List

router = APIRouter(prefix="/savings", tags=["Savings Goals"])

@router.get("", response_model=List[SavingsGoalResponse])
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all savings goals for the current user."""
    return db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()

@router.post("", response_model=SavingsGoalResponse)
def create_goal(
    data: SavingsGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new savings goal."""
    goal = SavingsGoal(
        user_id=current_user.id,
        **data.model_dump()
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

@router.put("/{goal_id}", response_model=SavingsGoalResponse)
def update_goal(
    goal_id: str,
    data: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing goal or add to current contribution."""
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    
    db.commit()
    db.refresh(goal)
    return goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a savings goal."""
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(goal)
    db.commit()
    return None
