import asyncio
import traceback
import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine, AsyncSessionLocal, Base, FALLBACK_MODE
from routers import (
    auth, expenses, budgets, dashboard, insights, forecast,
    chat, health_score, ml, savings, bank_accounts, net_worth,
    notifications, sync_simulator, tax
)
from routers import google_auth
from services.ml_metrics import evaluate_and_store_metrics
from services.retraining import retrain_model
from services.email_service import trigger_all_weekly_digests
from services.migration_service import run_alembic_migrations
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import settings

logger = logging.getLogger(__name__)

# ─── Rate Limiter ─────────────────────────────────────────────────────────────
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMITING_ENABLED = True
except ImportError:
    # slowapi not installed — rate limiting disabled gracefully
    limiter = None
    RATE_LIMITING_ENABLED = False
    logger.warning("slowapi not installed. Rate limiting is disabled. Run: pip install slowapi")

# ─── Scheduler ────────────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()


async def nightly_retrain_task():
    async with AsyncSessionLocal() as db:
        try:
            await retrain_model(db)
        except Exception as e:
            logger.error(f"Nightly retrain failed: {e}")


async def weekly_email_task():
    async with AsyncSessionLocal() as db:
        try:
            await trigger_all_weekly_digests(db)
        except Exception as e:
            logger.error(f"Weekly email task failed: {e}")


# Retrain at midnight every day
scheduler.add_job(nightly_retrain_task, 'cron', hour=0, minute=0)
# Weekly digest on Sunday at 9 PM
scheduler.add_job(weekly_email_task, 'cron', day_of_week='sun', hour=21, minute=0)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Finance Advisor API",
    description="Backend API for the AI-powered personal finance advisor (Elite Async Version)",
    version="1.2.0",
)

# Attach rate limiter to app state
if RATE_LIMITING_ENABLED:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Global Exception Handlers ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: log full traceback, return generic 500 (never expose internals)."""
    logger.error(f"UNHANDLED ERROR on {request.method} {request.url}:\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Convert ValueErrors to 400 Bad Request responses."""
    return JSONResponse(status_code=400, content={"detail": str(exc)})


# ─── Startup ──────────────────────────────────────────────────────────────────
async def background_startup():
    if not FALLBACK_MODE:
        await asyncio.to_thread(run_alembic_migrations)

    async with AsyncSessionLocal() as db:
        try:
            await evaluate_and_store_metrics(db)
        except Exception as e:
            logger.error(f"Initial metrics evaluation failed: {e}")


@app.on_event("startup")
async def startup_event():
    if FALLBACK_MODE:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Safe additive migrations — ADD COLUMN IF NOT EXISTS equivalent for SQLite
            # SQLite doesn't support IF NOT EXISTS for ALTER TABLE — catch DuplicateColumn errors
            new_columns = [
                "ALTER TABLE users ADD COLUMN full_name VARCHAR(200)",
                "ALTER TABLE users ADD COLUMN google_id VARCHAR(100)",
                "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(500)",
                "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email'",
            ]
            for sql in new_columns:
                try:
                    from sqlalchemy import text
                    await conn.execute(text(sql))
                except Exception:
                    pass  # Column already exists — safe to ignore
        logger.info("SQLite Fallback Initialized: finance.db")


    scheduler.start()
    asyncio.create_task(background_startup())


# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(google_auth.router)
app.include_router(expenses.router)
app.include_router(budgets.router)
app.include_router(dashboard.router)
app.include_router(insights.router)
app.include_router(forecast.router)
app.include_router(chat.router)
app.include_router(health_score.router)
app.include_router(ml.router)
app.include_router(savings.router)
app.include_router(bank_accounts.router)
app.include_router(net_worth.router)
app.include_router(notifications.router)
app.include_router(sync_simulator.router)
app.include_router(tax.router)


@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
async def root():
    return {"status": "ok", "message": "AI Finance Advisor Elite Async API v1.2"}
