import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func, UniqueConstraint
from database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    monthly_limit = Column(Numeric(10, 2), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "category", name="uq_user_category"),)
