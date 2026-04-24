from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from models.bank_account import BankAccount, AccountStatement
from schemas.bank_account import BankAccountCreate, BankAccountUpdate
from typing import List, Optional
from services.net_worth_service import create_balance_snapshot

async def create_bank_account(db: AsyncSession, account_data: BankAccountCreate, user_id: str) -> BankAccount:
    db_account = BankAccount(
        **account_data.model_dump(),
        user_id=user_id
    )
    db.add(db_account)
    await db.commit()
    await db.refresh(db_account)
    await create_balance_snapshot(db, user_id, db_account.id, db_account.current_balance)
    return db_account

async def get_user_accounts(db: AsyncSession, user_id: str) -> List[BankAccount]:
    stmt = select(BankAccount).where(BankAccount.user_id == user_id, BankAccount.is_active == True)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_account_by_id(db: AsyncSession, account_id: int, user_id: str) -> Optional[BankAccount]:
    stmt = select(BankAccount).where(BankAccount.id == account_id, BankAccount.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def update_bank_account(db: AsyncSession, account_id: int, update_data: BankAccountUpdate, user_id: str) -> Optional[BankAccount]:
    account = await get_account_by_id(db, account_id, user_id)
    if not account:
        return None
    
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    
    await db.commit()
    await db.refresh(account)
    await create_balance_snapshot(db, user_id, account.id, account.current_balance)
    return account

async def delete_bank_account(db: AsyncSession, account_id: int, user_id: str) -> bool:
    account = await get_account_by_id(db, account_id, user_id)
    if not account:
        return False
    
    # Soft delete
    account.is_active = False
    await db.commit()
    return True
