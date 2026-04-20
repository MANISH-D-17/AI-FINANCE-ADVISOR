import uuid
from sqlalchemy import Column, String, Float, JSON, DateTime, ForeignKey, func
from database import Base

class ModelMetrics(Base):
    __tablename__ = "model_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name = Column(String, nullable=False)
    accuracy = Column(Float, nullable=False)
    f1_scores_json = Column(JSON, nullable=False)
    confusion_matrix_json = Column(JSON, nullable=False)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now())
