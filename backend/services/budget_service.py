from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.budget import Budget
from models.expense import Expense
from schemas.budget import BudgetResponse
from datetime import date, datetime, timedelta
import calendar

async def get_budget_with_intelligence(db: AsyncSession, budget: Budget, user_id: str) -> BudgetResponse:
    # 1. Calculate Current Spend
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    
    stmt = select(func.sum(Expense.amount)).where(
        Expense.user_id == user_id,
        Expense.category == budget.category,
        Expense.date >= start_of_month,
        Expense.transaction_type.in_(('debit', 'expense'))
    )
    result = await db.execute(stmt)
    current_spend = float(result.scalar() or 0)
    
    # 2. Performance Metrics
    limit = float(budget.monthly_limit)
    remaining = max(0, limit - current_spend)
    
    # Burn Rate (Percentage of budget used relative to time passed)
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    day_of_month = today.day
    ideal_burn_perc = (day_of_month / days_in_month) * 100
    actual_burn_perc = (current_spend / limit * 100) if limit > 0 else 0
    
    # Projection
    daily_avg = current_spend / day_of_month if day_of_month > 0 else 0
    projected = daily_avg * days_in_month
    
    # Recommendations
    recommendation = "You're doing great! Keep it up."
    if actual_burn_perc > ideal_burn_perc + 10:
        recommendation = "Warning: Spending too fast. You have only ₹{:.0f} left for {} days.".format(
            remaining, days_in_month - day_of_month
        )
    elif actual_burn_perc > 90:
        recommendation = "Critical: Budget nearly exhausted. Stop any non-essential {} spending.".format(budget.category)
    elif projected < limit * 0.8 and current_spend > 0:
        recommendation = "Excellent! You're projected to save ₹{:.0f} in this category.".format(limit - projected)

    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        category=budget.category,
        monthly_limit=budget.monthly_limit,
        current_spend=round(current_spend, 2),
        remaining_budget=round(remaining, 2),
        burn_rate=round(actual_burn_perc, 1),
        projected_spend=round(projected, 2),
        recommendation=recommendation
    )

async def get_budget_recommendations(db: AsyncSession, user_id: str):
    """Analyze last 90 days to suggest limits for top categories."""
    three_months_ago = date.today() - timedelta(days=90)
    
    stmt = select(
        Expense.category,
        func.sum(Expense.amount).label("total")
    ).where(
        Expense.user_id == user_id,
        Expense.date >= three_months_ago,
        Expense.transaction_type.in_(('debit', 'expense'))
    ).group_by(Expense.category)
    
    result = await db.execute(stmt)
    data = result.all()
    
    recommendations = []
    for category, total in data:
        avg_monthly = float(total) / 3
        # Suggest a 10% reduction for optimization
        suggested = avg_monthly * 0.9
        recommendations.append({
            "category": category,
            "average_spend": round(avg_monthly, 2),
            "suggested_limit": round(suggested, 2),
            "reason": "Based on your 3-month average, this limit helps you save 10%."
        })
    return recommendations
