from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import logging
from collections import defaultdict
from ..models.consolidation import (
    Organization, Company, MasterAccount, CompanyAccount,
    AccountMapping, Transaction, ConsolidationRun, IntercompanyElimination,
    AccountType, ConsolidationStatus
)
from .ai_service import ai_service

logger = logging.getLogger(__name__)

class ConsolidationEngine:
    def __init__(self, db: Session):
        self.db = db

    async def run_consolidation(self, organization_id: str, fiscal_year: int, fiscal_period: int,
                                period_end_date: datetime, company_ids: Optional[List[str]] = None,
                                run_name: Optional[str] = None, created_by: Optional[str] = None) -> ConsolidationRun:
        start_time = datetime.utcnow()
        logger.info(f"Starting consolidation")

        if not run_name:
            run_name = f"Consolidation {fiscal_year}-{fiscal_period:02d}"

        run = ConsolidationRun(
            organization_id=organization_id, run_name=run_name, fiscal_year=fiscal_year,
            fiscal_period=fiscal_period, period_end_date=period_end_date,
            status=ConsolidationStatus.PROCESSING, created_by=created_by, companies_included=company_ids or []
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        try:
            companies = self._get_companies(organization_id, company_ids)
            transactions = self._get_transactions_for_period([c.id for c in companies], fiscal_year, fiscal_period)
            mapped_balances = self._apply_mappings_and_aggregate(transactions)
            eliminations = await self._detect_and_eliminate_intercompany(transactions, companies, run.id)
            final_balances = self._apply_eliminations(mapped_balances, eliminations)
            financials = self._calculate_financial_statements(final_balances)

            run.status = ConsolidationStatus.COMPLETED
            run.total_assets = financials['total_assets']
            run.total_liabilities = financials['total_liabilities']
            run.total_equity = financials['total_equity']
            run.total_revenue = financials['total_revenue']
            run.total_expenses = financials['total_expenses']
            run.net_income = financials['net_income']
            run.elimination_count = len(eliminations)
            run.completed_at = datetime.utcnow()
            run.processing_time_seconds = (datetime.utcnow() - start_time).total_seconds()
            self.db.commit()
            return run
        except Exception as e:
            logger.error(f"Consolidation failed: {e}")
            run.status = ConsolidationStatus.FAILED
            run.error_message = str(e)
            self.db.commit()
            raise

    def _get_companies(self, organization_id: str, company_ids: Optional[List[str]] = None) -> List[Company]:
        query = self.db.query(Company).filter(Company.organization_id == organization_id, Company.is_active == True)
        if company_ids:
            query = query.filter(Company.id.in_(company_ids))
        return query.all()

    def _get_transactions_for_period(self, company_ids: List[str], fiscal_year: int, fiscal_period: int) -> List[Transaction]:
        return self.db.query(Transaction).filter(
            Transaction.company_id.in_(company_ids),
            Transaction.fiscal_year == fiscal_year,
            Transaction.fiscal_period == fiscal_period
        ).all()

    def _apply_mappings_and_aggregate(self, transactions: List[Transaction]) -> Dict[str, Dict]:
        balances = defaultdict(lambda: {'debit': 0.0, 'credit': 0.0, 'net': 0.0, 'account_type': None})
        for txn in transactions:
            mapping = self.db.query(AccountMapping).join(CompanyAccount).filter(
                CompanyAccount.id == txn.account_id, AccountMapping.is_active == True
            ).first()
            if mapping:
                mid = mapping.master_account_id
                balances[mid]['debit'] += txn.debit_amount
                balances[mid]['credit'] += txn.credit_amount
                balances[mid]['account_type'] = mapping.master_account.account_type
        for aid, bal in balances.items():
            bal['net'] = bal['debit'] - bal['credit']
        return dict(balances)

    async def _detect_and_eliminate_intercompany(self, transactions: List[Transaction], companies: List[Company], run_id: str) -> List[IntercompanyElimination]:
        return []

    def _apply_eliminations(self, balances: Dict[str, Dict], eliminations: List[IntercompanyElimination]) -> Dict[str, Dict]:
        return balances

    def _calculate_financial_statements(self, balances: Dict[str, Dict]) -> Dict[str, float]:
        totals = {'total_assets': 0.0, 'total_liabilities': 0.0, 'total_equity': 0.0, 'total_revenue': 0.0, 'total_expenses': 0.0, 'net_income': 0.0}
        for aid, bal in balances.items():
            net = bal['net']
            atype = bal['account_type']
            if atype == AccountType.ASSET:
                totals['total_assets'] += net
            elif atype == AccountType.LIABILITY:
                totals['total_liabilities'] += abs(net)
            elif atype == AccountType.EQUITY:
                totals['total_equity'] += abs(net)
            elif atype == AccountType.REVENUE:
                totals['total_revenue'] += abs(net)
            elif atype == AccountType.EXPENSE:
                totals['total_expenses'] += net
        totals['net_income'] = totals['total_revenue'] - totals['total_expenses']
        totals['total_equity'] += totals['net_income']
        return totals

def get_consolidation_engine(db: Session) -> ConsolidationEngine:
    return ConsolidationEngine(db)
