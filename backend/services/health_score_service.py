from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract
from models.expense import Expense
from models.budget import Budget
from models.user import User
from datetime import date, timedelta
from decimal import Decimal
import statistics


async def compute_health_score(db: AsyncSession, user_id: str) -> dict:
    today = date.today()
    
    # Fetch User
    stmt_user = select(User).where(User.id == user_id)
    result_user = await db.execute(stmt_user)
    user = result_user.scalar_one_or_none()
    income = float(user.income or 0) if user else 0

    # Current month expenses — EXCLUDE transfers
    stmt_expenses = select(Expense).where(
        Expense.user_id == user_id,
        extract("month", Expense.date) == today.month,
        extract("year", Expense.date) == today.year,
        Expense.transaction_type.in_(('debit', 'expense')),
        Expense.is_transfer == False
    )
    result_expenses = await db.execute(stmt_expenses)
    curr_month_expenses = result_expenses.scalars().all()
    month_total = float(sum(e.amount for e in curr_month_expenses)) or 0

    # Savings ratio score (40 pts)
    if income > 0:
        savings_ratio = max(0, 1 - month_total / income)
        savings_score = min(40, savings_ratio * 40)
    else:
        savings_score = 20  # neutral if no income set

    # Budget adherence score (30 pts)
    stmt_budgets = select(Budget).where(Budget.user_id == user_id)
    result_budgets = await db.execute(stmt_budgets)
    budgets = result_budgets.scalars().all()
    
    if budgets:
        cat_totals = {}
        for e in curr_month_expenses:
            cat_totals[e.category] = cat_totals.get(e.category, 0) + float(e.amount)
        within = sum(1 for b in budgets if cat_totals.get(b.category, 0) <= float(b.monthly_limit))
        adherence_score = (within / len(budgets)) * 30
    else:
        adherence_score = 15  # neutral

    # Spending variance score (20 pts)
    cutoff = today - timedelta(days=90)
    stmt_90 = select(Expense).where(
        Expense.user_id == user_id,
        Expense.date >= cutoff,
        Expense.transaction_type.in_(('debit', 'expense')),
        Expense.is_transfer == False
    )
    result_90 = await db.execute(stmt_90)
    last_90_days = result_90.scalars().all()

    weekly_totals = {}
    for e in last_90_days:
        week_key = e.date.isocalendar()[1]
        weekly_totals[week_key] = weekly_totals.get(week_key, 0) + float(e.amount)

    if len(weekly_totals) >= 2:
        values = list(weekly_totals.values())
        cv = statistics.stdev(values) / statistics.mean(values) if statistics.mean(values) > 0 else 1
        variance_score = max(0, 20 * (1 - min(cv, 1)))
    else:
        variance_score = 10

    # Consistency score (10 pts)
    prev_month_start = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    stmt_prev = select(Expense).where(
        Expense.user_id == user_id,
        extract("month", Expense.date) == prev_month_start.month,
        extract("year", Expense.date) == prev_month_start.year,
        Expense.transaction_type.in_(('debit', 'expense')),
        Expense.is_transfer == False
    )
    result_prev = await db.execute(stmt_prev)
    prev_expenses = result_prev.scalars().all()
    
    prev_cat = {}
    for e in prev_expenses:
        prev_cat[e.category] = prev_cat.get(e.category, 0) + float(e.amount)
    curr_cat = {}
    for e in curr_month_expenses:
        curr_cat[e.category] = curr_cat.get(e.category, 0) + float(e.amount)

    spikes = sum(
        1 for cat in curr_cat
        if prev_cat.get(cat, 0) > 0 and (curr_cat[cat] - prev_cat[cat]) / prev_cat[cat] > 0.5
    )
    consistency_score = 10 if spikes <= 2 else max(0, 10 - (spikes - 2) * 3)

    total_score = savings_score + adherence_score + variance_score + consistency_score
    total_score = round(min(100, max(0, total_score)))

    grade = "Excellent" if total_score >= 80 else "Good" if total_score >= 60 else "Fair" if total_score >= 40 else "Needs Improvement"

    return {
        "score": total_score,
        "grade": grade,
        "components": {
            "savings_ratio": round(savings_score, 1),
            "budget_adherence": round(adherence_score, 1),
            "spending_variance": round(variance_score, 1),
            "consistency": round(consistency_score, 1),
        },
        "details": {
            "month_total": month_total,
            "income": income,
            "budgets_tracked": len(budgets),
        },
    }
