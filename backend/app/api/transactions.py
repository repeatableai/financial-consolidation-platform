from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime
import logging
import uuid
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import Transaction, Company, CompanyAccount, Organization, TransactionType, FileUpload
from ..services.import_service import import_service

logger = logging.getLogger(__name__)

router = APIRouter()

class TransactionCreate(BaseModel):
    company_id: str
    account_id: str
    transaction_date: datetime
    description: str
    debit_amount: float = 0.0
    credit_amount: float = 0.0

class TransactionResponse(BaseModel):
    id: str
    company_id: str
    transaction_date: datetime
    debit_amount: float
    credit_amount: float
    class Config:
        from_attributes = True

@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(txn_data: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transaction = Transaction(**txn_data.dict())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return TransactionResponse.from_orm(transaction)

@router.get("/company/{company_id}", response_model=List[TransactionResponse])
async def list_transactions(company_id: str, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(Transaction.company_id == company_id).limit(limit).all()
    return [TransactionResponse.from_orm(t) for t in transactions]

class ImportResult(BaseModel):
    success_count: int
    error_count: int
    total_rows: int
    errors: List[Dict]
    preview: List[Dict]

@router.post("/import", response_model=ImportResult)
async def import_transactions(
    company_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import transactions from Excel or CSV file"""

    # Verify company belongs to user
    company = db.query(Company).join(Organization).filter(
        Company.id == company_id,
        Organization.owner_id == current_user.id
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Read file
    content = await file.read()
    file_size = len(content)

    # Parse file
    try:
        df = import_service.parse_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Validate structure
    validation_errors = import_service.validate_dataframe(df)
    if validation_errors:
        return ImportResult(
            success_count=0,
            error_count=len(validation_errors),
            total_rows=len(df),
            errors=validation_errors,
            preview=[]
        )

    # Build account lookup
    company_accounts = db.query(CompanyAccount).filter(
        CompanyAccount.company_id == company_id
    ).all()
    account_lookup = {acc.account_number: acc.id for acc in company_accounts}

    # Prepare transactions
    transactions_data, prep_errors = import_service.prepare_transactions(df, company_id, account_lookup)

    if prep_errors:
        return ImportResult(
            success_count=0,
            error_count=len(prep_errors),
            total_rows=len(df),
            errors=prep_errors,
            preview=[]
        )

    # Insert transactions
    success_count = 0
    errors_list = []
    for txn_data in transactions_data:
        try:
            transaction = Transaction(
                **txn_data,
                currency=company.currency,
                transaction_type=TransactionType.STANDARD
            )
            db.add(transaction)
            success_count += 1
        except Exception as e:
            logger.error(f"Error inserting transaction: {e}")
            errors_list.append({"error": str(e)})

    db.commit()

    # Save file upload record
    error_count = len(transactions_data) - success_count
    status = "completed" if error_count == 0 else ("failed" if success_count == 0 else "partial")
    error_summary = f"{error_count} errors" if error_count > 0 else None

    file_upload = FileUpload(
        id=str(uuid.uuid4()),
        organization_id=str(company.organization_id),
        company_id=company_id,
        filename=file.filename,
        file_type="transactions",
        file_size=file_size,
        mime_type=file.content_type,
        rows_processed=len(df),
        rows_successful=success_count,
        rows_failed=error_count,
        status=status,
        error_summary=error_summary,
        uploaded_by=str(current_user.id),
        created_at=datetime.now()
    )
    db.add(file_upload)
    db.commit()

    return ImportResult(
        success_count=success_count,
        error_count=error_count,
        total_rows=len(df),
        errors=errors_list[:10],  # Show first 10 errors
        preview=transactions_data[:5]  # Show first 5
    )

@router.get("/template/csv")
async def download_csv_template():
    """Download CSV template for transaction import"""
    from fastapi.responses import Response

    template = import_service.generate_csv_template()

    return Response(
        content=template,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transaction_template.csv"}
    )

class FileUploadResponse(BaseModel):
    id: str
    company_id: str | None
    company_name: str | None
    filename: str
    file_type: str
    file_size: int | None
    rows_processed: int | None
    rows_successful: int | None
    rows_failed: int | None
    status: str
    error_summary: str | None
    uploaded_by_name: str | None
    created_at: datetime

@router.get("/uploads", response_model=List[FileUploadResponse])
async def list_file_uploads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    company_id: str | None = None,
    limit: int = 50
):
    """List all file uploads for the current user's organization"""

    # Get user's organization
    org = db.query(Organization).filter(
        Organization.owner_id == current_user.id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Build query
    query = text("""
        SELECT
            fu.id,
            fu.company_id,
            c.name as company_name,
            fu.filename,
            fu.file_type,
            fu.file_size,
            fu.rows_processed,
            fu.rows_successful,
            fu.rows_failed,
            fu.status,
            fu.error_summary,
            u.full_name as uploaded_by_name,
            fu.created_at
        FROM file_uploads fu
        LEFT JOIN companies c ON fu.company_id = c.id
        LEFT JOIN users u ON fu.uploaded_by = u.id
        WHERE fu.organization_id = :org_id
        AND (:company_id IS NULL OR fu.company_id = :company_id)
        ORDER BY fu.created_at DESC
        LIMIT :limit
    """)

    results = db.execute(query, {
        "org_id": str(org.id),
        "company_id": company_id,
        "limit": limit
    }).fetchall()

    return [{
        "id": r[0],
        "company_id": r[1],
        "company_name": r[2],
        "filename": r[3],
        "file_type": r[4],
        "file_size": r[5],
        "rows_processed": r[6],
        "rows_successful": r[7],
        "rows_failed": r[8],
        "status": r[9],
        "error_summary": r[10],
        "uploaded_by_name": r[11],
        "created_at": r[12]
    } for r in results]
