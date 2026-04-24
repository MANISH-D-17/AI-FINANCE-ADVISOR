"""
Transfer Detector Service

Problem: User has HDFC + SBI accounts.
  - HDFC statement shows: Debit ₹10,000 "SELF TRANSFER TO SBI"
  - SBI statement shows:  Credit ₹10,000 "RECEIVED FROM HDFC"
  - Dashboard currently counts BOTH — total expenses inflated by ₹10,000

Fix: Detect matched debit/credit pairs across accounts and mark both as is_transfer=True.
Transfers are excluded from expense totals, category breakdowns, health score, and forecast.
"""

import logging
from datetime import date, timedelta
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.expense import Expense

logger = logging.getLogger(__name__)

# Keywords that force is_transfer=True regardless of pair matching
TRANSFER_KEYWORDS = [
    "SELF TRANSFER", "OWN ACCOUNT", "SWEEP TO", "FD CREATION",
    "RD INSTALLMENT", "PPF CONTRIBUTION", "NPS TIER", "NPS CONTRIBUTION",
    "INTERNAL TRANSFER", "FUND TRANSFER OWN", "PAYTM WALLET TOPUP",
    "MOBIKWIK WALLET", "PHONEPE SELF", "CREDIT CARD BILL PAYMENT",
    "CRED PAYMENT", "NEFT TO SELF", "IMPS SELF",
]

# ₹ tolerance for amount matching (handles rounding in different bank statements)
AMOUNT_TOLERANCE = 5.0
# Days tolerance for date matching (settlement delays)
DATE_TOLERANCE_DAYS = 3


def _description_is_transfer(description: str) -> bool:
    """Check if a transaction description matches known transfer keywords."""
    if not description:
        return False
    desc_upper = description.upper()
    return any(kw in desc_upper for kw in TRANSFER_KEYWORDS)


async def detect_transfers_for_user(user_id: str, db: AsyncSession) -> int:
    """
    Detect and mark inter-account transfers for a user.

    Algorithm:
    1. Fetch all debit transactions (last 90 days) grouped by account
    2. Fetch all credit transactions (last 90 days) grouped by account
    3. For each debit D in account A:
       - Search credits C in all OTHER accounts where:
         a. abs(C.amount - D.amount) <= ₹5 tolerance
         b. abs((C.date - D.date).days) <= 3 days
         c. C.account_id != D.account_id
       - If match found: mark both is_transfer=True, link transfer_pair_id
    4. Also mark by keyword regardless of pair matching

    Returns: count of transfer transactions marked
    """
    cutoff = date.today() - timedelta(days=90)
    marked_count = 0

    try:
        # Fetch all recent transactions for this user
        stmt = select(Expense).where(
            Expense.user_id == user_id,
            Expense.date >= cutoff,
            Expense.is_transfer == False,  # Only process unmarked transactions
        )
        result = await db.execute(stmt)
        all_txs = result.scalars().all()

        # Step 1: Keyword-based transfer detection (fast, high confidence)
        keyword_marked = []
        for tx in all_txs:
            if _description_is_transfer(tx.description or ""):
                tx.is_transfer = True
                marked_count += 1
                keyword_marked.append(tx.id)

        # Step 2: Cross-account pair matching
        debits = [tx for tx in all_txs if tx.transaction_type in ("debit", "expense") and tx.account_id is not None and tx.id not in keyword_marked]
        credits = [tx for tx in all_txs if tx.transaction_type == "credit" and tx.account_id is not None and tx.id not in keyword_marked]

        matched_ids = set()

        for debit in debits:
            if debit.id in matched_ids:
                continue

            for credit in credits:
                if credit.id in matched_ids:
                    continue

                # Condition: different account
                if credit.account_id == debit.account_id:
                    continue

                # Condition: amount within tolerance
                if abs(float(credit.amount) - float(debit.amount)) > AMOUNT_TOLERANCE:
                    continue

                # Condition: date within tolerance
                date_diff = abs((credit.date - debit.date).days)
                if date_diff > DATE_TOLERANCE_DAYS:
                    continue

                # Match found — mark both as transfers and link them
                debit.is_transfer = True
                debit.transfer_pair_id = str(credit.id)
                credit.is_transfer = True
                credit.transfer_pair_id = str(debit.id)

                matched_ids.add(debit.id)
                matched_ids.add(credit.id)
                marked_count += 2
                logger.info(
                    f"Transfer pair detected: ₹{debit.amount} on {debit.date} "
                    f"[Account {debit.account_id}] ↔ [Account {credit.account_id}]"
                )
                break  # Only match one credit per debit

        if marked_count > 0:
            await db.commit()
            logger.info(f"Transfer detection complete: {marked_count} transactions marked for user {user_id}")

        return marked_count

    except Exception as e:
        logger.error(f"Transfer detection failed for user {user_id}: {e}")
        await db.rollback()
        return 0


async def detect_credit_card_payments(user_id: str, db: AsyncSession) -> int:
    """
    Mark credit card bill payments as transfers to prevent double-counting.

    Rule: If user has BOTH a credit card account AND a savings account in the system,
    mark "CREDIT CARD BILL PAYMENT" rows in the savings account as is_transfer=True.
    The credit card statement already has the real itemized expenses.

    If user only has savings account (no CC account in DB), keep as expense — cannot double-count.
    """
    from models.bank_account import BankAccount

    try:
        # Check if user has credit card accounts
        stmt = select(BankAccount).where(
            BankAccount.user_id == user_id,
            BankAccount.is_active == True,
            BankAccount.account_type.in_(["credit_card", "credit card", "Credit Card"]),
        )
        result = await db.execute(stmt)
        cc_accounts = result.scalars().all()

        if not cc_accounts:
            # No credit card account in DB — keep payment rows as expenses
            return 0

        cc_account_ids = {a.id for a in cc_accounts}

        # Find CC bill payments in non-CC accounts
        CREDIT_CARD_KEYWORDS = ["CREDIT CARD BILL", "CC BILL PAYMENT", "CRED BILL", "AMEX PAYMENT", "HDFC CC BILL"]

        stmt = select(Expense).where(
            Expense.user_id == user_id,
            Expense.is_transfer == False,
        )
        result = await db.execute(stmt)
        all_txs = result.scalars().all()

        marked = 0
        for tx in all_txs:
            if tx.account_id in cc_account_ids:
                continue  # Skip transactions within CC accounts themselves
            desc = (tx.description or "").upper()
            if any(kw in desc for kw in CREDIT_CARD_KEYWORDS):
                tx.is_transfer = True
                marked += 1

        if marked > 0:
            await db.commit()

        return marked

    except Exception as e:
        logger.error(f"CC payment detection failed: {e}")
        await db.rollback()
        return 0
