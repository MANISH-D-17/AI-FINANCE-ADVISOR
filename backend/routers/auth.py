from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if auth_service.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = auth_service.register_user(db, data.email, data.password)
    token = auth_service.create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user_id=user.id, email=user.email)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth_service.create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user_id=user.id, email=user.email)
