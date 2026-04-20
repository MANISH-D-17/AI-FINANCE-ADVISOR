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

    class Config:
        from_attributes = True
