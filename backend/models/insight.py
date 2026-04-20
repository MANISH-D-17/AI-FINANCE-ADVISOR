import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from database import Base


class Insight(Base):
    __tablename__ = "insights"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
