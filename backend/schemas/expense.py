from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, le=10_000_000, description="Amount must be positive")
    category: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    date: date
    transaction_type: str = "expense"
    reference_number: Optional[str] = None
    account_name: Optional[str] = "Primary"

    @validator("amount")
    def round_amount(cls, v):
        return round(v, 2)


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, le=10_000_000)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
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
    account_name: Optional[str]
    is_anomaly: bool
    anomaly_score: float
    anomaly_explanation: Optional[str]
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseImportRow(BaseModel):
    date: date
    description: str
    amount: Decimal
    type: str  # 'debit' or 'credit'
    category: Optional[str] = "Other"
    reference_number: Optional[str] = None
    account_id: Optional[int] = None
    account_name: Optional[str] = "Primary"
    # New fields for v3 categorizer metadata
    confidence: Optional[float] = None
    requires_review: Optional[bool] = False


class ExpenseImportConfirm(BaseModel):
    transactions: List[ExpenseImportRow]


class ImportConfirmResponse(BaseModel):
    message: str
    imported: int
    skipped_duplicates: int
    transfers_detected: int
    categories_requiring_review: int
    reconciliation: Optional[dict] = None
