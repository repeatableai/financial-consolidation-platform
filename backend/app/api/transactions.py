from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime
import logging
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import Transaction, Company, CompanyAccount, Organization, TransactionType
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

    db.commit()

    return ImportResult(
        success_count=success_count,
        error_count=len(transactions_data) - success_count,
        total_rows=len(df),
        errors=[],
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
