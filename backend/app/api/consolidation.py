from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from collections import defaultdict
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import (
    ConsolidationRun, Organization, Company, Transaction,
    AccountMapping, CompanyAccount, AccountType
)
from ..services.consolidation_engine import get_consolidation_engine

router = APIRouter()

class ConsolidationRequest(BaseModel):
    organization_id: str
    fiscal_year: int
    fiscal_period: int
    period_end_date: datetime
    company_ids: Optional[List[str]] = None
    run_name: Optional[str] = None

class ConsolidationResponse(BaseModel):
    id: str
    organization_id: str
    run_name: str
    fiscal_year: int
    fiscal_period: int
    period_end_date: datetime
    status: str
    total_assets: Optional[float]
    total_liabilities: Optional[float]
    total_equity: Optional[float]
    total_revenue: Optional[float]
    total_expenses: Optional[float]
    net_income: Optional[float]
    companies_included: Optional[List[str]]
    elimination_count: Optional[int]
    processing_time_seconds: Optional[float]
    created_at: datetime
    class Config:
        from_attributes = True

@router.post("/run", response_model=ConsolidationResponse, status_code=201)
async def run_consolidation(request: ConsolidationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org = db.query(Organization).filter(Organization.id == request.organization_id, Organization.owner_id == current_user.id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    engine = get_consolidation_engine(db)
    try:
        consolidation_run = await engine.run_consolidation(
            organization_id=request.organization_id,
            fiscal_year=request.fiscal_year,
            fiscal_period=request.fiscal_period,
            period_end_date=request.period_end_date,
            company_ids=request.company_ids,
            run_name=request.run_name,
            created_by=current_user.id
        )
        return ConsolidationResponse.from_orm(consolidation_run)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Consolidation failed: {str(e)}")

@router.get("/runs", response_model=List[ConsolidationResponse])
async def list_runs(organization_id: str, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    runs = db.query(ConsolidationRun).join(Organization).filter(
        ConsolidationRun.organization_id == organization_id,
        Organization.owner_id == current_user.id
    ).order_by(ConsolidationRun.created_at.desc()).limit(limit).all()
    return [ConsolidationResponse.from_orm(r) for r in runs]

class CompanyBreakdown(BaseModel):
    company_id: str
    company_name: str
    currency: str
    assets: float
    liabilities: float
    equity: float
    revenue: float
    expenses: float
    net_income: float
    transaction_count: int

class ConsolidationDetailResponse(BaseModel):
    id: str
    run_name: str
    fiscal_year: int
    fiscal_period: int
    period_end_date: datetime
    status: str
    total_assets: Optional[float]
    total_liabilities: Optional[float]
    total_equity: Optional[float]
    total_revenue: Optional[float]
    total_expenses: Optional[float]
    net_income: Optional[float]
    elimination_count: int
    processing_time_seconds: Optional[float]
    companies_included: Optional[List[str]]
    company_breakdowns: List[CompanyBreakdown]
    created_at: datetime

@router.get("/runs/{run_id}/details", response_model=ConsolidationDetailResponse)
async def get_consolidation_details(run_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get consolidation run
    run = db.query(ConsolidationRun).join(Organization).filter(
        ConsolidationRun.id == run_id,
        Organization.owner_id == current_user.id
    ).first()

    if not run:
        raise HTTPException(status_code=404, detail="Consolidation run not found")

    # Calculate company-by-company breakdown
    company_breakdowns = []

    if run.companies_included:
        for company_id in run.companies_included:
            company = db.query(Company).filter(Company.id == company_id).first()
            if not company:
                continue

            # Get transactions for this company in this period
            transactions = db.query(Transaction).filter(
                Transaction.company_id == company_id,
                Transaction.fiscal_year == run.fiscal_year,
                Transaction.fiscal_period == run.fiscal_period
            ).all()

            # Calculate totals by account type
            assets = 0.0
            liabilities = 0.0
            revenue = 0.0
            expenses = 0.0

            for txn in transactions:
                # Get account mapping to determine account type
                mapping = db.query(AccountMapping).join(CompanyAccount).filter(
                    CompanyAccount.id == txn.account_id,
                    AccountMapping.is_active == True
                ).first()

                if mapping and mapping.master_account:
                    account_type = mapping.master_account.account_type
                    net_amount = txn.debit_amount - txn.credit_amount

                    if account_type == AccountType.ASSET:
                        assets += net_amount
                    elif account_type == AccountType.LIABILITY:
                        liabilities += abs(net_amount)
                    elif account_type == AccountType.REVENUE:
                        revenue += abs(net_amount)
                    elif account_type == AccountType.EXPENSE:
                        expenses += net_amount

            equity = assets - liabilities
            net_income = revenue - expenses

            company_breakdowns.append(CompanyBreakdown(
                company_id=company.id,
                company_name=company.name,
                currency=company.currency,
                assets=assets,
                liabilities=liabilities,
                equity=equity,
                revenue=revenue,
                expenses=expenses,
                net_income=net_income,
                transaction_count=len(transactions)
            ))

    return ConsolidationDetailResponse(
        id=run.id,
        run_name=run.run_name,
        fiscal_year=run.fiscal_year,
        fiscal_period=run.fiscal_period,
        period_end_date=run.period_end_date,
        status=run.status.value,
        total_assets=run.total_assets,
        total_liabilities=run.total_liabilities,
        total_equity=run.total_equity,
        total_revenue=run.total_revenue,
        total_expenses=run.total_expenses,
        net_income=run.net_income,
        elimination_count=run.elimination_count,
        processing_time_seconds=run.processing_time_seconds,
        companies_included=run.companies_included,
        company_breakdowns=company_breakdowns,
        created_at=run.created_at
    )
