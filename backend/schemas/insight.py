from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class InsightResponse(BaseModel):
    id: str
    content: str
    generated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InsightListResponse(BaseModel):
    insights: list[InsightResponse]
    cached: bool
