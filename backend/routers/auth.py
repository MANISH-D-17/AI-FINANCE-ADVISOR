from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


def _get_limiter():
    """Lazily import limiter from main app state — avoids circular imports."""
    try:
        from slowapi import Limiter
        from slowapi.util import get_remote_address
        return Limiter(key_func=get_remote_address)
    except ImportError:
        return None


# Shared limiter instance used by decorators
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    # Create a no-op decorator as fallback
    class _NoOpLimiter:
        def limit(self, *args, **kwargs):
            def decorator(f):
                return f
            return decorator
    limiter = _NoOpLimiter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if await auth_service.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await auth_service.register_user(db, data.email, data.password)
    token = auth_service.create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user_id=user.id, email=user.email)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await auth_service.authenticate_user(db, data.email, data.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = auth_service.create_access_token({"sub": user.id})
        return TokenResponse(access_token=token, user_id=user.id, email=user.email)
    except ValueError as e:
        # Google OAuth provider mismatch message
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        if "Connection refused" in str(e) or "Errno 61" in str(e):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection failed. Please ensure PostgreSQL is running.",
            )
        raise
