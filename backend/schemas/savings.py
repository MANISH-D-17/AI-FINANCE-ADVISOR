from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class SavingsGoalCreate(BaseModel):
    title: str
    target_amount: Decimal
    current_amount: Optional[Decimal] = 0.0
    category: Optional[str] = "Other"
    deadline: Optional[date] = None

class SavingsGoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[Decimal] = None
    current_amount: Optional[Decimal] = None
    category: Optional[str] = None
    deadline: Optional[date] = None

class SavingsGoalResponse(BaseModel):
    id: str
    user_id: str
    title: str
    target_amount: Decimal
    current_amount: Decimal
    category: Optional[str]
    deadline: Optional[date]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Intelligence Fields
    progress_percentage: float = 0.0
    estimated_completion_date: Optional[date] = None
    is_on_track: bool = True
    status_message: str = "Goal started!"

    class Config:
        from_attributes = True
