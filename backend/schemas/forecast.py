from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class ForecastPoint(BaseModel):
    ds: str   # date string
    yhat: float
    yhat_lower: float
    yhat_upper: float


class ForecastResponse(BaseModel):
    forecast: list[ForecastPoint]
    predicted_monthly_total: float
    is_estimate: bool  # True if cold-start fallback was used
    message: str
