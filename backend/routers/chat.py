from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models.user import User
from models.chat_history import ChatHistory
from schemas.chat import ChatRequest, ChatResponse, ChatMessage
from services.finance_agent import call_agent

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/history", response_model=list[ChatMessage])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve up to last 50 messages for the current user."""
    history = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).order_by(ChatHistory.created_at.asc()).limit(50).all()
    return [ChatMessage(role=h.role, content=h.content) for h in history]


@router.post("", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Persist user message
    user_msg = ChatHistory(user_id=current_user.id, role="user", content=data.messages[-1].content)
    db.add(user_msg)
    
    # Process with Agent
    # Pass history to agent
    history_objs = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).order_by(ChatHistory.created_at.asc()).limit(20).all()
    history_dicts = [{"role": h.role, "content": h.content} for h in history_objs]
    
    reply = await call_agent(current_user.id, data.messages[-1].content, history_dicts)
    
    # Persist assistant reply
    assistant_msg = ChatHistory(user_id=current_user.id, role="assistant", content=reply)
    db.add(assistant_msg)
    db.commit()
    
    return ChatResponse(reply=reply)
