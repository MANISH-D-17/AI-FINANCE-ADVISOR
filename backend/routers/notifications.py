from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.user import User
from models.expense import Expense
from models.budget import Budget
from sqlalchemy import select, func
from typing import List, Dict, Any
from datetime import date

from dependencies import get_current_user
router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/latest")
async def get_latest_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Retrieves unverified anomalies and budget breaches as high-priority notifications."""
    user_id = current_user.id
    notifications = []

    # 1. Fetch unverified anomalies
    anom_stmt = select(Expense).where(
        Expense.user_id == user_id,
        Expense.anomaly_score < -0.1,
        Expense.is_verified == False
    ).order_by(Expense.date.desc()).limit(3)
    
    anom_result = await db.execute(anom_stmt)
    anomalies = anom_result.scalars().all()
    
    for anom in anomalies:
        notifications.append({
            "id": f"anom_{anom.id}",
            "type": "security",
            "title": "Suspicious Activity",
            "message": f"₹{anom.amount} at {anom.merchant}: {anom.anomaly_explanation}",
            "timestamp": str(anom.date),
            "priority": "high"
        })

    # 2. Fetch critical budget breaches
    budget_stmt = select(Budget).where(Budget.user_id == user_id)
    budget_result = await db.execute(budget_stmt)
    budgets = budget_result.scalars().all()

    for budget in budgets:
        # Calculate spend for this month
        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        
        spend_stmt = select(func.sum(Expense.amount)).where(
            Expense.user_id == user_id,
            Expense.category == budget.category,
            Expense.date >= start_of_month
        )
        spend_result = await db.execute(spend_stmt)
        current_spend = spend_result.scalar() or 0
        
        if current_spend > budget.amount:
            notifications.append({
                "id": f"budget_{budget.id}",
                "type": "budget",
                "title": "Budget Breach",
                "message": f"You've exceeded your ₹{budget.amount} budget for {budget.category}!",
                "timestamp": str(today),
                "priority": "medium"
            })

    return sorted(notifications, key=lambda x: x["priority"] == "high", reverse=True)
