from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.tax_service import get_tax_summary
from typing import Dict, Any

from dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/tax", tags=["tax"])

@router.get("/summary")
async def get_tax_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Returns YTD tax liability and deduction analytics."""
    return await get_tax_summary(db, current_user.id)

