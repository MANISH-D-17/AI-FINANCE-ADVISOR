from sqlalchemy.orm import Session
from models.budget import Budget
from schemas.budget import BudgetUpsert
import uuid

def get_budgets(db: Session, user_id: str):
    return db.query(Budget).filter(Budget.user_id == user_id).all()

def create_or_update_budget(db: Session, user_id: str, data: BudgetUpsert):
    existing = (
        db.query(Budget)
        .filter(Budget.user_id == user_id, Budget.category == data.category)
        .first()
    )
    if existing:
        existing.monthly_limit = data.monthly_limit
        db.commit()
        db.refresh(existing)
        return existing
    
    budget = Budget(
        id=str(uuid.uuid4()),
        user_id=user_id,
        category=data.category,
        monthly_limit=data.monthly_limit,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget

def delete_budget(db: Session, user_id: str, category: str):
    budget = (
        db.query(Budget)
        .filter(Budget.user_id == user_id, Budget.category == category)
        .first()
    )
    if budget:
        db.delete(budget)
        db.commit()
        return True
    return False
