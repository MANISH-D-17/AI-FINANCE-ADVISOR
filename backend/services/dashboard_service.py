from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from models.expense import Expense
from models.budget import Budget
from schemas.dashboard import DashboardSummary, CategoryBreakdown, WeeklySpend, BudgetProgress
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
import calendar


def get_dashboard_summary(db: Session, user_id: str, month: Optional[int] = None, year: Optional[int] = None) -> DashboardSummary:
    today = date.today()
    
    # Smart Default: If no month/year provided, use the month of the most recent transaction
    if month is None or year is None:
        latest = db.query(Expense).filter(Expense.user_id == user_id).order_by(Expense.date.desc()).first()
        if latest:
            month = month or latest.date.month
            year = year or latest.date.year
        else:
            month = month or today.month
            year = year or today.year

    # Monthly transactions (All)
    monthly_txs = (
        db.query(Expense)
        .filter(
            Expense.user_id == user_id,
            extract("month", Expense.date) == month,
            extract("year", Expense.date) == year,
        )
        .all()
    )

    # Separate Income and Expenses
    incomes = [tx for tx in monthly_txs if tx.transaction_type == 'income']
    expenses = [tx for tx in monthly_txs if tx.transaction_type == 'expense']

    month_income = sum(tx.amount for tx in incomes) or Decimal("0")
    month_expense = sum(tx.amount for tx in expenses) or Decimal("0")
    month_savings = month_income - month_expense
    savings_rate = float((month_savings / month_income) * 100) if month_income > 0 else 0

    # Category breakdown (Expenses only)
    cat_totals: dict[str, Decimal] = {}
    for tx in expenses:
        cat_totals[tx.category] = cat_totals.get(tx.category, Decimal("0")) + tx.amount

    category_breakdown = []
    for cat, total in cat_totals.items():
        pct = float(total / month_expense * 100) if month_expense > 0 else 0
        category_breakdown.append(CategoryBreakdown(category=cat, total=total, percentage=round(pct, 1)))

    # Weekly spend (Expenses only)
    weekly_spend = []
    _, days_in_month = calendar.monthrange(year, month)
    week_labels = ["Week 1", "Week 2", "Week 3", "Week 4"]
    week_ranges = [(1, 7), (8, 14), (15, 21), (22, days_in_month)]
    for label, (start, end) in zip(week_labels, week_ranges):
        total = sum(
            tx.amount for tx in expenses if start <= tx.date.day <= end
        ) or Decimal("0")
        weekly_spend.append(WeeklySpend(week_label=label, total=total))

    # Budget progress (Expenses only)
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    budget_progress = []
    alerts = []
    for b in budgets:
        spent = cat_totals.get(b.category, Decimal("0"))
        pct = float(spent / b.monthly_limit * 100) if b.monthly_limit > 0 else 0
        budget_progress.append(BudgetProgress(
            category=b.category, spent=spent, limit=b.monthly_limit, percentage=round(pct, 1)
        ))
        if pct >= 100:
            alerts.append(f"🚨 {b.category} budget exceeded! Spent ₹{spent} of ₹{b.monthly_limit}")
        elif pct >= 80:
            alerts.append(f"⚠️ {b.category} budget at {pct:.0f}% — ₹{b.monthly_limit - spent} remaining")

    # Financial Win alert
    if month_income > month_expense and month_income > 0:
        alerts.insert(0, f"🏆 Financial Win! You saved ₹{month_savings} this month ({savings_rate:.0f}% savings rate).")

    return DashboardSummary(
        month=month,
        year=year,
        month_total=month_expense,
        month_income=month_income,
        month_savings=month_savings,
        savings_rate=round(savings_rate, 1),
        category_breakdown=category_breakdown,
        weekly_spend=weekly_spend,
        budget_progress=budget_progress,
        alerts=alerts,
    )
