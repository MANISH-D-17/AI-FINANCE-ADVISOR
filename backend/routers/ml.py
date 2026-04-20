from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models.user import User
from services import ml_metrics, retraining
from pydantic import BaseModel

router = APIRouter(prefix="/ml", tags=["Machine Learning"])

class FeedbackCreate(BaseModel):
    description: str
    suggested_category: str
    correct_category: str

@router.get("/metrics")
def get_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the latest ML model performance metrics."""
    metrics = ml_metrics.get_latest_metrics(db)
    if not metrics:
        # Try to generate them if missing
        metrics = ml_metrics.evaluate_and_store_metrics(db)
    
    if not metrics:
        raise HTTPException(status_code=404, detail="Metrics not available")
        
    return metrics

@router.post("/feedback")
def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a category correction for model improvement."""
    return retraining.add_feedback(
        db, 
        current_user.id, 
        data.description, 
        data.suggested_category, 
        data.correct_category
    )

@router.post("/retrain")
def manual_retrain(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger model retraining (Admin/Service only in prod)."""
    success = retraining.retrain_model(db)
    if not success:
        raise HTTPException(status_code=500, detail="Retraining failed")
    return {"message": "Model retrained successfully"}
