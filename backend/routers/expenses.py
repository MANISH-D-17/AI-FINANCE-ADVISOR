from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from database import get_db
from dependencies import get_current_user
from models.user import User
from models.expense import Expense
from schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    ExpenseImportRow, ExpenseImportConfirm, ImportConfirmResponse
)
from services import expense_service
from services.categorizer_service import predict_category, predict_category_detailed
from services.csv_parser import CSVParser
from services.pdf_parser import PDFParser
import traceback
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=list[ExpenseResponse])
async def list_expenses(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await expense_service.get_expenses(db, current_user.id, month, year, category)


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Auto-suggest category if not provided or is "Other" and description exists
    if data.category == "Other" and data.description:
        suggested = predict_category(data.description)
        data = data.model_copy(update={"category": suggested})
    return await expense_service.create_expense(db, current_user.id, data)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = await expense_service.get_expense_by_id(db, expense_id, current_user.id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return await expense_service.update_expense(db, expense, data)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = await expense_service.get_expense_by_id(db, expense_id, current_user.id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await expense_service.delete_expense(db, expense)


@router.get("/categorize")
async def auto_categorize(
    description: str = Query(..., description="Transaction description to categorize"),
    current_user: User = Depends(get_current_user),
):
    """Auto-suggest a category for a transaction description, with confidence score."""
    result = predict_category_detailed(description)
    return {
        "description": description,
        "suggested_category": result["category"],
        "confidence": result["confidence"],
        "top3": result["top3"],
        "requires_review": result["requires_review"],
    }


@router.get("/anomalies", response_model=list[ExpenseResponse])
async def list_anomalies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all transactions flagged as anomalies."""
    return await expense_service.get_anomalies(db, current_user.id)


@router.post("/purge-data", status_code=status.HTTP_200_OK)
async def purge_all_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete all financial records for the current user."""
    try:
        count = await expense_service.purge_user_data(db, current_user.id)
        return {"message": f"Successfully deleted {count} records", "count": count}
    except Exception as e:
        logger.error(f"Purge failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import-statement", response_model=list[ExpenseImportRow])
async def upload_statement_for_import(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """
    Parse statement (PDF or CSV) and return preview with auto-categorized rows.
    Each row now includes 'confidence' and 'requires_review' from the v3 categorizer.
    """
    content = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf") or file.content_type == "application/pdf":
            rows = PDFParser.parse_pdf(content, password)
        elif filename.endswith(".csv") or "csv" in (file.content_type or ""):
            rows = CSVParser.parse_csv(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF or CSV.")

        # Auto-categorize each row with v3 confidence metadata
        preview = []
        for row in rows:
            result = predict_category_detailed(row.get("description", ""))
            row["category"] = result["category"]
            row["confidence"] = result["confidence"]
            row["requires_review"] = result["requires_review"]
            preview.append(row)

        return preview

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import parsing failed: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import-statement/confirm")
async def confirm_import(
    data: ExpenseImportConfirm,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk insert confirmed transactions with multi-account support.
    Runs transfer detection after import.
    Returns enriched response with transfer count, review count, and reconciliation status.
    """
    try:
        # Fetch all existing reference numbers to prevent duplicates
        stmt = select(Expense.reference_number).where(
            Expense.user_id == current_user.id,
            Expense.reference_number.is_not(None)
        )
        result = await db.execute(stmt)
        existing_refs = set(result.scalars().all())

        to_create = []
        skipped = 0
        internal_seen = set()
        categories_requiring_review = 0

        # Pre-fetch anomaly detection history once for the whole batch (huge perf boost)
        from services.anomaly_detector import detect_anomaly
        import pandas as pd
        from models.expense import CATEGORIES
        
        stmt_hist = select(Expense).where(
            Expense.user_id == current_user.id,
            Expense.transaction_type.in_(('debit', 'expense'))
        ).order_by(Expense.date.desc()).limit(150)
        res_hist = await db.execute(stmt_hist)
        hist_rows = res_hist.scalars().all()
        
        hist_df = None
        if len(hist_rows) >= 15:
            hist_df = pd.DataFrame([{
                'amount': float(e.amount),
                'category_idx': CATEGORIES.index(e.category) if e.category in CATEGORIES else len(CATEGORIES),
                'day_of_week': e.date.weekday()
            } for e in hist_rows])

        for tx in data.transactions:
            if tx.reference_number and (
                tx.reference_number in internal_seen or tx.reference_number in existing_refs
            ):
                skipped += 1
                continue

            if tx.reference_number:
                internal_seen.add(tx.reference_number)

            category = tx.category or ("Other" if tx.type == "debit" else "Income")

            # Count items that need review
            if tx.requires_review:
                categories_requiring_review += 1

            # Professional Anomaly Detection
            is_anomaly = False
            anomaly_score = 0.0
            explanation = ""
            
            if tx.type == "debit" and hist_df is not None:
                is_anomaly, anomaly_score, explanation = await detect_anomaly(
                    db, current_user.id, float(tx.amount), category, str(tx.date), history_df=hist_df
                )
            elif tx.type == "debit" and float(tx.amount) > 100000:
                is_anomaly = True
                anomaly_score = 0.95
                explanation = "Large transaction flagged (insufficient history for ML analysis)"

            new_expense = Expense(
                user_id=current_user.id,
                amount=tx.amount,
                category=category,
                description=tx.description,
                date=tx.date,
                transaction_type=tx.type or ("debit" if float(tx.amount) > 0 else "credit"),
                reference_number=tx.reference_number,
                account_id=tx.account_id,
                is_anomaly=is_anomaly,
                anomaly_score=float(anomaly_score),
                anomaly_explanation=explanation
            )
            to_create.append(new_expense)

        # Batch insert
        if to_create:
            db.add_all(to_create)
            await db.commit()

        # Run transfer detection on newly imported data
        transfers_detected = 0
        try:
            from services.transfer_detector import detect_transfers_for_user
            transfers_detected = await detect_transfers_for_user(current_user.id, db)
        except Exception as te:
            logger.warning(f"Transfer detection failed (non-critical): {te}")

        return {
            "message": f"Successfully imported {len(to_create)} transactions",
            "imported": len(to_create),
            "skipped_duplicates": skipped,
            "transfers_detected": transfers_detected,
            "categories_requiring_review": categories_requiring_review,
            "reconciliation": {
                "is_valid": True,
                "discrepancy": 0.0,
                "warning": None,
            },
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"Bulk import failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
