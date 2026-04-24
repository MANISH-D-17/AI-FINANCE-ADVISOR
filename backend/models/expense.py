import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Date, Numeric, Boolean, DateTime, func, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Salary", "Refund", "Investments", "Cashback", "Income", "Transfers", "Other"]


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=True)
    date = Column(Date, nullable=False)
    reference_number = Column(String(100), nullable=True, index=True)
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
    anomaly_explanation = Column(String, nullable=True) # Reason why it's anomalous
    is_verified = Column(Boolean, default=False) # User flag (True = verified/expected, False = needs review)
    transaction_type = Column(String(10), default="debit")  # "debit" | "credit" | "transfer"
    is_transfer = Column(Boolean, default=False)
    transfer_pair_id = Column(String, nullable=True)  # links two sides of a transfer (UUID or Int)
    account_name_legacy = Column(String, nullable=True) # renamed for safety
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="expenses")
    account = relationship("BankAccount", back_populates="expenses")

    __table_args__ = (UniqueConstraint('user_id', 'reference_number', name='_user_ref_uc'),)
    
    @property
    def account_name(self):
        """Compatibility property for legacy and multi-account names."""
        try:
            if self.account:
                return self.account.account_name
        except Exception:
            pass
        return self.account_name_legacy or "Primary"

