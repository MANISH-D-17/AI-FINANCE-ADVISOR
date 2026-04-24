from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class BankAccountBase(BaseModel):
    account_name: str
    bank_name: str
    account_number_last4: Optional[str] = None
    account_type: str = "savings"  # savings | current | credit_card
    current_balance: Decimal = Decimal("0.0")
    currency: str = "INR"

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    current_balance: Optional[Decimal] = None
    is_active: Optional[bool] = None

class BankAccountResponse(BankAccountBase):
    id: int
    user_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AccountStatementResponse(BaseModel):
    id: int
    account_id: int
    filename: str
    bank_name: str
    statement_from: Optional[datetime]
    statement_to: Optional[datetime]
    total_transactions: int
    imported_at: datetime
    status: str

    class Config:
        from_attributes = True
