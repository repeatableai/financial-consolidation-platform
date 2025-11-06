from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User

router = APIRouter()

class ParentCompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    incorporation_country: Optional[str] = None
    fiscal_year_end_month: int = Field(default=12, ge=1, le=12)
    reporting_currency: str = Field(default="USD", pattern="^(USD|EUR|GBP|CAD)$")
    accounting_standard: str = Field(default="GAAP", pattern="^(GAAP|IFRS)$")

class ParentCompanyResponse(BaseModel):
    id: str
    name: str
    legal_name: str | None
    reporting_currency: str
    accounting_standard: str
    member_count: int

@router.get("/", response_model=List[ParentCompanyResponse])
async def list_parent_companies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all parent companies for the current user"""

    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="No organization found")

    # Use raw SQL to avoid enum issues
    parents = db.execute(text(f"""
        SELECT id, name, legal_name, reporting_currency, accounting_standard
        FROM parent_companies
        WHERE organization_id = '{current_user.organization_id}'
    """)).fetchall()

    result = []
    for parent in parents:
        # Count member companies
        member_count = db.execute(text(f"""
            SELECT COUNT(*)
            FROM companies
            WHERE parent_company_id = '{parent[0]}'
            AND is_active = true
        """)).scalar()

        result.append(ParentCompanyResponse(
            id=parent[0],
            name=parent[1],
            legal_name=parent[2],
            reporting_currency=parent[3],
            accounting_standard=parent[4],
            member_count=member_count
        ))

    return result

@router.get("/current")
async def get_current_parent(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the first/default parent company"""

    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="No organization found")

    parent = db.execute(text(f"""
        SELECT id, name, legal_name, reporting_currency, accounting_standard
        FROM parent_companies
        WHERE organization_id = '{current_user.organization_id}'
        LIMIT 1
    """)).fetchone()

    if not parent:
        raise HTTPException(status_code=404, detail="No parent company found")

    member_count = db.execute(text(f"""
        SELECT COUNT(*)
        FROM companies
        WHERE parent_company_id = '{parent[0]}'
        AND is_active = true
    """)).scalar()

    return ParentCompanyResponse(
        id=parent[0],
        name=parent[1],
        legal_name=parent[2],
        reporting_currency=parent[3],
        accounting_standard=parent[4],
        member_count=member_count
    )

@router.get("/{parent_id}/members")
async def get_parent_members(
    parent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all member companies for a specific parent"""

    members = db.execute(text(f"""
        SELECT id, name, currency, ownership_percentage, goodwill_amount
        FROM companies
        WHERE parent_company_id = '{parent_id}'
        AND is_active = true
    """)).fetchall()

    return [{
        'id': m[0],
        'name': m[1],
        'currency': m[2],
        'ownership_percentage': m[3],
        'goodwill_amount': m[4]
    } for m in members]

@router.post("/", response_model=ParentCompanyResponse)
async def create_parent_company(
    parent_data: ParentCompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new parent company"""

    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="No organization found")

    # Generate new UUID
    parent_id = str(uuid.uuid4())

    # Insert parent company
    db.execute(text("""
        INSERT INTO parent_companies (
            id, organization_id, name, legal_name, tax_id, incorporation_country,
            fiscal_year_end_month, reporting_currency, accounting_standard,
            created_at, updated_at
        ) VALUES (
            :id, :org_id, :name, :legal_name, :tax_id, :country,
            :fiscal_month, :currency, :standard,
            NOW(), NOW()
        )
    """), {
        "id": parent_id,
        "org_id": str(current_user.organization_id),
        "name": parent_data.name,
        "legal_name": parent_data.legal_name,
        "tax_id": parent_data.tax_id,
        "country": parent_data.incorporation_country,
        "fiscal_month": parent_data.fiscal_year_end_month,
        "currency": parent_data.reporting_currency,
        "standard": parent_data.accounting_standard
    })

    db.commit()

    # Return created parent company
    return ParentCompanyResponse(
        id=parent_id,
        name=parent_data.name,
        legal_name=parent_data.legal_name,
        reporting_currency=parent_data.reporting_currency,
        accounting_standard=parent_data.accounting_standard,
        member_count=0
    )
