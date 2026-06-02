import pandas as pd
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.expense import Expense
from schemas.forecast import ForecastResponse, ForecastPoint, CategoryForecast
from datetime import date, timedelta
import warnings
import asyncio
from prophet import Prophet
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=3)
warnings.filterwarnings("ignore")

MIN_DAYS_FOR_PROPHET = 30


async def _get_expenses(db: AsyncSession, user_id: str):
    stmt = select(Expense).where(
        Expense.user_id == user_id,
        Expense.transaction_type.in_(['debit', 'expense']),
        Expense.is_transfer == False
    )
    result = await db.execute(stmt)
    return result.scalars().all()


def _build_daily_df(expenses) -> pd.DataFrame:
    if not expenses:
        return pd.DataFrame(columns=["ds", "y"])
    records = [{"ds": str(e.date), "y": float(e.amount)} for e in expenses]
    df = pd.DataFrame(records)
    df["ds"] = pd.to_datetime(df["ds"])
    df = df.groupby("ds")["y"].sum().reset_index()
    return df


def _category_breakdown(expenses, days_curr=30, days_prev=30) -> list:
    today = date.today()
    curr_start = today - timedelta(days=days_curr)
    prev_start = today - timedelta(days=days_curr + days_prev)
    prev_end = today - timedelta(days=days_curr)

    curr = [e for e in expenses if e.date >= curr_start]
    prev = [e for e in expenses if prev_start <= e.date < prev_end]

    def cat_totals(exps):
        t = {}
        for e in exps:
            t[e.category] = t.get(e.category, 0) + float(e.amount)
        return t

    curr_cats = cat_totals(curr)
    prev_cats = cat_totals(prev)

    result = []
    for cat, curr_amt in sorted(curr_cats.items(), key=lambda x: -x[1]):
        prev_amt = prev_cats.get(cat, 0)
        if prev_amt > 0:
            change_pct = round((curr_amt - prev_amt) / prev_amt * 100, 1)
        else:
            change_pct = 0.0

        if change_pct > 10:
            trend = "rising"
        elif change_pct < -10:
            trend = "falling"
        else:
            trend = "stable"

        result.append(CategoryForecast(
            category=cat,
            avg_monthly=round(curr_amt, 2),
            trend=trend,
            change_pct=change_pct,
        ))
    return result[:6]  # Top 6 categories


async def generate_forecast(db: AsyncSession, user_id: str) -> ForecastResponse:
    expenses = await _get_expenses(db, user_id)
    df = _build_daily_df(expenses)

    today = date.today()
    future_dates = [today + timedelta(days=i) for i in range(1, 31)]

    # Actual last 30 days
    cutoff_30 = today - timedelta(days=30)
    actual_last_30 = sum(float(e.amount) for e in expenses if e.date >= cutoff_30)

    # Category breakdown
    cat_breakdown = _category_breakdown(expenses)

    days_of_data = len(df)

    def _verdict(predicted: float, actual: float) -> str:
        if actual == 0:
            return "on_track"
        ratio = predicted / actual
        if ratio > 1.15:
            return "over_budget"
        elif ratio < 0.9:
            return "saving"
        return "on_track"

    # Cold start
    if days_of_data < MIN_DAYS_FOR_PROPHET:
        avg_daily = float(df["y"].mean()) if days_of_data > 0 else 500.0
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
        verdict = _verdict(predicted_monthly, actual_last_30)
        return ForecastResponse(
            forecast=points,
            predicted_monthly_total=round(predicted_monthly, 2),
            actual_last_30_days=round(actual_last_30, 2),
            is_estimate=True,
            verdict=verdict,
            message=f"Based on your average daily spend of ₹{avg_daily:.0f}, you are likely to spend ₹{predicted_monthly:,.0f} in the next 30 days.",
            category_breakdown=cat_breakdown,
            days_of_data=days_of_data,
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
        verdict = _verdict(predicted_monthly, actual_last_30)

        diff = predicted_monthly - actual_last_30
        diff_str = f"₹{abs(diff):,.0f} {'more' if diff > 0 else 'less'}"

        return ForecastResponse(
            forecast=points,
            predicted_monthly_total=round(predicted_monthly, 2),
            actual_last_30_days=round(actual_last_30, 2),
            is_estimate=False,
            verdict=verdict,
            message=f"You are projected to spend ₹{predicted_monthly:,.0f} in the next 30 days — {diff_str} than the past 30 days (₹{actual_last_30:,.0f}).",
            category_breakdown=cat_breakdown,
            days_of_data=days_of_data,
        )

    except Exception:
        avg_daily = float(df["y"].mean())
        predicted_monthly = avg_daily * 30
        points = [
            ForecastPoint(ds=str(d), yhat=avg_daily, yhat_lower=avg_daily * 0.75, yhat_upper=avg_daily * 1.25)
            for d in future_dates
        ]
        verdict = _verdict(predicted_monthly, actual_last_30)
        return ForecastResponse(
            forecast=points,
            predicted_monthly_total=round(predicted_monthly, 2),
            actual_last_30_days=round(actual_last_30, 2),
            is_estimate=True,
            verdict=verdict,
            message=f"Estimated: you'll spend about ₹{predicted_monthly:,.0f} in the next 30 days based on your average daily spend.",
            category_breakdown=cat_breakdown,
            days_of_data=days_of_data,
        )
