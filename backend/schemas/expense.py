from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class ExpenseCreate(BaseModel):
    amount: Decimal
    category: str
    description: Optional[str] = None
    date: date
    transaction_type: str = "expense"
    reference_number: Optional[str] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[date] = None


class ExpenseResponse(BaseModel):
    id: str
    user_id: str
    amount: Decimal
    category: str
    description: Optional[str]
    date: date
    transaction_type: str
    reference_number: Optional[str]
    is_anomaly: bool
    anomaly_score: float
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseImportRow(BaseModel):
    date: date
    description: str
    amount: Decimal
    type: str # 'debit' or 'credit'
    category: Optional[str] = "Other"
    reference_number: Optional[str] = None


class ExpenseImportConfirm(BaseModel):
    transactions: list[ExpenseImportRow]
