from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import auth, expenses, budgets, dashboard, insights, forecast, chat, health_score, ml, savings
from services.ml_metrics import evaluate_and_store_metrics
from services.retraining import retrain_model
from services.email_service import trigger_all_weekly_digests
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal

# Create all tables on startup
Base.metadata.create_all(bind=engine)

# Configure Scheduler
scheduler = BackgroundScheduler()

def nightly_retrain_task():
    db = SessionLocal()
    try:
        retrain_model(db)
    finally:
        db.close()

def weekly_email_task():
    db = SessionLocal()
    try:
        trigger_all_weekly_digests(db)
    finally:
        db.close()

# Run retraining at midnight every day
scheduler.add_job(nightly_retrain_task, 'cron', hour=0, minute=0)

# Run weekly digest on Sunday at 9 PM
scheduler.add_job(weekly_email_task, 'cron', day_of_week='sun', hour=21, minute=0)

scheduler.start()

app = FastAPI(
    title="AI Finance Advisor API",
    description="Backend API for the AI-powered personal finance advisor",
    version="1.0.0",
)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        evaluate_and_store_metrics(db)
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(expenses.router)
app.include_router(budgets.router)
app.include_router(dashboard.router)
app.include_router(insights.router)
app.include_router(forecast.router)
app.include_router(chat.router)
app.include_router(health_score.router)
app.include_router(ml.router)
app.include_router(savings.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "AI Finance Advisor API is running"}
