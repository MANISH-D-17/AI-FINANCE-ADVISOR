from pydantic import BaseModel
from datetime import datetime


class InsightResponse(BaseModel):
    id: str
    content: str
    generated_at: datetime

    class Config:
        from_attributes = True


class InsightListResponse(BaseModel):
    insights: list[InsightResponse]
    cached: bool
