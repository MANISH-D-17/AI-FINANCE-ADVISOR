from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.forecast_service import generate_forecast

router = APIRouter(prefix="/forecast", tags=["Forecast"])


from sqlalchemy.ext.asyncio import AsyncSession

@router.get("/monthly")
async def monthly_forecast(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await generate_forecast(db, current_user.id)
