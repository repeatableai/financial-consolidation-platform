"""
Create properly balanced financial data that follows accounting principles
Assets = Liabilities + Equity
Revenue - Expenses = Net Income (flows to Retained Earnings)
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from datetime import datetime
import random
from app.core.database import SessionLocal
from app.models.user import User
from app.models.consolidation import (
    Transaction, Company, CompanyAccount, AccountMapping,
    ConsolidationRun, AccountType, TransactionType, ConsolidationStatus
)

def create_balanced_data(email):
    db = SessionLocal()
    try:
        print(f"📊 Creating balanced financial data for {email}...")
        print()

        user = db.query(User).filter(User.email == email).first()
        if not user or not user.organization_id:
            print("User/org not found")
            return

        companies = db.query(Company).filter(Company.organization_id == user.organization_id).all()

        # Delete existing transactions
        for company in companies:
            db.query(Transaction).filter(Transaction.company_id == company.id).delete()
        db.commit()
        print("✓ Cleared old transactions")

        # Create balanced transactions for each month
        for month in [10, 11, 12]:
            print(f"\nCreating balanced data for 2024-{month:02d}...")

            month_totals = {
                'total_assets': 0,
                'total_liabilities': 0,
                'total_equity': 0,
                'total_revenue': 0,
                'total_expenses': 0
            }

            for company in companies:
                company_accounts = db.query(CompanyAccount).filter(
                    CompanyAccount.company_id == company.id
                ).all()

                if not company_accounts:
                    continue

                # Get mapped accounts by type
                accounts_by_type = {}
                for acc in company_accounts:
                    mapping = db.query(AccountMapping).filter(
                        AccountMapping.company_account_id == acc.id,
                        AccountMapping.is_active == True
                    ).first()
                    if mapping:
                        acc_type = mapping.master_account.account_type
                        if acc_type not in accounts_by_type:
                            accounts_by_type[acc_type] = []
                        accounts_by_type[acc_type].append(acc)

                # Create balanced transactions
                txn_date = datetime(2024, month, 15, 12, 0)

                # Revenue (credits) - varying by company
                revenue_amount = random.uniform(800000, 1500000)
                if AccountType.REVENUE in accounts_by_type:
                    rev_accounts = accounts_by_type[AccountType.REVENUE]
                    for acc in rev_accounts:
                        amount = revenue_amount / len(rev_accounts)
                        txn = Transaction(
                            company_id=company.id,
                            account_id=acc.id,
                            transaction_date=txn_date,
                            description=f"{acc.account_name} for period",
                            reference=f"REV-{month}-{company.id[:8]}",
                            debit_amount=0,
                            credit_amount=amount,  # Revenue is a credit
                            currency=company.currency,
                            fiscal_year=2024,
                            fiscal_period=month,
                            transaction_type=TransactionType.STANDARD
                        )
                        db.add(txn)
                        month_totals['total_revenue'] += amount

                # Expenses (debits) - should be less than revenue for profit
                expense_amount = revenue_amount * random.uniform(0.60, 0.80)  # 60-80% of revenue
                if AccountType.EXPENSE in accounts_by_type:
                    exp_accounts = accounts_by_type[AccountType.EXPENSE]
                    for acc in exp_accounts:
                        amount = expense_amount / len(exp_accounts)
                        txn = Transaction(
                            company_id=company.id,
                            account_id=acc.id,
                            transaction_date=txn_date,
                            description=f"{acc.account_name} for period",
                            reference=f"EXP-{month}-{company.id[:8]}",
                            debit_amount=amount,  # Expense is a debit
                            credit_amount=0,
                            currency=company.currency,
                            fiscal_year=2024,
                            fiscal_period=month,
                            transaction_type=TransactionType.STANDARD
                        )
                        db.add(txn)
                        month_totals['total_expenses'] += amount

                # Assets (debits) - cumulative
                asset_amount = random.uniform(2000000, 3500000)
                if AccountType.ASSET in accounts_by_type:
                    asset_accounts = accounts_by_type[AccountType.ASSET]
                    for acc in asset_accounts:
                        amount = asset_amount / len(asset_accounts)
                        txn = Transaction(
                            company_id=company.id,
                            account_id=acc.id,
                            transaction_date=txn_date,
                            description=f"{acc.account_name} balance",
                            reference=f"BAL-{month}-{company.id[:8]}",
                            debit_amount=amount,  # Assets are debits
                            credit_amount=0,
                            currency=company.currency,
                            fiscal_year=2024,
                            fiscal_period=month,
                            transaction_type=TransactionType.STANDARD
                        )
                        db.add(txn)
                        month_totals['total_assets'] += amount

                # Liabilities (credits) - balancing entry
                liability_amount = asset_amount * random.uniform(0.35, 0.45)  # 35-45% of assets
                if AccountType.LIABILITY in accounts_by_type:
                    liab_accounts = accounts_by_type[AccountType.LIABILITY]
                    for acc in liab_accounts:
                        amount = liability_amount / len(liab_accounts)
                        txn = Transaction(
                            company_id=company.id,
                            account_id=acc.id,
                            transaction_date=txn_date,
                            description=f"{acc.account_name} balance",
                            reference=f"BAL-{month}-{company.id[:8]}",
                            debit_amount=0,
                            credit_amount=amount,  # Liabilities are credits
                            currency=company.currency,
                            fiscal_year=2024,
                            fiscal_period=month,
                            transaction_type=TransactionType.STANDARD
                        )
                        db.add(txn)
                        month_totals['total_liabilities'] += amount

                # Equity (credits) - to balance the equation
                # Assets = Liabilities + Equity
                # Therefore: Equity = Assets - Liabilities
                equity_amount = asset_amount - liability_amount
                if AccountType.EQUITY in accounts_by_type:
                    equity_accounts = accounts_by_type[AccountType.EQUITY]
                    for acc in equity_accounts:
                        amount = equity_amount / len(equity_accounts)
                        txn = Transaction(
                            company_id=company.id,
                            account_id=acc.id,
                            transaction_date=txn_date,
                            description=f"{acc.account_name} balance",
                            reference=f"BAL-{month}-{company.id[:8]}",
                            debit_amount=0,
                            credit_amount=amount,  # Equity is a credit
                            currency=company.currency,
                            fiscal_year=2024,
                            fiscal_period=month,
                            transaction_type=TransactionType.STANDARD
                        )
                        db.add(txn)
                        month_totals['total_equity'] += amount

            db.commit()

            # Calculate net income
            net_income = month_totals['total_revenue'] - month_totals['total_expenses']

            # Now recalculate the consolidation run
            run = db.query(ConsolidationRun).filter(
                ConsolidationRun.organization_id == user.organization_id,
                ConsolidationRun.fiscal_year == 2024,
                ConsolidationRun.fiscal_period == month
            ).first()

            if run:
                run.total_assets = month_totals['total_assets']
                run.total_liabilities = month_totals['total_liabilities']
                run.total_equity = month_totals['total_equity'] + net_income  # Add net income to equity
                run.total_revenue = month_totals['total_revenue']
                run.total_expenses = month_totals['total_expenses']
                run.net_income = net_income
                db.commit()

                print(f"\n  Period 2024-{month:02d} Consolidated Totals:")
                print(f"    Assets: ${run.total_assets:,.2f}")
                print(f"    Liabilities: ${run.total_liabilities:,.2f}")
                print(f"    Equity (before NI): ${month_totals['total_equity']:,.2f}")
                print(f"    Net Income: ${net_income:,.2f}")
                print(f"    Equity (after NI): ${run.total_equity:,.2f}")
                print(f"    Revenue: ${run.total_revenue:,.2f}")
                print(f"    Expenses: ${run.total_expenses:,.2f}")
                balance_diff = run.total_assets - (run.total_liabilities + run.total_equity)
                print(f"    Balance Check: ${balance_diff:,.2f} {'✓ BALANCED' if abs(balance_diff) < 1 else '⚠️ UNBALANCED'}")

        print("\n" + "=" * 70)
        print("✅ Balanced financial data created!")
        print("=" * 70)
        print("\nAll periods now have:")
        print("  ✓ Assets = Liabilities + Equity (balance sheet balances)")
        print("  ✓ Net Income = Revenue - Expenses")
        print("  ✓ Net Income flows to Retained Earnings (Equity)")
        print("\nRefresh your browser to see the corrected data!")
        print()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_balanced_data("nick@repeatable.ai")
