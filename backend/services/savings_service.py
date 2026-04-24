from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from models.savings import SavingsGoal
from models.expense import Expense
from models.user import User
from schemas.savings import SavingsGoalResponse
from datetime import date, timedelta, datetime
from decimal import Decimal
import math

async def get_goal_with_intelligence(db: AsyncSession, goal: SavingsGoal, user_id: str) -> SavingsGoalResponse:
    # 1. Calculate Progress
    target = float(goal.target_amount)
    current = float(goal.current_amount)
    progress = (current / target * 100) if target > 0 else 0
    
    # 2. Calculate average monthly surplus (Income - Expenses)
    # Get user income (stored as string in User model, needs cast)
    stmt_user = select(User.income).where(User.id == user_id)
    res_user = await db.execute(stmt_user)
    income_str = res_user.scalar() or "0"
    monthly_income = float(income_str)
    
    # Get average expenses for last 3 months
    three_months_ago = date.today() - timedelta(days=90)
    stmt_exp = select(func.sum(Expense.amount)).where(
        Expense.user_id == user_id,
        Expense.date >= three_months_ago,
        Expense.transaction_type.in_(('debit', 'expense'))
    )
    res_exp = await db.execute(stmt_exp)
    total_exp = float(res_exp.scalar() or 0)
    avg_monthly_exp = total_exp / 3 if total_exp > 0 else 0
    
    monthly_surplus = max(0, monthly_income - avg_monthly_exp)
    
    # 3. Analytics
    remaining = target - current
    est_completion = None
    on_track = True
    status_msg = "Steady progress! Keep it up."
    
    if remaining <= 0:
        status_msg = "Achievement Unlocked: Goal Completed! 🏆"
        progress = 100.0
    elif monthly_surplus > 0:
        months_needed = remaining / monthly_surplus
        est_completion = date.today() + timedelta(days=int(months_needed * 30))
        
        if goal.deadline and est_completion > goal.deadline:
            on_track = False
            status_msg = "Heads up: You might miss your deadline. Consider saving ₹{:.0f} more per month.".format(
                (remaining / ((goal.deadline - date.today()).days / 30)) - monthly_surplus
            )
    else:
        status_msg = "Tip: Set a monthly income or reduce expenses to reach this goal faster."

    # Milestone Badges
    if progress >= 75:
        status_msg = "Gold Milestone: Almost there! (75% reached) ✨"
    elif progress >= 50:
        status_msg = "Silver Milestone: Halfway through! (50% reached) 🥈"
    elif progress >= 25:
        status_msg = "Bronze Milestone: Great start! (25% reached) 🥉"

    return SavingsGoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        category=goal.category,
        deadline=goal.deadline,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        progress_percentage=round(progress, 1),
        estimated_completion_date=est_completion,
        is_on_track=on_track,
        status_message=status_msg
    )
