from sqlalchemy.orm import Session
from sqlalchemy import extract
from models.expense import Expense
from schemas.expense import ExpenseCreate, ExpenseUpdate
from services.anomaly_detector import detect_anomaly
from services.cache_service import invalidate_user_cache
from typing import Optional
from datetime import date
import uuid


def get_expenses(
    db: Session,
    user_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
) -> list[Expense]:
    query = db.query(Expense).filter(Expense.user_id == user_id)
    if month:
        query = query.filter(extract("month", Expense.date) == month)
    if year:
        query = query.filter(extract("year", Expense.date) == year)
    if category:
        query = query.filter(Expense.category == category)
    return query.order_by(Expense.date.desc()).all()


def get_expense_by_id(db: Session, expense_id: str, user_id: str) -> Optional[Expense]:
    return db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()


def create_expense(db: Session, user_id: str, data: ExpenseCreate) -> Expense:
    is_anomaly, score = detect_anomaly(db, user_id, data.amount, data.category, data.date)
    
    expense = Expense(
        id=str(uuid.uuid4()),
        user_id=user_id,
        amount=data.amount,
        category=data.category,
        description=data.description,
        date=data.date,
        is_anomaly=is_anomaly,
        anomaly_score=score,
        transaction_type=data.transaction_type,
        reference_number=data.reference_number
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    invalidate_user_cache(user_id)
    return expense


def update_expense(db: Session, expense: Expense, data: ExpenseUpdate) -> Expense:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    
    # Re-run anomaly detection if amount, category or date changed
    is_anomaly, score = detect_anomaly(db, expense.user_id, expense.amount, expense.category, expense.date)
    expense.is_anomaly = is_anomaly
    expense.anomaly_score = score
    
    db.commit()
    db.refresh(expense)
    invalidate_user_cache(expense.user_id)
    return expense


def get_anomalies(db: Session, user_id: str) -> list[Expense]:
    return db.query(Expense).filter(
        Expense.user_id == user_id, 
        Expense.is_anomaly == True
    ).order_by(Expense.date.desc()).all()


def delete_expense(db: Session, expense: Expense) -> None:
    user_id = expense.user_id
    db.delete(expense)
    db.commit()
    invalidate_user_cache(user_id)


def purge_user_data(db: Session, user_id: str) -> int:
    """Deletes all expenses and income records for the user."""
    count = db.query(Expense).filter(Expense.user_id == user_id).delete()
    db.commit()
    invalidate_user_cache(user_id)
    return count
