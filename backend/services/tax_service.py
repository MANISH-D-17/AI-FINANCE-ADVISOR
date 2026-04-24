from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.expense import Expense
from typing import Dict, Any
from datetime import date

async def get_tax_summary(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """Estimates tax liability and deductible efficiency."""
    today = date.today()
    start_of_year = date(today.year, 1, 1)

    # 1. Calculate Total Income
    income_stmt = select(func.sum(Expense.amount)).where(
        Expense.user_id == user_id,
        Expense.category == 'Income',
        Expense.date >= start_of_year,
        Expense.is_transfer == False
    )
    income_result = await db.execute(income_stmt)
    total_income = float(income_result.scalar() or 0.0)

    # 2. Identify Deductible Expenses
    deductible_categories = ['Bills', 'Health', 'Travel', 'Investments']
    deduct_stmt = select(func.sum(Expense.amount)).where(
        Expense.user_id == user_id,
        Expense.category.in_(deductible_categories),
        Expense.date >= start_of_year,
        Expense.is_transfer == False
    )
    deduct_result = await db.execute(deduct_stmt)
    total_deductions = float(deduct_result.scalar() or 0.0)

    # 3. Calculate Projected Tax
    taxable_income = max(0.0, total_income - total_deductions)
    projected_tax = taxable_income * 0.20
    
    # 4. Deduction Efficiency
    efficiency = (total_deductions / total_income * 100) if total_income > 0 else 0.0

    return {
        "total_income_ytd": total_income,
        "total_deductions_ytd": total_deductions,
        "taxable_income": taxable_income,
        "projected_tax_liability": projected_tax,
        "deduction_efficiency": round(efficiency, 1),
        "tax_year": today.year
    }

