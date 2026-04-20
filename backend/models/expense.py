import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, func, Boolean, Float, UniqueConstraint
from database import Base


CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Salary", "Refund", "Investments", "Cashback", "Other"]


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=True)
    date = Column(Date, nullable=False)
    reference_number = Column(String, nullable=True, index=True)
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
    transaction_type = Column(String, default="expense")  # 'income' or 'expense'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint('user_id', 'reference_number', name='_user_ref_uc'),)
