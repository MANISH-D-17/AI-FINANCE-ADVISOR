from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, func, DateTime
from sqlalchemy.orm import relationship
from database import Base

class BalanceHistory(Base):
    __tablename__ = "balance_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    balance = Column(Float, nullable=False)
    snapshot_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    account = relationship("BankAccount")
