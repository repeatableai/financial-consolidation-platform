from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import Organization

router = APIRouter()

class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    fiscal_year_end_month: int = 12
    default_currency: str = "USD"

class OrganizationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    fiscal_year_end_month: int
    default_currency: str
    owner_id: str
    created_at: datetime
    class Config:
        from_attributes = True

@router.post("/", response_model=OrganizationResponse, status_code=201)
async def create_organization(org_data: OrganizationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if user already has an organization
    existing = db.query(Organization).filter(Organization.owner_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already has an organization")

    organization = Organization(owner_id=current_user.id, **org_data.dict())
    db.add(organization)
    db.commit()
    db.refresh(organization)

    # Update user's organization_id
    current_user.organization_id = organization.id
    db.commit()

    return OrganizationResponse.from_orm(organization)

@router.get("/", response_model=List[OrganizationResponse])
async def list_organizations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orgs = db.query(Organization).filter(Organization.owner_id == current_user.id).all()
    return [OrganizationResponse.from_orm(o) for o in orgs]

@router.get("/current", response_model=OrganizationResponse)
async def get_current_organization(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="No organization found. Please create one first.")

    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id,
        Organization.owner_id == current_user.id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return OrganizationResponse.from_orm(org)

@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org = db.query(Organization).filter(
        Organization.id == org_id,
        Organization.owner_id == current_user.id
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationResponse.from_orm(org)
