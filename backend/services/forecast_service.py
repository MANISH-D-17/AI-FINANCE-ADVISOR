import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from models.expense import Expense
from schemas.forecast import ForecastResponse, ForecastPoint
from datetime import date, timedelta
from pathlib import Path
import pickle
import warnings
import asyncio
from prophet import Prophet
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=3)

warnings.filterwarnings("ignore")

ML_MODELS_DIR = Path(__file__).parent.parent / "ml" / "models"
MIN_DAYS_FOR_PROPHET = 30


from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def _get_daily_spend_df(db: AsyncSession, user_id: str) -> pd.DataFrame:
    # IMPORTANT: Only include actual debit expenses. Exclude transfers and credits.
    stmt = select(Expense).where(
        Expense.user_id == user_id,
        Expense.transaction_type.in_(['debit', 'expense']),
        Expense.is_transfer == False
    )
    result = await db.execute(stmt)
    expenses = result.scalars().all()
    if not expenses:
        return pd.DataFrame(columns=["ds", "y"])
    records = [{"ds": str(e.date), "y": float(e.amount)} for e in expenses]
    df = pd.DataFrame(records)
    df["ds"] = pd.to_datetime(df["ds"])
    df = df.groupby("ds")["y"].sum().reset_index()
    return df


async def generate_forecast(db: AsyncSession, user_id: str) -> ForecastResponse:
    df = await _get_daily_spend_df(db, user_id)

    today = date.today()
    future_dates = [today + timedelta(days=i) for i in range(1, 31)]

    # Cold start: fewer than MIN_DAYS_FOR_PROPHET unique days of data
    if len(df) < MIN_DAYS_FOR_PROPHET:
        avg_daily = float(df["y"].mean()) if len(df) > 0 else 500.0
        predicted_monthly = avg_daily * 30
        points = [
            ForecastPoint(
                ds=str(d),
                yhat=avg_daily,
                yhat_lower=avg_daily * 0.75,
                yhat_upper=avg_daily * 1.25,
            )
            for d in future_dates
        ]
        return ForecastResponse(
            forecast=points,
            predicted_monthly_total=round(predicted_monthly, 2),
            is_estimate=True,
            message=f"Based on your average daily spend of ₹{avg_daily:.0f}, you are likely to spend ₹{predicted_monthly:.0f} this month.",
        )

    # Try Prophet
    try:
        loop = asyncio.get_event_loop()
        
        def run_prophet():
            m = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
            m.fit(df)
            fut = m.make_future_dataframe(periods=30)
            return m.predict(fut)

        forecast_df = await loop.run_in_executor(_executor, run_prophet)
        future_only = forecast_df[forecast_df["ds"] > pd.Timestamp(today)].head(30)

        points = [
            ForecastPoint(
                ds=str(row["ds"].date()),
                yhat=max(0, float(row["yhat"])),
                yhat_lower=max(0, float(row["yhat_lower"])),
                yhat_upper=max(0, float(row["yhat_upper"])),
            )
            for _, row in future_only.iterrows()
        ]
        predicted_monthly = sum(p.yhat for p in points)

        return ForecastResponse(
            forecast=points,
            predicted_monthly_total=round(predicted_monthly, 2),
            is_estimate=False,
            message=f"You are likely to spend ₹{predicted_monthly:.0f} this month based on your spending patterns.",
        )

    except Exception as e:
        # Fallback to average
        avg_daily = float(df["y"].mean())
        predicted_monthly = avg_daily * 30
        points = [
            ForecastPoint(ds=str(d), yhat=avg_daily, yhat_lower=avg_daily * 0.75, yhat_upper=avg_daily * 1.25)
            for d in future_dates
        ]
        return ForecastResponse(
            forecast=points,
            predicted_monthly_total=round(predicted_monthly, 2),
            is_estimate=True,
            message=f"Estimated based on average daily spend of ₹{avg_daily:.0f}.",
        )
