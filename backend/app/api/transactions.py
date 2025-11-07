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
from ..models.consolidation import Transaction, Company, CompanyAccount, Organization, TransactionType, FileUpload, AccountType, AccountMapping
from ..services.import_service import import_service
from ..services.mapping_service import mapping_service

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
    transactions = db.query(Transaction).filter(Transaction.company_id == company_id).order_by(Transaction.transaction_date.desc()).limit(limit).all()
    return [TransactionResponse.from_orm(t) for t in transactions]

class ImportResult(BaseModel):
    success_count: int
    error_count: int
    total_rows: int
    errors: List[Dict]
    preview: List[Dict]
    pending_mappings: List[Dict] = []
    auto_mapped_count: int = 0

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

    # Build account lookup from existing accounts
    company_accounts = db.query(CompanyAccount).filter(
        CompanyAccount.company_id == company_id
    ).all()
    account_lookup = {acc.account_number: acc.id for acc in company_accounts}

    logger.info(f"Found {len(account_lookup)} existing accounts for company {company_id}")

    # Track mapping results
    pending_mappings = []
    auto_mapped_count = 0

    # Auto-create missing accounts from import file
    if 'account_number' in df.columns:
        unique_accounts = df['account_number'].dropna().unique()
        logger.info(f"Import file contains {len(unique_accounts)} unique account numbers")

        accounts_created = 0
        for account_num in unique_accounts:
            account_num_str = str(account_num).strip()

            # Skip if account already exists
            if account_num_str in account_lookup:
                continue

            # Infer account type from account number or name
            account_type_str = import_service.infer_account_type_from_number(account_num_str)
            account_type = AccountType[account_type_str.upper()]

            # Get account name (for financial statements, the account_number IS the name)
            account_name = import_service.get_account_name_from_df(df, account_num_str)

            # Create new account
            try:
                new_account = CompanyAccount(
                    id=str(uuid.uuid4()),
                    company_id=company_id,
                    account_number=account_num_str,
                    account_name=account_name,
                    account_type=account_type,
                    is_active=True
                )
                db.add(new_account)
                db.flush()  # Get the ID without committing yet

                # Add to lookup
                account_lookup[account_num_str] = new_account.id
                accounts_created += 1

                logger.info(f"Created account: {account_num_str} ({account_name}) - Type: {account_type_str}")

                # Try to map to master account using AI
                master_account_id, confidence = mapping_service.find_master_account_match(
                    account_name=account_name,
                    account_type=account_type,
                    organization_id=str(company.organization_id),
                    db=db
                )

                if master_account_id and confidence >= 0.8:
                    # High confidence - auto-create mapping
                    mapping = AccountMapping(
                        id=str(uuid.uuid4()),
                        company_account_id=new_account.id,
                        master_account_id=master_account_id,
                        confidence_score=confidence,
                        mapping_source="ai_auto",
                        is_active=True,
                        is_verified=False,
                        created_by=str(current_user.id)
                    )
                    db.add(mapping)
                    auto_mapped_count += 1
                    logger.info(f"Auto-mapped account '{account_name}' to master account {master_account_id} (confidence: {confidence})")
                else:
                    # Low/no confidence - require user approval
                    suggested_master = mapping_service.get_suggested_master_account_details(master_account_id, db) if master_account_id else None
                    pending_mappings.append({
                        "child_account_id": new_account.id,
                        "child_account_number": account_num_str,
                        "child_account_name": account_name,
                        "account_type": account_type_str,
                        "suggested_master_account": suggested_master,
                        "confidence": confidence
                    })
                    logger.info(f"Account '{account_name}' requires user approval (confidence: {confidence})")
            except Exception as e:
                logger.error(f"Error creating account {account_num_str}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to create account {account_num_str}: {str(e)}")

        if accounts_created > 0:
            db.commit()  # Commit all new accounts
            logger.info(f"Successfully created {accounts_created} new accounts")
        else:
            logger.info("No new accounts needed - all accounts already exist")

    # Prepare transactions
    transactions_data, prep_errors = import_service.prepare_transactions(df, company_id, account_lookup)

    logger.info(f"prepare_transactions returned: {len(transactions_data)} transactions, {len(prep_errors)} errors")
    if prep_errors:
        logger.error(f"First 10 prep errors: {prep_errors[:10]}")

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
    logger.info(f"Starting to insert {len(transactions_data)} transactions...")
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
    logger.info(f"Successfully inserted {success_count} transactions into database")

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
        preview=transactions_data[:5],  # Show first 5
        pending_mappings=pending_mappings,
        auto_mapped_count=auto_mapped_count
    )

class MappingDecision(BaseModel):
    child_account_id: str
    action: str  # "accept", "create_new", "select_different"
    master_account_id: str | None = None  # For "accept" or "select_different"
    new_master_account: Dict | None = None  # For "create_new"

class MappingApprovalRequest(BaseModel):
    decisions: List[MappingDecision]

class MappingApprovalResult(BaseModel):
    mappings_created: int
    master_accounts_created: int
    errors: List[Dict] = []

@router.post("/mappings/approve", response_model=MappingApprovalResult)
async def approve_mappings(
    approval_request: MappingApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve or reject pending account mappings.

    Actions:
    - "accept": Accept the suggested master account mapping
    - "create_new": Create a new master account and map to it
    - "select_different": Map to a different existing master account
    """
    from ..models.consolidation import MasterAccount

    mappings_created = 0
    master_accounts_created = 0
    errors = []

    for decision in approval_request.decisions:
        try:
            # Verify child account exists and belongs to user's organization
            child_account = db.query(CompanyAccount).join(Company).join(Organization).filter(
                CompanyAccount.id == decision.child_account_id,
                Organization.owner_id == current_user.id
            ).first()

            if not child_account:
                errors.append({
                    "child_account_id": decision.child_account_id,
                    "error": "Child account not found or not authorized"
                })
                continue

            master_account_id = None

            if decision.action == "accept" or decision.action == "select_different":
                # Use provided master account ID
                if not decision.master_account_id:
                    errors.append({
                        "child_account_id": decision.child_account_id,
                        "error": f"master_account_id required for action '{decision.action}'"
                    })
                    continue

                # Verify master account exists and belongs to same organization
                master_account = db.query(MasterAccount).filter(
                    MasterAccount.id == decision.master_account_id,
                    MasterAccount.organization_id == child_account.company.organization_id
                ).first()

                if not master_account:
                    errors.append({
                        "child_account_id": decision.child_account_id,
                        "error": "Master account not found or belongs to different organization"
                    })
                    continue

                master_account_id = decision.master_account_id

            elif decision.action == "create_new":
                # Create new master account
                if not decision.new_master_account:
                    errors.append({
                        "child_account_id": decision.child_account_id,
                        "error": "new_master_account data required for action 'create_new'"
                    })
                    continue

                try:
                    new_master = MasterAccount(
                        id=str(uuid.uuid4()),
                        organization_id=str(child_account.company.organization_id),
                        account_number=decision.new_master_account.get("account_number"),
                        account_name=decision.new_master_account.get("account_name"),
                        account_type=AccountType[decision.new_master_account.get("account_type").upper()],
                        category=decision.new_master_account.get("category"),
                        subcategory=decision.new_master_account.get("subcategory"),
                        is_active=True
                    )
                    db.add(new_master)
                    db.flush()  # Get the ID

                    master_account_id = new_master.id
                    master_accounts_created += 1
                    logger.info(f"Created new master account: {new_master.account_name} ({new_master.account_number})")

                except Exception as e:
                    errors.append({
                        "child_account_id": decision.child_account_id,
                        "error": f"Failed to create master account: {str(e)}"
                    })
                    continue

            else:
                errors.append({
                    "child_account_id": decision.child_account_id,
                    "error": f"Invalid action: {decision.action}"
                })
                continue

            # Create the mapping
            mapping = AccountMapping(
                id=str(uuid.uuid4()),
                company_account_id=decision.child_account_id,
                master_account_id=master_account_id,
                mapping_source="user_manual",
                is_active=True,
                is_verified=True,  # User verified
                created_by=str(current_user.id)
            )
            db.add(mapping)
            mappings_created += 1
            logger.info(f"Created mapping: child {decision.child_account_id} -> master {master_account_id}")

        except Exception as e:
            logger.error(f"Error processing mapping decision: {e}")
            errors.append({
                "child_account_id": decision.child_account_id,
                "error": str(e)
            })

    # Commit all changes
    db.commit()

    return MappingApprovalResult(
        mappings_created=mappings_created,
        master_accounts_created=master_accounts_created,
        errors=errors
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
