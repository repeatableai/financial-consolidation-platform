from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import MasterAccount, CompanyAccount, Organization, AccountType, Company

router = APIRouter()

class MasterAccountCreate(BaseModel):
    account_number: str
    account_name: str
    account_type: str

class MasterAccountResponse(BaseModel):
    id: str
    account_number: str
    account_name: str
    account_type: str
    is_active: bool
    class Config:
        from_attributes = True

@router.post("/master", response_model=MasterAccountResponse, status_code=201)
async def create_master_account(account_data: MasterAccountCreate, organization_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org = db.query(Organization).filter(Organization.id == organization_id, Organization.owner_id == current_user.id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    account = MasterAccount(
        organization_id=organization_id,
        account_type=AccountType[account_data.account_type.upper()],
        account_number=account_data.account_number,
        account_name=account_data.account_name
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return MasterAccountResponse.from_orm(account)

@router.get("/master", response_model=List[MasterAccountResponse])
async def list_master_accounts(organization_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = db.query(MasterAccount).join(Organization).filter(
        MasterAccount.organization_id == organization_id,
        Organization.owner_id == current_user.id
    ).all()
    return [MasterAccountResponse.from_orm(a) for a in accounts]

class CompanyAccountResponse(BaseModel):
    id: str
    company_id: str
    account_number: str
    account_name: str
    account_type: str
    is_active: bool
    class Config:
        from_attributes = True

@router.get("/company/{company_id}", response_model=List[CompanyAccountResponse])
async def list_company_accounts(company_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify company belongs to user's organization
    company = db.query(Company).join(Organization).filter(
        Company.id == company_id,
        Organization.owner_id == current_user.id
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    accounts = db.query(CompanyAccount).filter(
        CompanyAccount.company_id == company_id,
        CompanyAccount.is_active == True
    ).all()
    return [CompanyAccountResponse.from_orm(a) for a in accounts]
