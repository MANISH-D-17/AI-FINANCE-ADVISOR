from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.budget import BudgetUpsert, BudgetResponse
from models.budget import Budget
import uuid

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("", response_model=list[BudgetResponse])
def get_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Budget).filter(Budget.user_id == current_user.id).all()


@router.post("", response_model=BudgetResponse)
def upsert_budget(
    data: BudgetUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id, Budget.category == data.category)
        .first()
    )
    if existing:
        existing.monthly_limit = data.monthly_limit
        db.commit()
        db.refresh(existing)
        return existing
    budget = Budget(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        category=data.category,
        monthly_limit=data.monthly_limit,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{category}", status_code=204)
def delete_budget(
    category: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id, Budget.category == category)
        .first()
    )
    if budget:
        db.delete(budget)
        db.commit()
