from typing import Annotated, TypedDict, List
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import AsyncSessionLocal
from config import settings
from services import dashboard_service, forecast_service, health_score_service, expense_service
from models.savings import SavingsGoal
import json

# Define the state for the graph
class AgentState(TypedDict):
    messages: Annotated[List[dict], "Chat history"]
    user_id: str

def create_tools(user_id: str):
    
    @tool("getSpendingSummary")
    async def get_spending_summary(query: str = ""):
        """Get a summary of total spending, top categories, and alerts for this month."""
        async with AsyncSessionLocal() as db:
            try:
                summary = await dashboard_service.get_dashboard_summary(db, user_id)
                data = summary.model_dump()
                return f"Summary: Total Spend ₹{data['month_total']}, Top Category: {data['category_breakdown'][0]['category'] if data['category_breakdown'] else 'N/A'}. Alerts: {', '.join(data['alerts'])}"
            except Exception as e:
                return f"Error fetching summary: {str(e)}"

    @tool("getForecast")
    async def get_forecast(query: str = ""):
        """Get the spending forecast for the next 30 days."""
        async with AsyncSessionLocal() as db:
            try:
                forecast = await forecast_service.generate_forecast(db, user_id)
                data = forecast.model_dump()
                return f"Forecast for next 30 days: ₹{data['predicted_monthly_total']:.2f}. Message: {data['message']}"
            except Exception as e:
                return f"Error fetching forecast: {str(e)}"

    @tool("getHealthScore")
    async def get_health_score(query: str = ""):
        """Get the current financial health score (0-100) and grade."""
        async with AsyncSessionLocal() as db:
            try:
                score_data = await health_score_service.compute_health_score(db, user_id)
                return f"Health Score: {score_data['score']}/100, Grade: {score_data['grade']}. Savings Score: {score_data['components']['savings_ratio']}/40."
            except Exception as e:
                return f"Error fetching health score: {str(e)}"

    @tool("getFlaggedAnomalies")
    async def get_flagged_anomalies(query: str = ""):
        """Get transactions that were flagged as unusual or anomalous."""
        async with AsyncSessionLocal() as db:
            try:
                anomalies = await expense_service.get_anomalies(db, user_id)
                if not anomalies: return "No unusual transactions detected."
                details = [f"₹{a.amount} on {a.category} ({a.date})" for a in anomalies[:3]]
                return "Anomalies found: " + ", ".join(details)
            except Exception as e:
                return f"Error fetching anomalies: {str(e)}"

    @tool("getSavingsGoals")
    async def get_savings_goals(query: str = ""):
        """Get all savings goals and current progress (e.g. Dream House, Car, etc.)."""
        async with AsyncSessionLocal() as db:
            try:
                stmt = select(SavingsGoal).where(SavingsGoal.user_id == user_id)
                result = await db.execute(stmt)
                goals = result.scalars().all()
                if not goals: return "No savings goals set yet."
                return "\n".join([f"{g.title}: ₹{g.current_amount}/₹{g.target_amount} ({g.category})" for g in goals])
            except Exception as e:
                return f"Error fetching savings goals: {str(e)}"

    return [get_spending_summary, get_forecast, get_health_score, get_flagged_anomalies, get_savings_goals]

async def call_agent(user_id: str, query: str, history: List[dict] = []):
    if not settings.GEMINI_API_KEY:
        return "AI Advisor is not configured."

    from langchain_google_genai import ChatGoogleGenerativeAI, HarmCategory, HarmBlockThreshold
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0,
        google_api_version="v1",
        safety_settings={
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        }
    )

    
    tools = create_tools(user_id)
    
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an Elite Personal Finance Advisor. You have access to live financial data through tools. "
                   "IMPORTANT: Call only ONE tool at a time. Do not attempt multi-tool calls in a single turn. "
                   "Be specific, use Indian Rupees (₹), and provide actionable advice."),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # Convert histoy to LangChain messages format
    formatted_history = []
    for h in history:
        if h["role"] == "user":
            formatted_history.append(("user", h["content"]))
        else:
            formatted_history.append(("assistant", h["content"]))

    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    try:
        result = await executor.ainvoke({
            "input": query,
            "chat_history": formatted_history
        })
        return result["output"]
    except Exception as e:
        print(f"DEBUG: Agent Execution Error: {str(e)}")
        import traceback
        traceback.print_exc()
        if "quota" in str(e).lower() or "exceeded" in str(e).lower():
            return "I'm receiving too many requests right now. Please try again in a few seconds."
        if "safety" in str(e).lower() or "block" in str(e).lower():
            return "I apologize, but I cannot provide an answer to that specific query due to safety filters. Try rephrasing your request about financial data."
        raise e
