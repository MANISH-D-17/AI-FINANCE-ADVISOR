from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.net_worth_service import get_net_worth_summary, get_net_worth_trends
from typing import List, Dict, Any

router = APIRouter(prefix="/dashboard/net-worth", tags=["Net Worth"])

@router.get("/summary")
async def net_worth_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get summarized net worth assets and liabilities."""
    return await get_net_worth_summary(db, current_user.id)

@router.get("/trends")
async def net_worth_trends(
    months: int = 6,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get historical net worth trend data."""
    return await get_net_worth_trends(db, current_user.id, months)
