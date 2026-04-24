from pydantic import BaseModel
from decimal import Decimal


class BudgetUpsert(BaseModel):
    category: str
    monthly_limit: Decimal


class BudgetResponse(BaseModel):
    id: str
    user_id: str
    category: str
    monthly_limit: Decimal
    
    # Intelligence Fields
    current_spend: float = 0.0
    remaining_budget: float = 0.0
    burn_rate: float = 0.0
    projected_spend: float = 0.0
    recommendation: str = "Loading insights..."

    class Config:
        from_attributes = True
