from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, AsyncSessionLocal
from models.expense import Expense
from models.bank_account import BankAccount
from datetime import date, timedelta
import random
from typing import Dict
from sqlalchemy import select

router = APIRouter(prefix="/simulator", tags=["simulator"])

VENDORS = {
    "Food": ["Swiggy", "Zomato", "Starbucks", "McDonalds", "Whole Foods"],
    "Shopping": ["Amazon", "Flipkart", "Zara", "Apple Store", "H&M"],
    "Travel": ["Uber", "Ola", "Indigo", "MakeMyTrip", "Airbnb"],
    "Bills": ["Airtel", "Jio", "BESCOM", "Netflix", "Spotify"],
    "Entertainment": ["PVR Cinemas", "BookMyShow", "Steam Games", "Nintendo"],
    "Health": ["Apollo Pharmacy", "Cult.fit", "Pharmeasy", "General Hospital"],
    "Investments": ["Zerodha", "Groww", "HDFC Mutual Fund", "Coinbase"],
    "Income": ["HDFC Bank Salary", "Upwork Payout", "Freelance Project", "Dividend Credit"]
}

async def generate_simulated_data(user_id: str):
    """Generates 50 realistic transactions for the last 30 days in a background task."""
    async with AsyncSessionLocal() as db:
        today = date.today()
        
        # Ensure at least one bank account exists
        stmt = select(BankAccount).where(BankAccount.user_id == user_id)
        result = await db.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            # Create a mock account if none exists
            account = BankAccount(
                user_id=user_id,
                account_name="Simulated HDFC Savings",
                bank_name="HDFC",
                account_number_last4="SIM1",
                account_type="savings",
                current_balance=250000.0
            )
            db.add(account)
        else:
            # Refresh balance for existing mock accounts to ensure non-zero net worth
            account.current_balance = 250000.0
            
        await db.commit()
        await db.refresh(account)

        for _ in range(50):
            cat = random.choice(list(VENDORS.keys()))
            merchant = random.choice(VENDORS[cat])
            amount = random.uniform(100, 5000) if cat != "Income" else random.uniform(20000, 80000)
            
            # Random date in last 30 days
            tx_date = today - timedelta(days=random.randint(0, 30))
            
            expense = Expense(
                user_id=user_id,
                account_id=account.id,
                date=tx_date,
                description=f"SIMULATED: {merchant}",
                amount=round(amount, 2),
                category=cat,
                merchant=merchant,
                reference_number=f"SIM-{random.randint(100000, 999999)}",
                is_verified=True,
                transaction_type='credit' if cat == 'Income' else 'debit'
            )
            db.add(expense)
        
        await db.commit()

from dependencies import get_current_user
from models.user import User

@router.post("/run")
async def run_simulation(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Triggers the background task to populate the DB with simulated transactions."""
    background_tasks.add_task(generate_simulated_data, str(current_user.id))
    return {"message": "Sync simulation started. Dashboards will update shortly.", "transactions_count": 50}
