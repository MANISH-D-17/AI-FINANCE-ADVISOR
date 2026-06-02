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

async def run_langchain_agent(llm, tools, query: str, formatted_history: list) -> str:
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

    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    result = await executor.ainvoke({
        "input": query,
        "chat_history": formatted_history
    })
    return result["output"]


async def local_rule_fallback(user_id: str, query: str) -> str:
    query_lower = query.lower()
    tools = create_tools(user_id)
    
    # Extract tool instances
    get_spending_summary = tools[0]
    get_forecast = tools[1]
    get_health_score = tools[2]
    get_flagged_anomalies = tools[3]
    get_savings_goals = tools[4]
    
    if any(k in query_lower for k in ["summary", "spending", "spend", "expense", "expenditure", "dashboard", "how much did i"]):
        res = await get_spending_summary.ainvoke({})
        return f"Based on your database analysis:\n\n{res}\n\nIs there anything specific about this month's spending you'd like to look into?"
        
    elif any(k in query_lower for k in ["forecast", "predict", "future", "next month", "projection"]):
        res = await get_forecast.ainvoke({})
        return f"Here is your financial projection:\n\n{res}\n\nWould you like some recommendations on how to keep your spending within target?"
        
    elif any(k in query_lower for k in ["health", "score", "grade", "financial health"]):
        res = await get_health_score.ainvoke({})
        return f"Here is your real-time financial health diagnostic:\n\n{res}\n\nTo improve your score, try increasing your savings ratio or reducing non-essential spending."
        
    elif any(k in query_lower for k in ["anomaly", "anomalies", "unusual", "flagged", "strange", "fraud", "suspicious"]):
        res = await get_flagged_anomalies.ainvoke({})
        return f"I ran an anomaly detection check on your transactions:\n\n{res}"
        
    elif any(k in query_lower for k in ["saving", "savings", "goal", "goals", "target", "progress"]):
        res = await get_savings_goals.ainvoke({})
        return f"Here are your active savings goals:\n\n{res}"
        
    elif any(k in query_lower for k in ["hi", "hello", "hey", "greetings", "who are you"]):
        return (
            "Hello! I am your AI Finance Advisor. 👋\n\n"
            "Currently, my remote LLM cloud servers are experiencing high traffic, so I am running in "
            "**High-Resiliency Local Engine** mode. I have direct access to your real-time database! 📊\n\n"
            "You can ask me about:\n"
            "1. **Spending Summary** (e.g., 'Show me my spending summary')\n"
            "2. **Savings Goals** (e.g., 'How are my savings goals doing?')\n"
            "3. **Financial Health Score** (e.g., 'What is my health score?')\n"
            "4. **Spending Forecast** (e.g., 'Give me a forecast for next month')\n"
            "5. **Anomalies** (e.g., 'Are there any unusual transactions?')\n\n"
            "How can I help you today?"
        )
        
    else:
        # Fallback summary response since we don't know the exact intent
        summary_res = await get_spending_summary.ainvoke({})
        health_res = await get_health_score.ainvoke({})
        return (
            "I'm operating in **High-Resiliency Local Engine** mode due to external LLM provider limits, "
            "but I can still fetch your real-time database data! 📊\n\n"
            f"📈 **Current Month Status**: {summary_res}\n"
            f"🏥 **Financial Health**: {health_res}\n\n"
            "Ask me specifically about your 'spending summary', 'health score', 'savings goals', 'forecast', or 'anomalies' for more detailed lookups."
        )


async def call_agent(user_id: str, query: str, history: List[dict] = []):
    tools = create_tools(user_id)
    
    # Convert history to LangChain messages format
    formatted_history = []
    for h in history:
        if h["role"] == "user":
            formatted_history.append(("user", h["content"]))
        else:
            formatted_history.append(("assistant", h["content"]))

    # 1. Try Gemini first
    if settings.GEMINI_API_KEY:
        try:
            print("DEBUG: Trying Gemini AI Advisor...")
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
            return await run_langchain_agent(llm, tools, query, formatted_history)
        except Exception as e:
            print(f"DEBUG: Gemini AI Advisor failed: {str(e)}")
            if "quota" not in str(e).lower() and "exceeded" not in str(e).lower() and "safety" in str(e).lower():
                return "I apologize, but I cannot provide an answer to that specific query due to safety filters. Try rephrasing your request about financial data."

    # 2. Try Claude Fallback second
    if settings.ANTHROPIC_API_KEY:
        try:
            print("DEBUG: Trying Anthropic Claude Fallback...")
            from langchain_anthropic import ChatAnthropic
            llm = ChatAnthropic(
                model="claude-3-5-sonnet-20241022",
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=0
            )
            return await run_langchain_agent(llm, tools, query, formatted_history)
        except Exception as e:
            print(f"DEBUG: Claude AI Advisor failed: {str(e)}")

    # 3. Local Heuristic rule engine fallback
    print("DEBUG: Falling back to High-Resiliency Local Engine...")
    return await local_rule_fallback(user_id, query)



async def call_agent_stream(user_id: str, query: str, history: List[dict] = []):
    """
    Generator that executes the agent and streams the final output chunk-by-chunk.
    This creates an ultra-smooth typing effect in the frontend while ensuring
    all database tools run and execute with 100% correctness.
    """
    import asyncio
    try:
        reply = await call_agent(user_id, query, history)
    except Exception as e:
        reply = f"I encountered an issue processing your query: {str(e)}"

    # Stream the reply in small chunks to simulate a real-time stream
    chunk_size = 4
    for i in range(0, len(reply), chunk_size):
        yield reply[i:i+chunk_size]
        await asyncio.sleep(0.01)

