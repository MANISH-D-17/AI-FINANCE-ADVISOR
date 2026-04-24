from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Date, func
from sqlalchemy.orm import relationship
from database import Base

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_name = Column(String(100), nullable=False)       # "HDFC Savings", "SBI Salary"
    bank_name = Column(String(50), nullable=False)           # "HDFC", "SBI", "Axis", etc.
    account_number_last4 = Column(String(4), nullable=True) # last 4 digits only
    account_type = Column(String(20), default="savings")    # "savings" | "current" | "credit_card"
    current_balance = Column(Float, default=0.0)
    currency = Column(String(3), default="INR")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="bank_accounts")
    expenses = relationship("Expense", back_populates="account")
    statements = relationship("AccountStatement", back_populates="account")

class AccountStatement(Base):
    __tablename__ = "account_statements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False, unique=True) # SHA-256 of file to prevent re-import
    bank_name = Column(String(50), nullable=False)
    statement_from = Column(Date, nullable=True)
    statement_to = Column(Date, nullable=True)
    total_transactions = Column(Integer, default=0)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="success")  # success | partial | failed

    # Relationships
    account = relationship("BankAccount", back_populates="statements")
