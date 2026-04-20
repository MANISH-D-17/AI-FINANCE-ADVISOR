"""
Seed script: Creates a demo user and 5 synthetic expense records.
Run with: python seed.py
"""
import sys
import uuid
from datetime import date, timedelta
from database import SessionLocal, Base, engine
from models.user import User
from models.expense import Expense
from models.budget import Budget
from services.auth_service import hash_password

Base.metadata.create_all(bind=engine)

DEMO_EMAIL = "demo@financeadvisor.com"
DEMO_PASSWORD = "Demo@1234"

SEED_EXPENSES = [
    {"amount": 650.00, "category": "Food", "description": "Swiggy dinner order", "days_ago": 2},
    {"amount": 1500.00, "category": "Bills", "description": "Electricity bill", "days_ago": 5},
    {"amount": 2200.00, "category": "Shopping", "description": "Amazon purchase - headphones", "days_ago": 8},
    {"amount": 800.00, "category": "Travel", "description": "Ola cab to airport", "days_ago": 11},
    {"amount": 499.00, "category": "Entertainment", "description": "Netflix subscription", "days_ago": 14},
    {"amount": 350.00, "category": "Health", "description": "Pharmacy - medicines", "days_ago": 17},
    {"amount": 1200.00, "category": "Food", "description": "Zomato weekend brunch", "days_ago": 20},
    {"amount": 600.00, "category": "Shopping", "description": "Flipkart order", "days_ago": 25},
]

SEED_BUDGETS = [
    {"category": "Food", "monthly_limit": 3000},
    {"category": "Shopping", "monthly_limit": 5000},
    {"category": "Bills", "monthly_limit": 2500},
    {"category": "Travel", "monthly_limit": 2000},
    {"category": "Entertainment", "monthly_limit": 1500},
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing:
            print(f"Demo user already exists: {DEMO_EMAIL}")
            return

        user = User(
            id=str(uuid.uuid4()),
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            income="50000",
        )
        db.add(user)
        db.flush()

        today = date.today()
        for e in SEED_EXPENSES:
            expense = Expense(
                id=str(uuid.uuid4()),
                user_id=user.id,
                amount=e["amount"],
                category=e["category"],
                description=e["description"],
                date=today - timedelta(days=e["days_ago"]),
            )
            db.add(expense)

        for b in SEED_BUDGETS:
            budget = Budget(
                id=str(uuid.uuid4()),
                user_id=user.id,
                category=b["category"],
                monthly_limit=b["monthly_limit"],
            )
            db.add(budget)

        db.commit()
        print("✅ Seed complete!")
        print(f"   Demo user email   : {DEMO_EMAIL}")
        print(f"   Demo user password: {DEMO_PASSWORD}")
        print(f"   Created {len(SEED_EXPENSES)} expenses and {len(SEED_BUDGETS)} budgets")

    except Exception as ex:
        db.rollback()
        print(f"❌ Seed failed: {ex}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
