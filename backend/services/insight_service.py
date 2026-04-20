from sqlalchemy.orm import Session
from sqlalchemy import extract
from models.expense import Expense
from models.budget import Budget
from models.insight import Insight
from config import settings
from datetime import date, datetime, timedelta
import uuid


def _compute_stats(db: Session, user_id: str) -> dict:
    today = date.today()
    current_month = today.month
    current_year = today.year
    last_month = (today.replace(day=1) - timedelta(days=1))
    prev_month = last_month.month
    prev_year = last_month.year

    def monthly_expenses(month, year):
        return db.query(Expense).filter(
            Expense.user_id == user_id,
            extract("month", Expense.date) == month,
            extract("year", Expense.date) == year,
        ).all()

    curr = monthly_expenses(current_month, current_year)
    prev = monthly_expenses(prev_month, prev_year)

    curr_total = float(sum(e.amount for e in curr)) or 0
    prev_total = float(sum(e.amount for e in prev)) or 0

    # Category totals
    def cat_totals(expenses):
        totals = {}
        for e in expenses:
            totals[e.category] = totals.get(e.category, 0) + float(e.amount)
        return totals

    curr_cats = cat_totals(curr)
    prev_cats = cat_totals(prev)

    # Weekend vs weekday
    weekend = sum(float(e.amount) for e in curr if e.date.weekday() >= 5)
    weekday = sum(float(e.amount) for e in curr if e.date.weekday() < 5)

    # Top category
    top_cat = max(curr_cats, key=curr_cats.get) if curr_cats else "N/A"
    top_cat_amount = curr_cats.get(top_cat, 0)

    # MoM changes
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

    if weekday > 0:
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

        response = model.generate_content(prompt)
        text = response.text.strip()
        # Parse JSON array
        import json
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


async def generate_insights(db: Session, user_id: str) -> list[Insight]:
    # Check cache: insights generated in last 24h
    cutoff = datetime.utcnow() - timedelta(hours=24)
    cached = (
        db.query(Insight)
        .filter(Insight.user_id == user_id, Insight.generated_at >= cutoff)
        .all()
    )
    if cached:
        return cached

    # Delete old insights for this user
    db.query(Insight).filter(Insight.user_id == user_id).delete()

    stats = _compute_stats(db, user_id)

    # Try Gemini first, fall back to rule-based
    gemini_insights = await _gemini_insights(stats)
    if gemini_insights:
        texts = gemini_insights
    else:
        texts = _rule_based_insights(stats)

    # Ensure at least 3 insights
    while len(texts) < 3:
        texts.append("Keep tracking your expenses consistently to unlock more personalized insights!")

    new_insights = []
    for text in texts[:3]:
        ins = Insight(id=str(uuid.uuid4()), user_id=user_id, content=text)
        db.add(ins)
        new_insights.append(ins)

    db.commit()
    for ins in new_insights:
        db.refresh(ins)

    return new_insights
