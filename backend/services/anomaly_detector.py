import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from models.expense import Expense, CATEGORIES
from datetime import datetime, timedelta

def detect_anomaly(db: Session, user_id: str, amount: float, category: str, date_str: str):
    """
    Detect if a new expense is an anomaly based on historical spending.
    Returns (is_anomaly, score)
    """
    try:
        # Load last 100 expenses or last 90 days
        cutoff = datetime.now() - timedelta(days=90)
        history = db.query(Expense).filter(
            Expense.user_id == user_id,
            Expense.date >= cutoff
        ).order_by(Expense.date.desc()).limit(100).all()

        if len(history) < 10:
            # Not enough data to train Isolation Forest
            return False, 0.0

        # Prepare features
        data = []
        for e in history:
            data.append({
                'amount': float(e.amount),
                'category_idx': CATEGORIES.index(e.category) if e.category in CATEGORIES else len(CATEGORIES),
                'day_of_week': e.date.weekday()
            })
        
        df = pd.DataFrame(data)
        
        # New point
        try:
            current_date = datetime.strptime(str(date_str), "%Y-%m-%d")
        except:
            current_date = datetime.now()
            
        new_point = pd.DataFrame([{
            'amount': float(amount),
            'category_idx': CATEGORIES.index(category) if category in CATEGORIES else len(CATEGORIES),
            'day_of_week': current_date.weekday()
        }])

        # Train Isolation Forest
        # contamination='auto' or small value like 0.05
        model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        model.fit(df)
        
        # Predict (-1 for outlier, 1 for inlier)
        pred = model.predict(new_point)[0]
        score = model.decision_function(new_point)[0] # Higher score = more normal; lower/negative = more anomalous

        is_anomaly = (pred == -1)
        
        # Calculate a simple multiplier explanation if it's an anomaly in its category
        cat_avg = df[df['category_idx'] == new_point['category_idx'][0]]['amount'].mean()
        if is_anomaly and not np.isnan(cat_avg) and cat_avg > 0:
            multiplier = float(amount) / cat_avg
            if multiplier > 2:
                # Significant anomaly within category
                return True, float(score)

        return is_anomaly, float(score)

    except Exception as e:
        print(f"Error in anomaly detection: {e}")
        return False, 0.0
