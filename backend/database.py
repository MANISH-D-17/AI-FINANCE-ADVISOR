import os
import logging
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from config import settings
import socket

logger = logging.getLogger(__name__)

# Fallback Flag (True if using SQLite, False for PostgreSQL)
FALLBACK_MODE = False
PROD_MIGRATION_REQUIRED = False

def check_postgres_port(host, port):
    """Wait for a port to be open on a given host."""
    try:
        with socket.create_connection((host, port), timeout=1):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

# Database URL Preparation
DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Check if PostgreSQL is available
# Extract host and port from URL
import re
match = re.search(r"@([^:/]+):?(\d*)", DATABASE_URL)
if match:
    db_host = match.group(1)
    db_port = int(match.group(2)) if match.group(2) else 5432
    
    if not check_postgres_port(db_host, db_port):
        logger.warning(f"⚠️ PostgreSQL not found at {db_host}:{db_port}. Switching to Local SQLite Fallback.")
        DATABASE_URL = "sqlite+aiosqlite:///./finance.db"
        FALLBACK_MODE = True

try:
    # SQLite specific args
    engine_kwargs = {
        "pool_pre_ping": True,
        "echo": False
    }
    
    if not FALLBACK_MODE:
        engine_kwargs.update({
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_recycle": 3600
        })
    else:
        # SQLite doesn't support some postgres pool args
        pass

    engine = create_async_engine(DATABASE_URL, **engine_kwargs)
    
except Exception as e:
    logger.error(f"Failed to create async engine with URL {DATABASE_URL}: {e}")
    # Final desperate fallback
    DATABASE_URL = "sqlite+aiosqlite:///./finance.db"
    FALLBACK_MODE = True
    engine = create_async_engine(DATABASE_URL)

AsyncSessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine, 
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        except Exception as e:
            logger.error(f"Database operation error: {e}")
            raise
