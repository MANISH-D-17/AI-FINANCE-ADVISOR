from sqlalchemy.orm import Session
from models.expense import Expense
from models.budget import Budget
from schemas.chat import ChatMessage
from config import settings
from datetime import date, timedelta


def _build_system_prompt(db: Session, user_id: str) -> str:
    today = date.today()
    expenses = (
        db.query(Expense)
        .filter(Expense.user_id == user_id, Expense.date >= today - timedelta(days=30))
        .order_by(Expense.date.desc())
        .limit(30)
        .all()
    )
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()

    expense_lines = "\n".join(
        f"- {e.date}: ₹{e.amount} on {e.category} ({e.description or 'no description'})"
        for e in expenses
    )
    budget_lines = "\n".join(f"- {b.category}: ₹{b.monthly_limit}/month" for b in budgets)

    total_spent = sum(float(e.amount) for e in expenses)

    return f"""You are a smart, friendly personal finance advisor AI. Answer questions based on the user's real expense data below. Be concise, specific, and helpful. Use Indian Rupees (₹).

User's last 30 days expenses:
{expense_lines or 'No expenses recorded yet.'}

User's budget limits:
{budget_lines or 'No budgets set yet.'}

Total spent in last 30 days: ₹{total_spent:.0f}
Today's date: {today}

Answer the user's question directly based on this data. If you don't have enough data, say so honestly."""


async def chat_with_ai(db: Session, user_id: str, messages: list[ChatMessage]) -> str:
    if not settings.GEMINI_API_KEY:
        return "⚠️ AI chat is not configured. Please add your GEMINI_API_KEY to the backend .env file."

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)

        system_prompt = _build_system_prompt(db, user_id)
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=system_prompt,
        )

        # Convert to Gemini chat history format
        history = []
        for msg in messages[:-1]:  # all but last
            history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.content],
            })

        chat = model.start_chat(history=history)
        response = chat.send_message(messages[-1].content)
        return response.text

    except Exception as e:
        return f"I'm having trouble connecting to the AI service right now. Please try again shortly. (Error: {str(e)[:100]})"
