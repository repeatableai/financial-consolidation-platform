from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import AccountMapping, CompanyAccount, MasterAccount, Company, Organization
from ..services.ai_service import ai_service

router = APIRouter()

class MappingCreate(BaseModel):
    company_account_id: str
    master_account_id: str
    confidence_score: Optional[float] = None

class MappingResponse(BaseModel):
    id: str
    company_account_id: str
    master_account_id: str
    confidence_score: Optional[float]
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class AIMappingSuggestion(BaseModel):
    company_account_id: str
    company_account_name: str
    company_account_number: str
    master_account_id: str
    master_account_name: str
    master_account_number: str
    confidence_score: float
    reasoning: str
    account_type_match: bool
    name_similarity: str
    alternative_matches: List[str]

class GenerateMappingsRequest(BaseModel):
    company_id: str
    confidence_threshold: float = 0.85

@router.post("/", response_model=MappingResponse, status_code=201)
async def create_mapping(mapping_data: MappingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mapping = AccountMapping(**mapping_data.dict(), created_by=current_user.id)
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return MappingResponse.from_orm(mapping)

@router.post("/generate", response_model=List[AIMappingSuggestion])
async def generate_ai_mappings(request: GenerateMappingsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = db.query(Company).join(Organization).filter(
        Company.id == request.company_id,
        Organization.owner_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    unmapped = db.query(CompanyAccount).filter(
        CompanyAccount.company_id == request.company_id,
        CompanyAccount.is_active == True,
        ~CompanyAccount.id.in_(db.query(AccountMapping.company_account_id).filter(AccountMapping.is_active == True))
    ).all()

    if not unmapped:
        return []

    master_accounts = db.query(MasterAccount).filter(
        MasterAccount.organization_id == company.organization_id,
        MasterAccount.is_active == True
    ).all()

    company_data = [{'id': a.id, 'account_number': a.account_number, 'account_name': a.account_name, 'account_type': a.account_type.value} for a in unmapped]
    master_data = [{'id': a.id, 'account_number': a.account_number, 'account_name': a.account_name, 'account_type': a.account_type.value} for a in master_accounts]

    suggestions = await ai_service.suggest_account_mappings(company_data, master_data, f"Industry: {company.industry}")
    filtered = [s for s in suggestions if s.confidence_score >= request.confidence_threshold]

    return [AIMappingSuggestion(
        company_account_id=s.company_account_id,
        company_account_name=s.company_account_name,
        company_account_number=s.company_account_number,
        master_account_id=s.master_account_id,
        master_account_name=s.master_account_name,
        master_account_number=s.master_account_number,
        confidence_score=s.confidence_score,
        reasoning=s.reasoning,
        account_type_match=s.account_type_match,
        name_similarity=s.name_similarity,
        alternative_matches=s.alternative_matches
    ) for s in filtered]

class MappingDetailResponse(BaseModel):
    id: str
    company_account_id: str
    company_account_name: str
    company_account_number: str
    master_account_id: str
    master_account_name: str
    master_account_number: str
    confidence_score: Optional[float]
    is_verified: bool
    created_at: datetime

@router.get("/company/{company_id}", response_model=List[MappingDetailResponse])
async def list_company_mappings(company_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify company belongs to user
    company = db.query(Company).join(Organization).filter(
        Company.id == company_id,
        Organization.owner_id == current_user.id
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    mappings = db.query(AccountMapping).join(CompanyAccount).filter(
        CompanyAccount.company_id == company_id,
        AccountMapping.is_active == True
    ).all()

    result = []
    for mapping in mappings:
        result.append(MappingDetailResponse(
            id=mapping.id,
            company_account_id=mapping.company_account_id,
            company_account_name=mapping.company_account.account_name,
            company_account_number=mapping.company_account.account_number,
            master_account_id=mapping.master_account_id,
            master_account_name=mapping.master_account.account_name,
            master_account_number=mapping.master_account.account_number,
            confidence_score=mapping.confidence_score,
            is_verified=mapping.is_verified,
            created_at=mapping.created_at
        ))

    return result
