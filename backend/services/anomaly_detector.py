from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from models.expense import Expense, CATEGORIES
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

async def detect_anomaly(db: AsyncSession, user_id: str, amount: float, category: str, date_str: str) -> tuple[bool, float, str]:
    """
    Advanced Anomaly Detection using Isolation Forest + Statistical Guardrails.
    Returns (is_anomaly, score, explanation)
    """
    try:
        # 1. Fetch History (Last 150 transactions for better context)
        # Using a larger window for "Global" norm
        stmt = select(Expense).where(
            Expense.user_id == user_id,
            Expense.transaction_type.in_(('debit', 'expense'))
        ).order_by(desc(Expense.date)).limit(150)
        
        result = await db.execute(stmt)
        history = result.scalars().all()

        if len(history) < 15:
            # Insufficient data for ML
            return False, 0.0, "Building spending profile..."

        # 2. Feature Engineering
        data = []
        for e in history:
            data.append({
                'amount': float(e.amount),
                'category_idx': CATEGORIES.index(e.category) if e.category in CATEGORIES else len(CATEGORIES),
                'day_of_week': e.date.weekday()
            })
        
        df = pd.DataFrame(data)
        
        # Current point
        try:
            curr_date = datetime.strptime(str(date_str), "%Y-%m-%d")
        except:
            curr_date = datetime.now()
            
        new_point = pd.DataFrame([{
            'amount': float(amount),
            'category_idx': CATEGORIES.index(category) if category in CATEGORIES else len(CATEGORIES),
            'day_of_week': curr_date.weekday()
        }])

        # 3. Isolation Forest Analysis
        # n_estimators increased for stability
        model = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
        model.fit(df)
        
        pred = model.predict(new_point)[0] # -1 for anomaly, 1 for normal
        raw_score = model.decision_function(new_point)[0] # Higher is more normal

        # 4. Statistical Reasoning (Explainability)
        is_anomaly = False
        explanation = ""
        
        # Category-Specific Context
        cat_data = df[df['category_idx'] == new_point.iloc[0]['category_idx']]
        if not cat_data.empty:
            cat_avg = cat_data['amount'].mean()
            cat_std = cat_data['amount'].std()
            
            # Anomaly if pred is -1 OR if > 2.5 STDs away from category mean
            if pred == -1:
                is_anomaly = True
                if float(amount) > cat_avg * 2:
                    explanation = f"Spending ₹{amount:.0f} in {category} is {float(amount)/cat_avg:.1f}x higher than your usual average."
                else:
                    explanation = f"Unusual pattern detected for {category} on this day of week."
            elif float(amount) > (cat_avg + 2.5 * cat_std) and len(cat_data) > 5:
                is_anomaly = True
                explanation = f"Spike detected: This is significantly higher than your typical {category} spend."

        # Global context if no category context
        elif pred == -1:
            is_anomaly = True
            explanation = "Transaction deviates from your overall spending habits."

        return is_anomaly, float(raw_score), explanation

    except Exception as e:
        import traceback
        print(f"Anomaly Detection Error: {e}")
        traceback.print_exc()
        return False, 0.0, ""
