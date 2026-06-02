from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict


class InsightResponse(BaseModel):
    id: str
    content: str
    generated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PeriodComparison(BaseModel):
    current_total: float
    previous_total: float
    change_pct: float
    current_cats: Dict[str, float]
    previous_cats: Dict[str, float]
    top_category: str
    top_category_amount: float
    weekend_spend: float
    weekday_spend: float
    expense_count: int


class InsightListResponse(BaseModel):
    insights: list[InsightResponse]
    cached: bool
    comparison: Optional[PeriodComparison] = None
