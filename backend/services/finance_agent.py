from typing import Annotated, TypedDict, Union, List
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from sqlalchemy.orm import Session
from database import SessionLocal
from config import settings
from services import dashboard_service, forecast_service, health_score_service, budget_service, expense_service
from models.savings import SavingsGoal

# Define the state for the graph
class AgentState(TypedDict):
    messages: Annotated[List[dict], "Chat history"]
    user_id: str

def create_tools(user_id: str):
    db = SessionLocal()
    
    @tool
    def get_spending_summary():
        """Get a summary of total spending, top categories, and alerts for this month."""
        try:
            summary = dashboard_service.get_summary(db, user_id)
            return f"Summary: Total Spend ₹{summary['month_total']}, Top Category: {summary['category_breakdown'][0]['category'] if summary['category_breakdown'] else 'N/A'}. Alerts: {', '.join(summary['alerts'])}"
        finally:
            db.close()

    @tool
    def get_forecast():
        """Get the spending forecast for the next 30 days."""
        try:
            forecast = forecast_service.get_monthly_forecast(db, user_id)
            return f"Forecast for next 30 days: ₹{forecast['total_forecast']:.2f}. Trend: {'Up' if forecast['is_increasing'] else 'Down' or 'Stable'}."
        finally:
            db.close()

    @tool
    def get_health_score():
        """Get the current financial health score (0-100) and grade."""
        try:
            score_data = health_score_service.get_health_score(db, user_id)
            return f"Health Score: {score_data['score']}/100, Grade: {score_data['grade']}. Analysis: {score_data['analysis'][:200]}..."
        finally:
            db.close()

    @tool
    def get_flagged_anomalies():
        """Get transactions that were flagged as unusual or anomalous."""
        try:
            anomalies = expense_service.get_anomalies(db, user_id)
            if not anomalies: return "No unusual transactions detected."
            details = [f"₹{a.amount} on {a.category} ({a.date})" for a in anomalies[:3]]
            return "Anomalies found: " + ", ".join(details)
        finally:
            db.close()

    @tool
    def set_category_budget(category: str, amount: float):
        """Set a monthly budget limit for a specific category."""
        try:
            from schemas.budget import BudgetCreate
            budget_service.create_or_update_budget(db, user_id, BudgetCreate(category=category, monthly_limit=amount))
            return f"Budget for {category} set to ₹{amount} successfully."
        finally:
            db.close()

    @tool
    def get_savings_goals():
        """Get all savings goals and current progress (e.g. Dream House, Car, etc.)."""
        try:
            goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id).all()
            if not goals: return "No savings goals set yet."
            return "\n".join([f"{g.title}: ₹{g.current_amount}/₹{g.target_amount} ({g.category})" for g in goals])
        finally:
            db.close()

    return [get_spending_summary, get_forecast, get_health_score, get_flagged_anomalies, set_category_budget, get_savings_goals]

async def call_agent(user_id: str, query: str, history: List[dict] = []):
    if not settings.GEMINI_API_KEY:
        return "AI Advisor is not configured."

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0
    )
    
    tools = create_tools(user_id)
    llm_with_tools = llm.bind_tools(tools)

    # Simplified LangGraph logic
    # In a full LangGraph setup we'd have a more complex graph, 
    # but for this mission we'll use a direct tool-calling loop.
    
    messages = [{"role": "system", "content": "You are an Elite Financial Advisor Agent. Use tools to help users with their finances."}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": query})

    # For this implementation, I'll use LCEL with tool calling for simplicity and speed
    # since full LangGraph state management might be overkill for a single turn in a stateless FastAPI request
    # unless we use persistent checkpointers.
    
    from langchain.agents import AgentExecutor, create_openai_tools_agent
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an Elite Personal Finance Advisor. You have access to the user's live financial data through tools. Be specific, use Indian Rupees (₹), and provide actionable advice."),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_openai_tools_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    result = await executor.ainvoke({
        "input": query,
        "chat_history": [] # Pass actual history here if needed
    })

    return result["output"]
