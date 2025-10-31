from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import Company, Organization, CompanyAccount, AccountMapping, Transaction

router = APIRouter()

class CompanyCreate(BaseModel):
    name: str
    legal_name: Optional[str] = None
    entity_type: Optional[str] = None
    industry: Optional[str] = None
    currency: str = "USD"

class CompanyResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    legal_name: Optional[str]
    industry: Optional[str]
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

@router.post("/", response_model=CompanyResponse, status_code=201)
async def create_company(company_data: CompanyCreate, organization_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org = db.query(Organization).filter(Organization.id == organization_id, Organization.owner_id == current_user.id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    company = Company(organization_id=organization_id, **company_data.dict())
    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanyResponse.from_orm(company)

@router.get("/", response_model=List[CompanyResponse])
async def list_companies(organization_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    companies = db.query(Company).join(Organization).filter(
        Company.organization_id == organization_id,
        Organization.owner_id == current_user.id
    ).all()
    return [CompanyResponse.from_orm(c) for c in companies]

@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = db.query(Company).join(Organization).filter(
        Company.id == company_id,
        Organization.owner_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyResponse.from_orm(company)

class CompanyDetailResponse(BaseModel):
    id: str
    name: str
    legal_name: Optional[str]
    entity_type: Optional[str]
    tax_id: Optional[str]
    industry: Optional[str]
    currency: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    account_count: int
    mapped_account_count: int
    transaction_count: int
    recent_transactions: List[dict]

@router.get("/{company_id}/details")
async def get_company_details(company_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = db.query(Company).join(Organization).filter(
        Company.id == company_id,
        Organization.owner_id == current_user.id
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get account stats
    accounts = db.query(CompanyAccount).filter(CompanyAccount.company_id == company_id).all()
    mapped_count = db.query(AccountMapping).join(CompanyAccount).filter(
        CompanyAccount.company_id == company_id,
        AccountMapping.is_active == True
    ).count()

    # Get recent transactions
    recent_txns = db.query(Transaction).filter(
        Transaction.company_id == company_id
    ).order_by(Transaction.transaction_date.desc()).limit(10).all()

    transaction_list = []
    for txn in recent_txns:
        account = db.query(CompanyAccount).filter(CompanyAccount.id == txn.account_id).first()
        transaction_list.append({
            'id': txn.id,
            'date': txn.transaction_date.isoformat(),
            'account_name': account.account_name if account else 'Unknown',
            'description': txn.description,
            'debit': txn.debit_amount,
            'credit': txn.credit_amount,
            'reference': txn.reference
        })

    total_txns = db.query(Transaction).filter(Transaction.company_id == company_id).count()

    return CompanyDetailResponse(
        id=company.id,
        name=company.name,
        legal_name=company.legal_name,
        entity_type=company.entity_type,
        tax_id=company.tax_id,
        industry=company.industry,
        currency=company.currency,
        description=company.description,
        is_active=company.is_active,
        created_at=company.created_at,
        account_count=len(accounts),
        mapped_account_count=mapped_count,
        transaction_count=total_txns,
        recent_transactions=transaction_list
    )
