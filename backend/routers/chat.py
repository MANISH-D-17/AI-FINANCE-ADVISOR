from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from dependencies import get_current_user
from models.user import User
from models.chat_history import ChatHistory
from schemas.chat import ChatRequest, ChatResponse, ChatMessage
from services.finance_agent import call_agent

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/history", response_model=list[ChatMessage])
async def get_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve up to last 50 messages for the current user."""
    stmt = select(ChatHistory).where(ChatHistory.user_id == current_user.id).order_by(ChatHistory.created_at.asc()).limit(50)
    result = await db.execute(stmt)
    history = result.scalars().all()
    return [ChatMessage(role=h.role, content=h.content) for h in history]


@router.post("", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Persist user message
    user_msg = ChatHistory(user_id=current_user.id, role="user", content=data.messages[-1].content)
    db.add(user_msg)
    
    # Process with Agent
    stmt = select(ChatHistory).where(ChatHistory.user_id == current_user.id).order_by(ChatHistory.created_at.asc()).limit(20)
    result = await db.execute(stmt)
    history_objs = result.scalars().all()
    history_dicts = [{"role": h.role, "content": h.content} for h in history_objs]
    
    reply = await call_agent(current_user.id, data.messages[-1].content, history_dicts)
    
    # Persist assistant reply
    assistant_msg = ChatHistory(user_id=current_user.id, role="assistant", content=reply)
    db.add(assistant_msg)
    await db.commit()
    
    return ChatResponse(reply=reply)
