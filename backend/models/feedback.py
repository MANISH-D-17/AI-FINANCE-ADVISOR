import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from database import Base

class CategoryFeedback(Base):
    __tablename__ = "category_feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    description = Column(String, nullable=False)
    suggested_category = Column(String, nullable=False)
    correct_category = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
