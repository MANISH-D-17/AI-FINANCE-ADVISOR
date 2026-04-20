from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class CategoryBreakdown(BaseModel):
    category: str
    total: Decimal
    percentage: float


class WeeklySpend(BaseModel):
    week_label: str
    total: Decimal


class BudgetProgress(BaseModel):
    category: str
    spent: Decimal
    limit: Decimal
    percentage: float


class DashboardSummary(BaseModel):
    month: int
    year: int
    month_total: Decimal # This will represent month_expense for compatibility
    month_income: Decimal
    month_savings: Decimal
    savings_rate: float
    category_breakdown: list[CategoryBreakdown]
    weekly_spend: list[WeeklySpend]
    budget_progress: list[BudgetProgress]
    alerts: list[str]
