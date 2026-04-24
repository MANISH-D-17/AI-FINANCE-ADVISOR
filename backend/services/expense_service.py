from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, desc, delete
from sqlalchemy.orm import selectinload
from models.expense import Expense
from schemas.expense import ExpenseCreate, ExpenseUpdate

from services.anomaly_detector import detect_anomaly
from services.cache_service import invalidate_user_cache
from typing import Optional
import uuid


async def get_expenses(
    db: AsyncSession,
    user_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
) -> list[Expense]:
    stmt = select(Expense).where(Expense.user_id == user_id).options(selectinload(Expense.account))
    if month:
        stmt = stmt.where(extract("month", Expense.date) == month)
    if year:
        stmt = stmt.where(extract("year", Expense.date) == year)
    if category:
        stmt = stmt.where(Expense.category == category)
    
    result = await db.execute(stmt.order_by(desc(Expense.date)))
    return result.scalars().all()



async def get_expense_by_id(db: AsyncSession, expense_id: str, user_id: str) -> Optional[Expense]:
    stmt = select(Expense).where(Expense.id == expense_id, Expense.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_expense(db: AsyncSession, user_id: str, data: ExpenseCreate) -> Expense:
    is_anomaly, score, explanation = await detect_anomaly(db, user_id, data.amount, data.category, str(data.date))
    
    expense = Expense(
        id=str(uuid.uuid4()),
        user_id=user_id,
        amount=data.amount,
        category=data.category,
        description=data.description,
        date=data.date,
        is_anomaly=is_anomaly,
        anomaly_score=score,
        anomaly_explanation=explanation,
        transaction_type=data.transaction_type or "debit",
        reference_number=data.reference_number,
        account_id=getattr(data, 'account_id', None)
    )
    
    try:
        db.add(expense)
        await db.commit()
    except Exception:
        await db.rollback()
        # On duplicate reference, fetch existing
        stmt = select(Expense).where(Expense.user_id == user_id, Expense.reference_number == data.reference_number)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
        
    await db.refresh(expense)
    if hasattr(invalidate_user_cache, '__await__'):
        await invalidate_user_cache(user_id)
    else:
        invalidate_user_cache(user_id)
    return expense


async def update_expense(db: AsyncSession, expense: Expense, data: ExpenseUpdate) -> Expense:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    
    # Re-run anomaly detection
    is_anomaly, score, explanation = await detect_anomaly(db, expense.user_id, expense.amount, expense.category, str(expense.date))
    expense.is_anomaly = is_anomaly
    expense.anomaly_score = score
    expense.anomaly_explanation = explanation
    
    await db.commit()
    await db.refresh(expense)
    if hasattr(invalidate_user_cache, '__await__'):
        await invalidate_user_cache(expense.user_id)
    else:
        invalidate_user_cache(expense.user_id)
    return expense


async def get_anomalies(db: AsyncSession, user_id: str) -> list[Expense]:
    stmt = select(Expense).where(
        Expense.user_id == user_id, 
        Expense.is_anomaly == True
    ).options(selectinload(Expense.account)).order_by(desc(Expense.date))
    result = await db.execute(stmt)
    return result.scalars().all()



async def delete_expense(db: AsyncSession, expense: Expense) -> None:
    user_id = expense.user_id
    await db.delete(expense)
    await db.commit()
    if hasattr(invalidate_user_cache, '__await__'):
        await invalidate_user_cache(user_id)
    else:
        invalidate_user_cache(user_id)


async def purge_user_data(db: AsyncSession, user_id: str) -> int:
    """Deletes all expenses and income records for the user."""
    stmt = delete(Expense).where(Expense.user_id == user_id)
    result = await db.execute(stmt)
    await db.commit()
    if hasattr(invalidate_user_cache, '__await__'):
        await invalidate_user_cache(user_id)
    else:
        invalidate_user_cache(user_id)
    return result.rowcount
