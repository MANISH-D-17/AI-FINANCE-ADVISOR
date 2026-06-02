from pydantic import BaseModel
from typing import Optional, Dict, List


class ForecastPoint(BaseModel):
    ds: str   # date string
    yhat: float
    yhat_lower: float
    yhat_upper: float


class CategoryForecast(BaseModel):
    category: str
    avg_monthly: float
    trend: str  # "rising", "falling", "stable"
    change_pct: float


class ForecastResponse(BaseModel):
    forecast: list[ForecastPoint]
    predicted_monthly_total: float
    actual_last_30_days: float
    is_estimate: bool  # True if cold-start fallback was used
    message: str
    verdict: str  # "over_budget", "on_track", "saving"
    category_breakdown: List[CategoryForecast] = []
    days_of_data: int = 0
