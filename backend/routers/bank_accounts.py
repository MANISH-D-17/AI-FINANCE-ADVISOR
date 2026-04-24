from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.bank_account import BankAccountCreate, BankAccountResponse, BankAccountUpdate
from services import bank_account_service
from typing import List

router = APIRouter(prefix="/bank-accounts", tags=["Bank Accounts"])

@router.get("/", response_model=List[BankAccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active bank accounts for the current user."""
    return await bank_account_service.get_user_accounts(db, current_user.id)

@router.post("/", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account: BankAccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new bank account."""
    return await bank_account_service.create_bank_account(db, account, current_user.id)

@router.get("/{account_id}", response_model=BankAccountResponse)
async def get_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details for a specific bank account."""
    db_account = await bank_account_service.get_account_by_id(db, account_id, current_user.id)
    if not db_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return db_account

@router.patch("/{account_id}", response_model=BankAccountResponse)
async def update_account(
    account_id: int,
    account_update: BankAccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update bank account details."""
    db_account = await bank_account_service.update_bank_account(db, account_id, account_update, current_user.id)
    if not db_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return db_account

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a bank account."""
    success = await bank_account_service.delete_bank_account(db, account_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return None
