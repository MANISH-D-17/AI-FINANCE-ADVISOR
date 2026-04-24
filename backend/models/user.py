import uuid
from sqlalchemy import Column, String, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)  # nullable for Google OAuth users
    income = Column(String, nullable=True, default="0")  # monthly income estimate
    email_notifications = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Google OAuth fields
    full_name = Column(String(200), nullable=True)
    google_id = Column(String(100), nullable=True, index=True)
    profile_picture = Column(String(500), nullable=True)
    auth_provider = Column(String(20), default='email')  # 'email' | 'google'

    # Relationships
    bank_accounts = relationship("BankAccount", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
