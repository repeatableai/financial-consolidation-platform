from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from collections import defaultdict
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.consolidation import Company, Organization, CompanyAccount, AccountMapping, Transaction, AccountType

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

class CompanyFinancialsResponse(BaseModel):
    company_id: str
    company_name: str
    fiscal_year: int
    fiscal_period: int
    currency: str
    total_assets: float
    total_liabilities: float
    total_equity: float
    total_revenue: float
    total_expenses: float
    net_income: float
    account_balances: List[Dict]
    transaction_count: int
    mapped_account_count: int
    unmapped_account_count: int
    last_calculated: datetime

@router.get("/{company_id}/financials")
async def get_company_financials(
    company_id: str,
    fiscal_year: int,
    fiscal_period: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get individual company financial statements for a specific period"""

    # Verify company belongs to user
    company = db.query(Company).join(Organization).filter(
        Company.id == company_id,
        Organization.owner_id == current_user.id
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get all transactions for this period
    transactions = db.query(Transaction).filter(
        Transaction.company_id == company_id,
        Transaction.fiscal_year == fiscal_year,
        Transaction.fiscal_period == fiscal_period
    ).all()

    # Aggregate by master account type
    balances = defaultdict(lambda: {'debit': 0.0, 'credit': 0.0, 'net': 0.0, 'account_type': None, 'account_name': ''})
    account_details = []

    for txn in transactions:
        # Get mapping to determine account type
        mapping = db.query(AccountMapping).join(CompanyAccount).filter(
            CompanyAccount.id == txn.account_id,
            AccountMapping.is_active == True
        ).first()

        if mapping:
            master_acc = mapping.master_account
            key = master_acc.id

            balances[key]['debit'] += txn.debit_amount
            balances[key]['credit'] += txn.credit_amount
            balances[key]['account_type'] = master_acc.account_type
            balances[key]['account_name'] = master_acc.account_name
            balances[key]['account_number'] = master_acc.account_number

    # Calculate net balances and prepare account details
    for acc_id, bal in balances.items():
        bal['net'] = bal['debit'] - bal['credit']
        account_details.append({
            'account_name': bal['account_name'],
            'account_number': bal['account_number'],
            'account_type': bal['account_type'].value if bal['account_type'] else 'unknown',
            'debit': bal['debit'],
            'credit': bal['credit'],
            'balance': bal['net']
        })

    # Calculate financial statement totals
    totals = {
        'total_assets': 0.0,
        'total_liabilities': 0.0,
        'total_equity': 0.0,
        'total_revenue': 0.0,
        'total_expenses': 0.0
    }

    for acc_id, bal in balances.items():
        net = bal['net']
        acc_type = bal['account_type']

        if acc_type == AccountType.ASSET:
            totals['total_assets'] += net
        elif acc_type == AccountType.LIABILITY:
            totals['total_liabilities'] += abs(net)
        elif acc_type == AccountType.EQUITY:
            totals['total_equity'] += abs(net)
        elif acc_type == AccountType.REVENUE:
            totals['total_revenue'] += abs(net)
        elif acc_type == AccountType.EXPENSE:
            totals['total_expenses'] += net

    # Calculate net income and add to equity
    net_income = totals['total_revenue'] - totals['total_expenses']
    totals['total_equity'] += net_income

    # Get mapping statistics
    all_company_accounts = db.query(CompanyAccount).filter(CompanyAccount.company_id == company_id).count()
    mapped_accounts = db.query(AccountMapping).join(CompanyAccount).filter(
        CompanyAccount.company_id == company_id,
        AccountMapping.is_active == True
    ).count()

    return CompanyFinancialsResponse(
        company_id=company.id,
        company_name=company.name,
        fiscal_year=fiscal_year,
        fiscal_period=fiscal_period,
        currency=company.currency,
        total_assets=totals['total_assets'],
        total_liabilities=totals['total_liabilities'],
        total_equity=totals['total_equity'],
        total_revenue=totals['total_revenue'],
        total_expenses=totals['total_expenses'],
        net_income=net_income,
        account_balances=sorted(account_details, key=lambda x: x['account_number']),
        transaction_count=len(transactions),
        mapped_account_count=mapped_accounts,
        unmapped_account_count=all_company_accounts - mapped_accounts,
        last_calculated=datetime.utcnow()
    )

@router.get("/compare-all")
@router.get("/{company_id}/account-activity")
async def get_account_activity(
    company_id: str,
    fiscal_year: int,
    fiscal_period: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed account activity with transaction breakdowns"""

    company = db.query(Company).join(Organization).filter(
        Company.id == company_id,
        Organization.owner_id == current_user.id
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get all transactions for period
    transactions = db.query(Transaction).filter(
        Transaction.company_id == company_id,
        Transaction.fiscal_year == fiscal_year,
        Transaction.fiscal_period == fiscal_period
    ).all()

    # Group by account
    account_activity = {}

    for txn in transactions:
        account = db.query(CompanyAccount).filter(CompanyAccount.id == txn.account_id).first()
        if not account:
            continue

        if account.id not in account_activity:
            # Get mapping to master account
            mapping = db.query(AccountMapping).filter(
                AccountMapping.company_account_id == account.id,
                AccountMapping.is_active == True
            ).first()

            account_activity[account.id] = {
                'account_id': account.id,
                'account_number': account.account_number,
                'account_name': account.account_name,
                'account_type': account.account_type.value,
                'master_account': mapping.master_account.account_name if mapping else 'Unmapped',
                'opening_balance': 0.0,
                'total_debits': 0.0,
                'total_credits': 0.0,
                'net_change': 0.0,
                'ending_balance': 0.0,
                'transaction_count': 0,
                'transactions': [],
                'is_mapped': mapping is not None
            }

        # Aggregate transaction amounts
        account_activity[account.id]['total_debits'] += txn.debit_amount
        account_activity[account.id]['total_credits'] += txn.credit_amount
        account_activity[account.id]['transaction_count'] += 1

        # Add transaction detail
        account_activity[account.id]['transactions'].append({
            'date': txn.transaction_date.isoformat(),
            'description': txn.description,
            'reference': txn.reference,
            'debit': txn.debit_amount,
            'credit': txn.credit_amount,
            'impact': 'positive' if (account.account_type in [AccountType.ASSET, AccountType.EXPENSE] and txn.debit_amount > 0) or (account.account_type in [AccountType.LIABILITY, AccountType.EQUITY, AccountType.REVENUE] and txn.credit_amount > 0) else 'negative'
        })

    # Calculate net changes and ending balances
    for acc_id, activity in account_activity.items():
        activity['net_change'] = activity['total_debits'] - activity['total_credits']
        activity['ending_balance'] = activity['net_change']

        # Sort transactions by date
        activity['transactions'].sort(key=lambda x: x['date'], reverse=True)

    return {
        'company_id': company.id,
        'company_name': company.name,
        'fiscal_year': fiscal_year,
        'fiscal_period': fiscal_period,
        'accounts': list(account_activity.values())
    }

@router.get("/compare-all")
async def compare_companies(
    organization_id: str,
    fiscal_year: int,
    fiscal_period: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare all companies side-by-side for a specific period"""

    # Get all companies (use raw query to avoid enum issues)
    from sqlalchemy import text

    companies_raw = db.execute(text(f"""
        SELECT id, name, currency
        FROM companies
        WHERE organization_id = '{organization_id}'
        AND is_active = true
    """)).fetchall()

    comparison_data = []

    for comp_id, comp_name, comp_currency in companies_raw:
        # Get transactions
        transactions = db.query(Transaction).filter(
            Transaction.company_id == comp_id,
            Transaction.fiscal_year == fiscal_year,
            Transaction.fiscal_period == fiscal_period
        ).all()

        # Calculate financials
        balances = defaultdict(lambda: {"debit": 0.0, "credit": 0.0, "account_type": None})

        for txn in transactions:
            mapping = db.query(AccountMapping).join(CompanyAccount).filter(
                CompanyAccount.id == txn.account_id,
                AccountMapping.is_active == True
            ).first()

            if mapping:
                key = mapping.master_account.id
                balances[key]["debit"] += txn.debit_amount
                balances[key]["credit"] += txn.credit_amount
                balances[key]["account_type"] = mapping.master_account.account_type

        totals = {"assets": 0.0, "liabilities": 0.0, "equity": 0.0, "revenue": 0.0, "expenses": 0.0}

        for bal in balances.values():
            net = bal["debit"] - bal["credit"]
            if bal["account_type"] == AccountType.ASSET:
                totals["assets"] += net
            elif bal["account_type"] == AccountType.LIABILITY:
                totals["liabilities"] += abs(net)
            elif bal["account_type"] == AccountType.EQUITY:
                totals["equity"] += abs(net)
            elif bal["account_type"] == AccountType.REVENUE:
                totals["revenue"] += abs(net)
            elif bal["account_type"] == AccountType.EXPENSE:
                totals["expenses"] += net

        net_income = totals["revenue"] - totals["expenses"]
        totals["equity"] += net_income

        comparison_data.append({
            "company_id": comp_id,
            "company_name": comp_name,
            "currency": comp_currency,
            "total_assets": totals["assets"],
            "total_liabilities": totals["liabilities"],
            "total_equity": totals["equity"],
            "total_revenue": totals["revenue"],
            "total_expenses": totals["expenses"],
            "net_income": net_income,
            "profit_margin": (net_income / totals["revenue"]) if totals["revenue"] > 0 else 0,
            "transaction_count": len(transactions)
        })

    # Calculate percentages
    consolidated_revenue = sum(c["total_revenue"] for c in comparison_data)
    consolidated_assets = sum(c["total_assets"] for c in comparison_data)
    consolidated_net_income = sum(c["net_income"] for c in comparison_data)

    for c in comparison_data:
        c["revenue_pct"] = (c["total_revenue"] / consolidated_revenue * 100) if consolidated_revenue > 0 else 0
        c["assets_pct"] = (c["total_assets"] / consolidated_assets * 100) if consolidated_assets > 0 else 0

    return {
        "fiscal_year": fiscal_year,
        "fiscal_period": fiscal_period,
        "companies": comparison_data,
        "consolidated_totals": {
            "assets": consolidated_assets,
            "revenue": consolidated_revenue,
            "net_income": consolidated_net_income
        }
    }
