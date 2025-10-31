"""
Recalculate existing consolidation runs with correct math from transactions
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.consolidation import (
    ConsolidationRun, Transaction, Company, CompanyAccount,
    AccountMapping, AccountType
)
from collections import defaultdict

def recalculate_consolidations(email):
    db = SessionLocal()
    try:
        print(f"🔢 Recalculating consolidations for {email}...")
        print()

        user = db.query(User).filter(User.email == email).first()
        if not user or not user.organization_id:
            print("User/org not found")
            return

        runs = db.query(ConsolidationRun).filter(
            ConsolidationRun.organization_id == user.organization_id
        ).all()

        print(f"Found {len(runs)} consolidation runs to recalculate")
        print()

        for run in runs:
            print(f"Recalculating: {run.run_name} ({run.fiscal_year}-{run.fiscal_period:02d})")

            # Get all transactions for this period
            companies = db.query(Company).filter(
                Company.id.in_(run.companies_included),
                Company.is_active == True
            ).all()

            all_transactions = db.query(Transaction).filter(
                Transaction.company_id.in_([c.id for c in companies]),
                Transaction.fiscal_year == run.fiscal_year,
                Transaction.fiscal_period == run.fiscal_period
            ).all()

            print(f"  Processing {len(all_transactions)} transactions...")

            # Aggregate by master account
            balances = defaultdict(lambda: {'debit': 0.0, 'credit': 0.0, 'net': 0.0, 'account_type': None})

            for txn in all_transactions:
                # Get mapping
                mapping = db.query(AccountMapping).join(CompanyAccount).filter(
                    CompanyAccount.id == txn.account_id,
                    AccountMapping.is_active == True
                ).first()

                if mapping:
                    mid = mapping.master_account_id
                    balances[mid]['debit'] += txn.debit_amount
                    balances[mid]['credit'] += txn.credit_amount
                    balances[mid]['account_type'] = mapping.master_account.account_type

            # Calculate net balances
            for aid, bal in balances.items():
                bal['net'] = bal['debit'] - bal['credit']

            # Calculate totals by account type
            totals = {
                'total_assets': 0.0,
                'total_liabilities': 0.0,
                'total_equity': 0.0,
                'total_revenue': 0.0,
                'total_expenses': 0.0
            }

            for aid, bal in balances.items():
                net = bal['net']
                atype = bal['account_type']

                if atype == AccountType.ASSET:
                    # Assets increase with debits
                    totals['total_assets'] += net
                elif atype == AccountType.LIABILITY:
                    # Liabilities increase with credits (negative net)
                    totals['total_liabilities'] += abs(net)
                elif atype == AccountType.EQUITY:
                    # Equity increases with credits (negative net)
                    totals['total_equity'] += abs(net)
                elif atype == AccountType.REVENUE:
                    # Revenue increases with credits (negative net)
                    totals['total_revenue'] += abs(net)
                elif atype == AccountType.EXPENSE:
                    # Expenses increase with debits (positive net)
                    totals['total_expenses'] += net

            # Calculate net income
            net_income = totals['total_revenue'] - totals['total_expenses']

            # Add net income to equity (accounting equation)
            totals['total_equity'] += net_income

            # Update consolidation run
            run.total_assets = totals['total_assets']
            run.total_liabilities = totals['total_liabilities']
            run.total_equity = totals['total_equity']
            run.total_revenue = totals['total_revenue']
            run.total_expenses = totals['total_expenses']
            run.net_income = net_income

            db.commit()

            # Verify balance
            balance_check = run.total_assets - (run.total_liabilities + run.total_equity)

            print(f"  ✓ Updated financials:")
            print(f"     Assets: ${run.total_assets:,.2f}")
            print(f"     Liabilities: ${run.total_liabilities:,.2f}")
            print(f"     Equity: ${run.total_equity:,.2f}")
            print(f"     Revenue: ${run.total_revenue:,.2f}")
            print(f"     Expenses: ${run.total_expenses:,.2f}")
            print(f"     Net Income: ${run.net_income:,.2f}")
            print(f"     Balance Check (Assets - (Liab + Equity)): ${balance_check:,.2f} {'✓ BALANCED' if abs(balance_check) < 1 else '⚠️ UNBALANCED'}")
            print()

        print("=" * 70)
        print("✅ All consolidations recalculated with correct math!")
        print("=" * 70)
        print()
        print("Refresh your browser to see the corrected financials.")
        print()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    recalculate_consolidations("nick@repeatable.ai")
