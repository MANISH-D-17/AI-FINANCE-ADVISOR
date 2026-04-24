"""
Google OAuth Router — Stateless JWT-based flow (no session middleware required).

Flow:
  Option A — Server redirect (browser-initiated):
    1. GET /auth/google/login        → redirect to Google consent screen
    2. GET /auth/google/callback     → exchange code → issue JWT → redirect to frontend

  Option B — Frontend-initiated (used by @react-oauth/google library):
    1. Frontend calls useGoogleLogin() → gets access_token from Google directly
    2. POST /auth/google/token        → verify token → issue our JWT → return JSON

GET /auth/me  → return current user profile (name, picture, auth_provider)
"""

import os
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from services.auth_service import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Google OAuth"])

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class GoogleTokenRequest(BaseModel):
    access_token: str  # Google access_token from frontend @react-oauth/google


async def _get_google_userinfo(access_token: str) -> dict:
    """Fetch user profile from Google using an access token."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            if response.status_code != 200:
                print(f"DEBUG: Google UserInfo error: {response.status_code} - {response.text}")
                logger.error(f"Google UserInfo error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=401, detail=f"Invalid Google access token: {response.text}")
            
            userinfo = response.json()
            print(f"DEBUG: Successfully fetched UserInfo for sub={userinfo.get('sub')}")
            return userinfo
        except HTTPException:
            raise
        except Exception as e:
            print(f"DEBUG: Error fetching Google UserInfo: {str(e)}")
            logger.error(f"Failed to fetch userinfo from Google: {str(e)}")
            raise HTTPException(status_code=503, detail="Could not reach Google authentication services")


async def _find_or_create_user(db: AsyncSession, userinfo: dict) -> tuple:
    """
    Find existing user by Google ID or email, or create new OAuth user.
    Returns (user, is_new_user).
    """
    email = userinfo.get("email")
    google_id = userinfo.get("sub")
    name = userinfo.get("name", "")
    picture = userinfo.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email address")

    # Try to find by google_id first (most accurate)
    if google_id:
        stmt = select(User).where(User.google_id == google_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            # Update picture in case it changed
            user.profile_picture = picture
            user.full_name = name or user.full_name
            await db.commit()
            return user, False

    # Fall back to finding by email
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        # Link existing email account to Google
        user.google_id = google_id
        user.profile_picture = picture
        user.auth_provider = "google"
        user.full_name = name or user.full_name
        await db.commit()
        await db.refresh(user)
        return user, False

    # Create new user
    new_user = User(
        email=email,
        full_name=name,
        google_id=google_id,
        profile_picture=picture,
        auth_provider="google",
        password_hash=None,  # OAuth users have no password
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user, True


# ─── Option A: Server-redirect OAuth flow ────────────────────────────────────

@router.get("/google/login", tags=["Google OAuth"])
async def google_login():
    """Redirect browser to Google consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on this server")

    from urllib.parse import urlencode
    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback", tags=["Google OAuth"])
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """
    Handle redirect from Google. Exchange auth code for tokens, issue JWT
    and redirect user to the frontend with token in query param.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    # Exchange code for access_token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=10.0,
        )
        if token_response.status_code != 200:
            logger.error(f"Google token exchange failed: {token_response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange Google authorization code")

        token_data = token_response.json()
        access_token = token_data.get("access_token")

    userinfo = await _get_google_userinfo(access_token)
    user, is_new = await _find_or_create_user(db, userinfo)

    jwt_token = create_access_token(data={"sub": str(user.id)})

    frontend_url = settings.FRONTEND_URL
    redirect_url = f"{frontend_url}/auth/callback?token={jwt_token}&is_new={str(is_new).lower()}"
    return RedirectResponse(url=redirect_url)


# ─── Option B: Frontend-initiated OAuth flow (@react-oauth/google) ────────────

@router.post("/google/token", tags=["Google OAuth"])
async def google_token_exchange(
    data: GoogleTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Frontend provides a Google access_token obtained directly via the
    @react-oauth/google library. We verify it, find/create the user,
    and return our own JWT.
    """
    print(f"DEBUG: Received Google token exchange request for token[:10]={data.access_token[:10]}...")
    try:
        userinfo = await _get_google_userinfo(data.access_token)
        user, is_new = await _find_or_create_user(db, userinfo)
        print(f"DEBUG: User found/created: {user.email}, is_new={is_new}")

        jwt_token = create_access_token(data={"sub": str(user.id)})

        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "profile_picture": user.profile_picture,
            "is_new_user": is_new,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during Google token exchange: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ─── /auth/me — return current user profile ───────────────────────────────────

@router.get("/me", tags=["Auth"])
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "profile_picture": current_user.profile_picture,
        "auth_provider": current_user.auth_provider,
        "income": current_user.income,
    }
