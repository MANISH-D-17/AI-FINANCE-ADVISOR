"""
AI Savings Planner Service
Generates personalized investment and expense recommendations.
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional

from services.llm_router import call_llm_json

logger = logging.getLogger(__name__)


# ─── Indian Market Constants (update quarterly) ───────────────────────────
MARKET_DATA = {
    "fd_rates": {
        "SBI": {"1yr": 6.80, "2yr": 7.00, "3yr": 7.10},
        "HDFC": {"1yr": 7.10, "2yr": 7.25, "3yr": 7.40},
        "Bajaj_Finance": {"1yr": 7.40, "2yr": 7.95, "3yr": 8.05},
    },
    "gold_return_5yr_avg": 12.5,  # % CAGR
    "nifty50_return_10yr_avg": 12.0,
    "debt_fund_return_avg": 7.5,
    "ppf_rate": 7.1,
    "inflation_rate": 5.5,
    "emergency_fund_months": 6,
}

FUND_RECOMMENDATIONS = {
    "conservative": [
        {"name": "HDFC Balanced Advantage Fund", "type": "BAF", "return_3yr": 14.2, "risk": "Low-Medium"},
        {"name": "ICICI Pru Equity & Debt Fund", "type": "Hybrid", "return_3yr": 13.8, "risk": "Low-Medium"},
        {"name": "SBI Magnum Gilt Fund", "type": "Debt", "return_3yr": 7.1, "risk": "Low"},
    ],
    "moderate": [
        {"name": "Mirae Asset Large Cap Fund", "type": "Large Cap", "return_3yr": 16.1, "risk": "Medium"},
        {"name": "Parag Parikh Flexi Cap Fund", "type": "Flexi Cap", "return_3yr": 21.3, "risk": "Medium"},
        {"name": "Axis Bluechip Fund", "type": "Large Cap", "return_3yr": 15.4, "risk": "Medium"},
    ],
    "aggressive": [
        {"name": "Quant Small Cap Fund", "type": "Small Cap", "return_3yr": 38.2, "risk": "High"},
        {"name": "Nippon India Small Cap Fund", "type": "Small Cap", "return_3yr": 33.1, "risk": "High"},
        {"name": "Motilal Oswal Midcap Fund", "type": "Mid Cap", "return_3yr": 28.4, "risk": "High"},
    ],
}


def _determine_risk_profile(age: int, risk_tolerance: str) -> str:
    """Maps age + self-reported tolerance to actual investment risk profile."""
    risk_tolerance = risk_tolerance.lower()
    if age < 30 and risk_tolerance in ("high", "aggressive"):
        return "aggressive"
    elif age < 45 and risk_tolerance in ("moderate", "high"):
        return "moderate"
    else:
        return "conservative"


def _compute_rule_based_plan(
    income: float,
    expenses_by_category: Dict[str, float],
    goals: List[Dict],
    risk_tolerance: str,
    age: int,
    existing_investments: float,
    time_horizon_years: int,
) -> Dict:
    """
    Pure math allocation using 50-30-20 rule adapted for India.
    Used as: (a) fallback when LLM fails, (b) grounding data for LLM prompt.
    """
    total_expenses = sum(expenses_by_category.values())
    monthly_surplus = max(0.0, income - total_expenses)
    risk_profile = _determine_risk_profile(age, risk_tolerance)

    # Emergency fund check
    emergency_target = total_expenses * MARKET_DATA["emergency_fund_months"]
    emergency_monthly = min(monthly_surplus * 0.30, emergency_target / 12) if monthly_surplus > 0 else 0.0

    investable = max(0.0, monthly_surplus - emergency_monthly)

    # Allocation weights by risk profile
    weights = {
        "conservative": {"equity_mf": 0.30, "fd": 0.35, "gold": 0.10, "debt": 0.25},
        "moderate":     {"equity_mf": 0.50, "fd": 0.25, "gold": 0.10, "debt": 0.15},
        "aggressive":   {"equity_mf": 0.70, "fd": 0.10, "gold": 0.10, "debt": 0.10},
    }[risk_profile]

    recommended_funds = FUND_RECOMMENDATIONS[risk_profile]

    # Expense recommendations
    benchmarks = {
        "Food": income * 0.15,
        "Shopping": income * 0.10,
        "Entertainment": income * 0.05,
        "Travel": income * 0.08,
        "Bills": income * 0.12,
        "Health": income * 0.05,
    }

    expense_recs = []
    for cat, current in expenses_by_category.items():
        benchmark = benchmarks.get(cat, income * 0.10)
        pct_of_income = (current / income) * 100 if income > 0 else 0

        if current > benchmark * 1.2:
            action = "reduce"
            suggestion = benchmark
        elif current < benchmark * 0.5 and cat == "Health":
            action = "increase"
            suggestion = benchmark
        else:
            action = "maintain"
            suggestion = current

        expense_recs.append({
            "category": cat,
            "current": round(current, 2),
            "suggested": round(suggestion, 2),
            "potential_savings": round(max(0.0, current - suggestion), 2),
            "pct_of_income": round(pct_of_income, 1),
            "action": action,
        })

    # Financial health verdict
    savings_rate = (monthly_surplus / income * 100) if income > 0 else 0
    if savings_rate >= 20 and existing_investments >= income * 3:
        verdict = "on_track"
    elif savings_rate >= 10:
        verdict = "needs_attention"
    else:
        verdict = "critical"

    # Best FD recommendation
    best_fd = max(
        MARKET_DATA["fd_rates"].items(),
        key=lambda x: x[1]["3yr"]
    )

    return {
        "monthly_surplus": round(monthly_surplus, 2),
        "savings_rate_pct": round(savings_rate, 1),
        "risk_profile": risk_profile,
        "allocation": {
            "emergency_fund": {
                "monthly_contribution": round(emergency_monthly, 2),
                "target": round(emergency_target, 2),
                "months_to_build": (
                    round(emergency_target / emergency_monthly)
                    if emergency_monthly > 0 else 0
                ),
                "priority": "HIGH — Build this first before any investments",
            },
            "equity_mutual_funds": {
                "monthly_sip": round(investable * weights["equity_mf"], 2),
                "suggested_funds": recommended_funds,
                "rationale": (
                    f"Based on your {risk_profile} profile and "
                    f"{time_horizon_years}yr horizon."
                ),
            },
            "fixed_deposits": {
                "monthly_rd_or_lumpsum": round(investable * weights["fd"], 2),
                "recommended_bank": best_fd[0],
                "best_rate_3yr": best_fd[1]["3yr"],
                "rationale": "Capital protection with guaranteed returns.",
            },
            "gold": {
                "monthly": round(investable * weights["gold"], 2),
                "recommended_form": "Sovereign Gold Bond (SGB)" if investable > 5000 else "Digital Gold via Paytm/PhonePe",
                "rationale": "Inflation hedge. Target 5-10% of portfolio.",
            },
            "debt_funds": {
                "monthly": round(investable * weights["debt"], 2),
                "rationale": "Liquidity buffer with better-than-FD post-tax returns.",
            },
        },
        "expense_recommendations": expense_recs,
        "financial_health_verdict": verdict,
        "next_review_date": str(date.today() + timedelta(days=90)),
        "key_insights": [],
        "data_source": "rule_based",
    }


async def generate_savings_plan(
    income: float,
    expenses_by_category: Dict[str, float],
    goals: List[Dict],
    risk_tolerance: str = "moderate",
    age: int = 30,
    existing_investments: float = 0.0,
    time_horizon_years: int = 5,
) -> Dict:
    """
    Generate a comprehensive AI-powered savings plan.

    The rule-based engine computes concrete numbers first, then the LLM
    adds narrative insights, goal-specific advice, and behavioral nudges.
    This hybrid approach ensures: (1) math is always correct, (2) advice
    is always personalized.
    """
    # Step 1: Always compute rule-based plan (grounding data)
    rule_plan = _compute_rule_based_plan(
        income=income,
        expenses_by_category=expenses_by_category,
        goals=goals,
        risk_tolerance=risk_tolerance,
        age=age,
        existing_investments=existing_investments,
        time_horizon_years=time_horizon_years,
    )

    # Step 2: Enrich with LLM insights
    system_prompt = """You are an expert SEBI-registered financial advisor specializing in 
personal finance for Indian professionals. You combine deep knowledge of Indian tax law 
(80C, 80D, NPS Section 80CCD), mutual funds, SGB, real estate, and behavioral finance.

Your role: Take computed financial data and generate:
1. Personalized key insights (3-5 actionable bullet points)
2. Goal-specific strategies with timelines
3. Tax optimization tips (80C/80D/NPS)
4. Behavioral nudges (common mistakes to avoid)
5. Early warning signals to watch for

Always use Indian context: ₹ currency, Indian fund names, SEBI regulations.
Be specific, not generic. Reference the actual numbers provided.
Return ONLY valid JSON."""

    user_message = f"""Generate enriched financial insights for this user profile:

AGE: {age} years
MONTHLY INCOME: ₹{income:,.0f}
RISK TOLERANCE: {risk_tolerance}
TIME HORIZON: {time_horizon_years} years
EXISTING INVESTMENTS: ₹{existing_investments:,.0f}

MONTHLY EXPENSES:
{json.dumps(expenses_by_category, indent=2)}

FINANCIAL GOALS:
{json.dumps(goals, indent=2)}

COMPUTED PLAN (math already verified — do NOT change numbers):
- Monthly surplus: ₹{rule_plan['monthly_surplus']:,.0f}
- Savings rate: {rule_plan['savings_rate_pct']}%
- Risk profile: {rule_plan['risk_profile']}
- Verdict: {rule_plan['financial_health_verdict']}

Equity SIP suggested: ₹{rule_plan['allocation']['equity_mutual_funds']['monthly_sip']:,.0f}/month
FD allocation: ₹{rule_plan['allocation']['fixed_deposits']['monthly_rd_or_lumpsum']:,.0f}/month  Generate ONLY this JSON structure:
{
  "key_insights": [
    "insight 1 — specific to their numbers",
    "insight 2",
    "insight 3"
  ],
  "goal_strategies": [
    {
      "goal": "goal name from input",
      "monthly_required": 0,
      "recommended_instrument": "specific fund/FD/etc",
      "timeline_achievable": true,
      "tip": "specific advice"
    }
  ],
  "tax_optimization": {
    "section_80c_headroom": 0,
    "recommended_instruments": [],
    "potential_tax_saving": 0,
    "tip": "specific tip"
  },
  "behavioral_nudges": ["nudge 1", "nudge 2"],
  "early_warnings": ["warning if any"],
  "executive_advisory": {
    "title": "Senior Advisor Strategic Assessment",
    "greeting": "Dear Client,",
    "analysis": "A sophisticated, empathetic advisory analysis of their situation. If critical, detail exactly why their savings rate is at a critical level and what risks it presents. Speak in the tone of a wise, highly experienced partner.",
    "actionable_steps": [
      "Detail exactly which expense category should be decreased (naming them specifically based on their input) and by how much to create surplus.",
      "Explain how they can invest that newly freed surplus to achieve their specific milestones (naming the milestones from goals input) in the given timeline."
    ],
    "conclusion": "A highly motivating, reassuring financial wisdom quote or directive."
  }
}"""

    try:
        llm_enrichment = await call_llm_json(system_prompt, user_message, max_tokens=3000)

        # Merge LLM enrichment into rule-based plan
        rule_plan["key_insights"] = llm_enrichment.get("key_insights", [])
        rule_plan["goal_strategies"] = llm_enrichment.get("goal_strategies", [])
        rule_plan["tax_optimization"] = llm_enrichment.get("tax_optimization", {})
        rule_plan["behavioral_nudges"] = llm_enrichment.get("behavioral_nudges", [])
        rule_plan["early_warnings"] = llm_enrichment.get("early_warnings", [])
        rule_plan["executive_advisory"] = llm_enrichment.get("executive_advisory", {})
        rule_plan["data_source"] = "ai_enhanced"

    except Exception as e:
        logger.warning(f"LLM enrichment failed, returning rule-based plan: {e}")
        rule_plan["key_insights"] = [
            f"Your savings rate of {rule_plan['savings_rate_pct']}% is "
            + ("excellent — above the recommended 20%!" if rule_plan['savings_rate_pct'] >= 20
               else "below the recommended 20%. Focus on reducing variable expenses."),
            "Emergency fund should cover 6 months of expenses before any investment.",
            "Start SIP immediately — time in market beats timing the market.",
        ]
        
        # Build logical fallback for executive advisory
        leaks = [rec for rec in rule_plan.get("expense_recommendations", []) if rec["action"] == "reduce"]
        leak_str = ", ".join([f"{rec['category']} (saving ₹{rec['potential_savings']:,.0f})" for rec in leaks[:2]])
        action_step_1 = f"Immediately decrease spending leaks in: {leak_str}." if leaks else "Review all variable categories to identify structural leaks."
        
        goals_list = [g["name"] for g in goals]
        goals_str = ", ".join(goals_list) if goals_list else "your wealth milestones"
        action_step_2 = f"Redirect all recovered cash flow towards SIPs/FDs to secure {goals_str} over the {time_horizon_years}-year window."

        rule_plan["executive_advisory"] = {
            "title": "Senior Advisor Strategic Assessment",
            "greeting": "Dear Client,",
            "analysis": f"Your current savings rate is {rule_plan['savings_rate_pct']}%, which puts your account in a {rule_plan['financial_health_verdict']} category. Let's work together to realign your capital allocation, reduce variable leaks, and secure your financial future.",
            "actionable_steps": [action_step_1, action_step_2],
            "conclusion": "A disciplined financial strategy is a marathon, not a sprint. Take these steps today to stabilize your wealth trajectory."
        }
        rule_plan["data_source"] = "rule_based_fallback"

    return rule_plan
