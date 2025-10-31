"""
Fix and reseed data with correct fiscal periods
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from datetime import datetime, timedelta
import random
from app.core.database import SessionLocal
from app.models.user import User
from app.models.consolidation import Transaction, Company, CompanyAccount, AccountType, TransactionType

def fix_transactions(email):
    db = SessionLocal()
    try:
        print(f"🔧 Fixing transaction dates for {email}...")

        user = db.query(User).filter(User.email == email).first()
        if not user or not user.organization_id:
            print("User/org not found")
            return

        companies = db.query(Company).filter(Company.organization_id == user.organization_id).all()

        # Delete existing transactions
        for company in companies:
            db.query(Transaction).filter(Transaction.company_id == company.id).delete()
        db.commit()
        print("✓ Deleted old transactions")

        # Create new transactions for Oct, Nov, Dec 2024
        print("Creating transactions for Oct, Nov, Dec 2024...")

        transaction_count = 0
        for company in companies:
            company_accounts = db.query(CompanyAccount).filter(
                CompanyAccount.company_id == company.id
            ).all()

            if not company_accounts:
                continue

            # Create transactions for each month
            for month in [10, 11, 12]:
                # Determine number of days in month
                if month in [10, 12]:
                    days = 31
                else:
                    days = 30

                for day in range(1, days + 1):
                    txn_date = datetime(2024, month, day, random.randint(8, 17), random.randint(0, 59))

                    # Create 3-5 transactions per day
                    for _ in range(random.randint(3, 5)):
                        account = random.choice(company_accounts)
                        amount = random.uniform(5000, 100000)

                        is_debit = account.account_type in [AccountType.ASSET, AccountType.EXPENSE]

                        txn = Transaction(
                            company_id=company.id,
                            account_id=account.id,
                            transaction_date=txn_date,
                            description=f"{account.account_name} transaction",
                            reference=f"TXN-{random.randint(10000, 99999)}",
                            debit_amount=amount if is_debit else 0,
                            credit_amount=0 if is_debit else amount,
                            currency=company.currency,
                            fiscal_year=2024,
                            fiscal_period=month,
                            transaction_type=TransactionType.STANDARD
                        )
                        db.add(txn)
                        transaction_count += 1

        db.commit()
        print(f"✓ Created {transaction_count} transactions for Oct-Dec 2024")

        # Verify
        for company in companies:
            for month in [10, 11, 12]:
                count = db.query(Transaction).filter(
                    Transaction.company_id == company.id,
                    Transaction.fiscal_year == 2024,
                    Transaction.fiscal_period == month
                ).count()
                print(f"  {company.name} - 2024-{month:02d}: {count} transactions")

        print("\n✅ Data fixed successfully!")
        print("Refresh your browser and click on consolidation runs to see the breakdowns!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_transactions("nick@repeatable.ai")
