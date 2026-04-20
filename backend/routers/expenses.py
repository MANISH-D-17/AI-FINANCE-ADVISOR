from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from dependencies import get_current_user
from models.user import User
from models.expense import Expense
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseImportRow, ExpenseImportConfirm
from services import expense_service
from services.categorizer_service import predict_category
from services.csv_parser import CSVParser

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return expense_service.get_expenses(db, current_user.id, month, year, category)


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Auto-suggest category if not provided or is "Other" and description exists
    if data.category == "Other" and data.description:
        suggested = predict_category(data.description)
        data = data.model_copy(update={"category": suggested})
    return expense_service.create_expense(db, current_user.id, data)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = expense_service.get_expense_by_id(db, expense_id, current_user.id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense_service.update_expense(db, expense, data)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = expense_service.get_expense_by_id(db, expense_id, current_user.id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense_service.delete_expense(db, expense)


@router.post("/categorize")
def auto_categorize(
    description: str = Query(..., description="Transaction description to categorize"),
    current_user: User = Depends(get_current_user),
):
    """Auto-suggest a category for a transaction description."""
    suggested = predict_category(description)
    return {"description": description, "suggested_category": suggested}


@router.get("/anomalies", response_model=list[ExpenseResponse])
def list_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all transactions flagged as anomalies."""
    return expense_service.get_anomalies(db, current_user.id)


from fastapi import Form
from services.pdf_parser import PDFParser

@router.post("/purge-data", status_code=status.HTTP_200_OK)
def purge_all_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete all financial records for the current user."""
    try:
        count = expense_service.purge_user_data(db, current_user.id)
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
    """Parse statement (PDF or CSV) and return preview with auto-categorized rows."""
    content = await file.read()
    filename = file.filename.lower()
    
    try:
        if filename.endswith(".pdf") or file.content_type == "application/pdf":
            rows = PDFParser.parse_pdf(content, password)
        elif filename.endswith(".csv") or "csv" in file.content_type:
            rows = CSVParser.parse_csv(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF or CSV.")
            
        # Auto-categorize each row
        preview = []
        for row in rows:
            suggested = predict_category(row['description'])
            row['category'] = suggested
            preview.append(row)
        return preview
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


import traceback
import logging

logger = logging.getLogger(__name__)

@router.post("/import-statement/confirm")
def confirm_csv_import(
    data: ExpenseImportConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk insert confirmed transactions with High-Resolution Error Tracking."""
    try:
        # 1. Fetch all existing reference numbers for this user in one query
        existing_refs = set(
            ref[0] for ref in db.query(Expense.reference_number)
            .filter(Expense.user_id == current_user.id, Expense.reference_number != None)
            .all()
        )
        
        to_create = []
        skipped = 0
        internal_seen = set()
        
        for idx, tx in enumerate(data.transactions):
            try:
                # Internal Deduplication (within the file itself)
                # Only deduplicate if a reference number exists
                if tx.reference_number and tx.reference_number in internal_seen:
                    skipped += 1
                    continue
                    
                # External Deduplication (against the Database)
                if tx.reference_number and tx.reference_number in existing_refs:
                    skipped += 1
                    continue
                    
                if tx.reference_number:
                    internal_seen.add(tx.reference_number)
                
                # Map PDF/CSV 'debit'/'credit' to internal 'expense'/'income'
                internal_type = "expense" if tx.type == "debit" else "income"
                category = tx.category or ("Other" if internal_type == "expense" else "Salary")
                
                # Score anomaly
                is_anomaly = float(tx.amount) > 100000 
                score = 0.9 if is_anomaly else 0.1
                
                new_expense = Expense(
                    user_id=current_user.id,
                    amount=tx.amount,
                    category=category,
                    description=tx.description,
                    date=tx.date,
                    transaction_type=internal_type,
                    reference_number=tx.reference_number,
                    is_anomaly=is_anomaly,
                    anomaly_score=score
                )
                to_create.append(new_expense)
            except Exception as row_err:
                logger.error(f"Error processing row {idx}: {str(row_err)}")
                raise ValueError(f"Transaction at row {idx} is invalid: {str(row_err)}")

        # 2. Batch Insert (Chunked for better reliability)
        chunk_size = 50
        for i in range(0, len(to_create), chunk_size):
            try:
                chunk = to_create[i : i + chunk_size]
                db.add_all(chunk)
                db.commit()
            except Exception as db_err:
                db.rollback()
                # Pinpoint the bad row in this batch
                logger.error(f"Chunk starting at index {i} failed: {str(db_err)}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Import blocked at row {i}. Possible duplicate or invalid data. Reference: {to_create[i].reference_number}"
                )
            
        final_msg = f"Successfully imported {len(to_create)} transactions"
        if skipped > 0:
            final_msg += f" ({skipped} duplicates ignored)"
            
        return {"message": final_msg, "count": len(to_create), "skipped": skipped}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk import crash: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"System error during mass-import: {str(e)}"
        )
