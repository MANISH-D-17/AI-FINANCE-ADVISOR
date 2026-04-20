from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.forecast_service import generate_forecast

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get("/monthly")
def monthly_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return generate_forecast(db, current_user.id)
