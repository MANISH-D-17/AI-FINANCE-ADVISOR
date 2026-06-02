"""
Savings Planner API Router
Endpoint: POST /savings-planner/generate
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import date

from database import get_db
from dependencies import get_current_user
from models.user import User
from models.expense import Expense
from models.savings import SavedSavingsPlan
from services.savings_planner_service import generate_savings_plan
from services.cache_service import get_cached, set_cached

router = APIRouter(prefix="/savings-planner", tags=["Savings Planner"])


class SavingsGoalInput(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    deadline_years: Optional[int] = None
    priority: str = "medium"  # low | medium | high


class SavingsPlanRequest(BaseModel):
    income: float = Field(..., gt=0, le=10_000_000, description="Monthly income in INR")
    expenses_by_category: Dict[str, float] = Field(
        default_factory=dict,
        description="Monthly expenses per category"
    )
    goals: List[SavingsGoalInput] = Field(default_factory=list)
    risk_tolerance: str = Field(default="moderate")
    age: int = Field(default=30, ge=18, le=80)
    existing_investments: float = Field(default=0.0, ge=0)
    time_horizon_years: int = Field(default=5, ge=1, le=30)
    use_actual_expenses: bool = Field(
        default=True,
        description="If true, fetch last 3 months expenses from DB and merge with input"
    )


class SavePlanRequest(BaseModel):
    title: str
    plan_data: Dict


@router.post("/generate")
async def generate_plan(
    request: SavingsPlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a comprehensive AI-powered savings and investment plan.

    If use_actual_expenses=True, fetches real expense data from the last
    3 months to augment the input expenses.
    """
    # Cache key based on user + income + risk tolerance
    cache_key = (
        f"savings_plan_{current_user.id}_"
        f"{int(request.income)}_{request.risk_tolerance}_{request.age}"
    )

    cached = None
    try:
        cached = await get_cached(cache_key)
    except Exception:
        pass

    if cached:
        cached["from_cache"] = True
        return cached

    # Fetch actual expenses if requested
    expenses = dict(request.expenses_by_category)

    if request.use_actual_expenses:
        from datetime import timedelta
        cutoff = date.today() - timedelta(days=90)

        stmt = select(
            Expense.category,
            func.sum(Expense.amount).label("total")
        ).where(
            Expense.user_id == current_user.id,
            Expense.date >= cutoff,
            Expense.transaction_type.in_(("debit", "expense")),
            Expense.is_transfer == False,
        ).group_by(Expense.category)

        result = await db.execute(stmt)
        db_expenses = {row.category: float(row.total) / 3 for row in result.all()}  # Monthly avg

        # Merge: DB data takes priority if available
        for cat, amount in db_expenses.items():
            if cat not in expenses or expenses[cat] == 0:
                expenses[cat] = amount

    # Get user income if not provided
    income = request.income
    if income == 0 and current_user.income:
        try:
            income = float(current_user.income)
        except (ValueError, TypeError):
            pass

    if income == 0:
        raise HTTPException(
            status_code=400,
            detail="Income must be provided. Set it in your profile or pass it in the request."
        )

    try:
        plan = await generate_savings_plan(
            income=income,
            expenses_by_category=expenses,
            goals=[g.model_dump() for g in request.goals],
            risk_tolerance=request.risk_tolerance,
            age=request.age,
            existing_investments=request.existing_investments,
            time_horizon_years=request.time_horizon_years,
        )
        plan["from_cache"] = False

        # Cache for 6 hours (plan doesn't change intraday)
        try:
            await set_cached(cache_key, plan, expire_seconds=21600)
        except Exception:
            pass

        return plan

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {str(e)}")


@router.get("/quick-snapshot")
async def quick_snapshot(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns a fast financial snapshot without full AI planning.
    Useful for dashboard widgets.
    """
    from datetime import timedelta
    cutoff = date.today() - timedelta(days=30)

    stmt_exp = select(func.sum(Expense.amount)).where(
        Expense.user_id == current_user.id,
        Expense.date >= cutoff,
        Expense.transaction_type.in_(("debit", "expense")),
        Expense.is_transfer == False,
    )
    result = await db.execute(stmt_exp)
    month_expenses = float(result.scalar() or 0)

    income = 0.0
    if current_user.income:
        try:
            income = float(current_user.income)
        except (ValueError, TypeError):
            pass

    surplus = max(0.0, income - month_expenses)
    savings_rate = (surplus / income * 100) if income > 0 else 0

    return {
        "income": income,
        "month_expenses": round(month_expenses, 2),
        "surplus": round(surplus, 2),
        "savings_rate_pct": round(savings_rate, 1),
        "verdict": (
            "on_track" if savings_rate >= 20
            else "needs_attention" if savings_rate >= 10
            else "critical"
        ),
        "recommended_sip": round(surplus * 0.50, 2),
        "recommended_fd": round(surplus * 0.25, 2),
    }


@router.post("/plans")
async def save_plan(
    request: SavePlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Persist an AI-generated savings/investment plan to the database.
    """
    import json
    try:
        plan_str = json.dumps(request.plan_data)
        new_plan = SavedSavingsPlan(
            user_id=current_user.id,
            title=request.title,
            plan_data=plan_str
        )
        db.add(new_plan)
        await db.commit()
        await db.refresh(new_plan)
        
        return {
            "id": new_plan.id,
            "title": new_plan.title,
            "plan_data": request.plan_data,
            "created_at": new_plan.created_at
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save plan: {str(e)}")


@router.get("/plans")
async def list_saved_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all saved savings plans for the authenticated user.
    """
    import json
    stmt = select(SavedSavingsPlan).where(
        SavedSavingsPlan.user_id == current_user.id
    ).order_by(SavedSavingsPlan.created_at.desc())
    
    result = await db.execute(stmt)
    db_plans = result.scalars().all()
    
    plans = []
    for p in db_plans:
        try:
            plan_dict = json.loads(p.plan_data)
        except Exception:
            plan_dict = {}
        plans.append({
            "id": p.id,
            "title": p.title,
            "plan_data": plan_dict,
            "created_at": p.created_at
        })
    return plans


@router.delete("/plans/{plan_id}")
async def delete_saved_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a specific saved savings plan by ID.
    """
    # Verify owner
    stmt = select(SavedSavingsPlan).where(
        SavedSavingsPlan.id == plan_id,
        SavedSavingsPlan.user_id == current_user.id
    )
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Saved plan not found or unauthorized")
    
    await db.delete(plan)
    await db.commit()
    return {"status": "success", "message": "Plan deleted successfully"}

