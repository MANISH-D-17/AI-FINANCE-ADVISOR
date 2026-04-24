import logging
from alembic.config import Config
from alembic import command
import os

logger = logging.getLogger(__name__)

def run_alembic_migrations():
    """Programmatically run Alembic migrations on startup."""
    try:
        # Get the absolute path to the backend directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ini_path = os.path.join(base_dir, "alembic.ini")
        
        # Load the Alembic configuration
        alembic_cfg = Config(ini_path)
        
        # Point to the migrations directory
        alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "migrations"))
        
        logger.info("🚀 Running database migrations...")
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Database migrations complete.")
        return True
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False
