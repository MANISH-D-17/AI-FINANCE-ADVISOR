from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract, delete, desc
from models.expense import Expense
from models.budget import Budget
from models.insight import Insight
from config import settings
from datetime import date, datetime, timedelta
import uuid
import json
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=5)


async def _compute_stats(db: AsyncSession, user_id: str) -> dict:
    today = date.today()
    current_month = today.month
    current_year = today.year
    last_month = (today.replace(day=1) - timedelta(days=1))
    prev_month = last_month.month
    prev_year = last_month.year

    async def monthly_expenses(month, year):
        # Calculate start and end of month
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
            
        stmt = select(Expense).where(
            Expense.user_id == user_id,
            Expense.date >= start_date,
            Expense.date < end_date,
            Expense.transaction_type.in_(('debit', 'expense'))
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    curr = await monthly_expenses(current_month, current_year)
    prev = await monthly_expenses(prev_month, prev_year)

    curr_total = float(sum(e.amount for e in curr)) or 0
    prev_total = float(sum(e.amount for e in prev)) or 0

    def cat_totals(expenses):
        totals = {}
        for e in expenses:
            totals[e.category] = totals.get(e.category, 0) + float(e.amount)
        return totals

    curr_cats = cat_totals(curr)
    prev_cats = cat_totals(prev)

    weekend = sum(float(e.amount) for e in curr if e.date.weekday() >= 5)
    weekday = sum(float(e.amount) for e in curr if e.date.weekday() < 5)

    top_cat = max(curr_cats, key=curr_cats.get) if curr_cats else "N/A"
    top_cat_amount = curr_cats.get(top_cat, 0)

    mom_changes = {}
    for cat in set(list(curr_cats.keys()) + list(prev_cats.keys())):
        c = curr_cats.get(cat, 0)
        p = prev_cats.get(cat, 0)
        if p > 0:
            mom_changes[cat] = round((c - p) / p * 100, 1)

    return {
        "curr_total": curr_total,
        "prev_total": prev_total,
        "curr_cats": curr_cats,
        "prev_cats": prev_cats,
        "weekend_spend": weekend,
        "weekday_spend": weekday,
        "top_category": top_cat,
        "top_category_amount": top_cat_amount,
        "mom_changes": mom_changes,
        "expense_count": len(curr),
    }


def _rule_based_insights(stats: dict) -> list[str]:
    insights = []
    total_spend = stats["curr_total"]
    weekend = stats["weekend_spend"]
    weekday = stats["weekday_spend"]

    if (weekday + weekend) > 0:
        ratio = weekend / (weekday + weekend) * 100
        insights.append(f"You spend {ratio:.0f}% of your budget on weekends — consider planning weekend outings in advance.")

    for cat, change in stats["mom_changes"].items():
        if change > 20:
            insights.append(f"Your {cat} expenses increased by {change:.0f}% compared to last month.")
        elif change < -20:
            insights.append(f"Great work! Your {cat} expenses dropped by {abs(change):.0f}% vs last month.")

    if stats["top_category"] != "N/A":
        pct = stats["top_category_amount"] / total_spend * 100 if total_spend > 0 else 0
        insights.append(f"{stats['top_category']} is your biggest expense category at {pct:.0f}% of your monthly spend.")

    return insights[:3]


async def _gemini_insights(stats: dict) -> list[str]:
    """Call Gemini to generate natural language insights."""
    if not settings.GEMINI_API_KEY:
        return []

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""You are a personal finance advisor AI. Analyze these spending statistics and give exactly 3 short, actionable insights (1-2 sentences each). Be specific, friendly, and use Indian Rupees (₹).

Stats:
- This month total: ₹{stats['curr_total']:.0f}
- Last month total: ₹{stats['prev_total']:.0f}
- Category breakdown this month: {stats['curr_cats']}
- Month-over-month changes (%): {stats['mom_changes']}
- Weekend spend: ₹{stats['weekend_spend']:.0f} | Weekday spend: ₹{stats['weekday_spend']:.0f}
- Top category: {stats['top_category']} (₹{stats['top_category_amount']:.0f})

Return ONLY a JSON array of 3 strings, nothing else. Example: ["insight 1", "insight 2", "insight 3"]"""

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(_executor, lambda: model.generate_content(prompt))
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        if isinstance(parsed, list):
            return [str(i) for i in parsed[:3]]
    except Exception:
        pass
    return []


async def generate_insights(db: AsyncSession, user_id: str) -> list[Insight]:
    # Check cache
    cutoff = datetime.utcnow() - timedelta(hours=24)
    stmt = select(Insight).where(Insight.user_id == user_id, Insight.generated_at >= cutoff)
    result = await db.execute(stmt)
    cached = result.scalars().all()
    if cached:
        return list(cached)

    try:
        # Delete old
        await db.execute(delete(Insight).where(Insight.user_id == user_id))

        stats = await _compute_stats(db, user_id)
        logger.info(f"Stats computed for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to compute stats for insights: {e}")
        return []

    # 1. Fetch High-Score Anomalies (Last 7 days)
    anom_cutoff = date.today() - timedelta(days=7)
    stmt_anom = select(Expense).where(
        Expense.user_id == user_id,
        Expense.is_anomaly == True,
        Expense.is_verified == False, # Flagged as suspicious
        Expense.date >= anom_cutoff
    ).order_by(desc(Expense.anomaly_score))
    res_anom = await db.execute(stmt_anom)
    anomalies = res_anom.scalars().all()
    
    anomaly_texts = []
    for a in anomalies[:2]: # Max 2 alerts
        msg = f"🚨 Alert: {a.anomaly_explanation or f'Unusual spend of ₹{a.amount} detected in {a.category}.'}"
        anomaly_texts.append(msg)

    # 2. Gemini vs Rule-based for general trends
    gemini_insights = await _gemini_insights(stats)
    texts = gemini_insights if gemini_insights else _rule_based_insights(stats)

    # 3. Merge alerts (Alerts first)
    final_texts = anomaly_texts + texts

    while len(final_texts) < 3:
        final_texts.append("Keep tracking your expenses consistently to unlock more personalized insights!")

    new_insights = []
    for text in final_texts[:3]:
        ins = Insight(id=str(uuid.uuid4()), user_id=user_id, content=text)
        db.add(ins)
        new_insights.append(ins)

    await db.commit()
    for ins in new_insights:
        await db.refresh(ins)

    return new_insights
