from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services import auth_service
from models.user import User
from typing import Optional


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    payload = auth_service.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    try:
        user = await auth_service.get_user_by_id(db, payload.get("sub"))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception as e:
        # Check if it's a connection error (common in async)
        if "Connection refused" in str(e) or "Errno 61" in str(e):
             raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail="Financial database is currently offline. Please ensure PostgreSQL is running."
            )
        raise
