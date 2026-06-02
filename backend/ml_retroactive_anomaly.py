import asyncio
import sys
sys.path.append(".")
from database import AsyncSessionLocal
from models.expense import Expense, CATEGORIES
from services.anomaly_detector import detect_anomaly
from sqlalchemy import select

async def run_retroactive_anomaly():
    print("Initializing retroactive anomaly detection...")
    async with AsyncSessionLocal() as db:
        # Fetch all expenses in database
        stmt = select(Expense).order_by(Expense.date.asc())
        result = await db.execute(stmt)
        expenses = result.scalars().all()
        print(f"Total expenses to process: {len(expenses)}")
        
        # Group by user to build profiles chronologically
        user_expenses = {}
        for e in expenses:
            if e.user_id not in user_expenses:
                user_expenses[e.user_id] = []
            user_expenses[e.user_id].append(e)
            
        anomalies_flagged = 0
        
        for user_id, txs in user_expenses.items():
            print(f"Processing {len(txs)} expenses for user {user_id}...")
            
            # Keep a rolling list of history to feed to anomaly detector
            history_rows = []
            
            for i, tx in enumerate(txs):
                # Build history DataFrame from rolling list
                import pandas as pd
                hist_df = None
                if len(history_rows) >= 15:
                    hist_df = pd.DataFrame([{
                        'amount': float(h.amount),
                        'category_idx': CATEGORIES.index(h.category) if h.category in CATEGORIES else len(CATEGORIES),
                        'day_of_week': h.date.weekday()
                    } for h in history_rows[-150:]]) # Limit to last 150
                
                # Check for anomaly
                is_anomaly = False
                score = 0.0
                explanation = ""
                
                if tx.transaction_type in ('debit', 'expense'):
                    if hist_df is not None:
                        is_anomaly, score, explanation = await detect_anomaly(
                            db, user_id, float(tx.amount), tx.category, str(tx.date), history_df=hist_df
                        )
                    elif float(tx.amount) > 10000: # Slightly lower default limit for mock seeding
                        is_anomaly = True
                        score = 0.9
                        explanation = "Large transaction flagged (insufficient history)"
                
                # Update transaction
                if is_anomaly:
                    tx.is_anomaly = True
                    tx.anomaly_score = score
                    tx.anomaly_explanation = explanation
                    anomalies_flagged += 1
                else:
                    tx.is_anomaly = False
                    tx.anomaly_score = score
                    tx.anomaly_explanation = ""
                
                # Append to history
                if tx.transaction_type in ('debit', 'expense'):
                    history_rows.append(tx)
            
        print(f"Commiting updates to database...")
        await db.commit()
        print(f"Success! Flagged {anomalies_flagged} retroactive anomalies.")

if __name__ == "__main__":
    asyncio.run(run_retroactive_anomaly())
