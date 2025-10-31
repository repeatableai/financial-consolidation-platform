"""
Seed Database with Synthetic Data
Run this script to populate the database with realistic sample data
Usage: python seed_data.py
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from datetime import datetime, timedelta
from decimal import Decimal
import random
from app.core.database import SessionLocal
from app.models.user import User
from app.models.consolidation import (
    Organization, Company, MasterAccount, CompanyAccount,
    AccountMapping, Transaction, ConsolidationRun,
    AccountType, TransactionType, ConsolidationStatus
)
from app.core.security import get_password_hash

def seed_database():
    db = SessionLocal()

    try:
        print("🌱 Starting database seeding with synthetic data...")
        print()

        # Check if user exists, if not create demo user
        demo_user = db.query(User).filter(User.email == "demo@example.com").first()
        if not demo_user:
            print("Creating demo user...")
            demo_user = User(
                email="demo@example.com",
                hashed_password=get_password_hash("demo123"),
                full_name="Demo User",
                is_active=True
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            print(f"✓ Demo user created: demo@example.com / demo123")
        else:
            print(f"✓ Using existing demo user: {demo_user.email}")

        # Create or get organization
        org = db.query(Organization).filter(Organization.owner_id == demo_user.id).first()
        if not org:
            print("\nCreating organization...")
            org = Organization(
                name="TechCorp Holdings",
                description="Multi-national technology conglomerate",
                fiscal_year_end_month=12,
                default_currency="USD",
                owner_id=demo_user.id
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            demo_user.organization_id = org.id
            db.commit()
            print(f"✓ Organization created: {org.name}")
        else:
            print(f"✓ Using existing organization: {org.name}")

        # Create Companies
        print("\nCreating companies...")
        companies_data = [
            {
                "name": "TechCorp USA",
                "legal_name": "TechCorp USA Inc.",
                "entity_type": "Corporation",
                "tax_id": "12-3456789",
                "industry": "Technology",
                "currency": "USD",
                "description": "US-based software development and consulting"
            },
            {
                "name": "TechCorp Europe",
                "legal_name": "TechCorp Europe GmbH",
                "entity_type": "Subsidiary",
                "tax_id": "DE123456789",
                "industry": "Technology",
                "currency": "EUR",
                "description": "European operations and sales"
            },
            {
                "name": "DataSolutions LLC",
                "legal_name": "DataSolutions LLC",
                "entity_type": "LLC",
                "tax_id": "98-7654321",
                "industry": "Data Analytics",
                "currency": "USD",
                "description": "Data analytics and business intelligence"
            },
            {
                "name": "CloudServices Inc",
                "legal_name": "CloudServices Incorporated",
                "entity_type": "Corporation",
                "tax_id": "45-6789012",
                "industry": "Cloud Computing",
                "currency": "USD",
                "description": "Cloud infrastructure and SaaS products"
            }
        ]

        companies = []
        for comp_data in companies_data:
            existing = db.query(Company).filter(
                Company.organization_id == org.id,
                Company.name == comp_data["name"]
            ).first()

            if not existing:
                company = Company(organization_id=org.id, **comp_data)
                db.add(company)
                db.commit()
                db.refresh(company)
                companies.append(company)
                print(f"  ✓ {company.name}")
            else:
                companies.append(existing)
                print(f"  ✓ {existing.name} (existing)")

        # Create Master Chart of Accounts
        print("\nCreating master chart of accounts...")
        master_accounts_data = [
            # Assets
            {"number": "1000", "name": "Cash and Cash Equivalents", "type": AccountType.ASSET, "category": "Current Assets"},
            {"number": "1100", "name": "Accounts Receivable", "type": AccountType.ASSET, "category": "Current Assets"},
            {"number": "1200", "name": "Inventory", "type": AccountType.ASSET, "category": "Current Assets"},
            {"number": "1300", "name": "Prepaid Expenses", "type": AccountType.ASSET, "category": "Current Assets"},
            {"number": "1500", "name": "Property, Plant & Equipment", "type": AccountType.ASSET, "category": "Fixed Assets"},
            {"number": "1600", "name": "Accumulated Depreciation", "type": AccountType.ASSET, "category": "Fixed Assets"},
            {"number": "1700", "name": "Intangible Assets", "type": AccountType.ASSET, "category": "Fixed Assets"},
            {"number": "1800", "name": "Goodwill", "type": AccountType.ASSET, "category": "Fixed Assets"},

            # Liabilities
            {"number": "2000", "name": "Accounts Payable", "type": AccountType.LIABILITY, "category": "Current Liabilities"},
            {"number": "2100", "name": "Accrued Expenses", "type": AccountType.LIABILITY, "category": "Current Liabilities"},
            {"number": "2200", "name": "Short-term Debt", "type": AccountType.LIABILITY, "category": "Current Liabilities"},
            {"number": "2300", "name": "Deferred Revenue", "type": AccountType.LIABILITY, "category": "Current Liabilities"},
            {"number": "2500", "name": "Long-term Debt", "type": AccountType.LIABILITY, "category": "Long-term Liabilities"},
            {"number": "2600", "name": "Lease Obligations", "type": AccountType.LIABILITY, "category": "Long-term Liabilities"},

            # Equity
            {"number": "3000", "name": "Common Stock", "type": AccountType.EQUITY, "category": "Shareholders' Equity"},
            {"number": "3100", "name": "Retained Earnings", "type": AccountType.EQUITY, "category": "Shareholders' Equity"},
            {"number": "3200", "name": "Additional Paid-in Capital", "type": AccountType.EQUITY, "category": "Shareholders' Equity"},

            # Revenue
            {"number": "4000", "name": "Product Revenue", "type": AccountType.REVENUE, "category": "Operating Revenue"},
            {"number": "4100", "name": "Service Revenue", "type": AccountType.REVENUE, "category": "Operating Revenue"},
            {"number": "4200", "name": "Subscription Revenue", "type": AccountType.REVENUE, "category": "Operating Revenue"},
            {"number": "4300", "name": "Consulting Revenue", "type": AccountType.REVENUE, "category": "Operating Revenue"},
            {"number": "4900", "name": "Other Income", "type": AccountType.REVENUE, "category": "Other Revenue"},

            # Expenses
            {"number": "5000", "name": "Cost of Goods Sold", "type": AccountType.EXPENSE, "category": "Direct Costs"},
            {"number": "5100", "name": "Cost of Services", "type": AccountType.EXPENSE, "category": "Direct Costs"},
            {"number": "6000", "name": "Salaries and Wages", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6100", "name": "Employee Benefits", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6200", "name": "Rent Expense", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6300", "name": "Utilities", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6400", "name": "Marketing and Advertising", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6500", "name": "Research and Development", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6600", "name": "Professional Services", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6700", "name": "Insurance", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6800", "name": "Depreciation Expense", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "6900", "name": "Travel and Entertainment", "type": AccountType.EXPENSE, "category": "Operating Expenses"},
            {"number": "7000", "name": "Interest Expense", "type": AccountType.EXPENSE, "category": "Financial Expenses"},
        ]

        master_accounts = []
        for ma_data in master_accounts_data:
            existing = db.query(MasterAccount).filter(
                MasterAccount.organization_id == org.id,
                MasterAccount.account_number == ma_data["number"]
            ).first()

            if not existing:
                ma = MasterAccount(
                    organization_id=org.id,
                    account_number=ma_data["number"],
                    account_name=ma_data["name"],
                    account_type=ma_data["type"],
                    category=ma_data["category"]
                )
                db.add(ma)
                db.commit()
                db.refresh(ma)
                master_accounts.append(ma)
            else:
                master_accounts.append(existing)

        print(f"  ✓ Created {len(master_accounts)} master accounts")

        # Create Company Accounts and Mappings
        print("\nCreating company accounts and mappings...")

        # Company-specific account naming variations
        company_account_templates = {
            "TechCorp USA": [
                ("1010", "Operating Cash Account", "1000", AccountType.ASSET),
                ("1020", "Petty Cash", "1000", AccountType.ASSET),
                ("1110", "Trade Receivables", "1100", AccountType.ASSET),
                ("1210", "Software Inventory", "1200", AccountType.ASSET),
                ("1510", "Computer Equipment", "1500", AccountType.ASSET),
                ("1520", "Office Furniture", "1500", AccountType.ASSET),
                ("2010", "Trade Payables", "2000", AccountType.LIABILITY),
                ("2110", "Accrued Salaries", "2100", AccountType.LIABILITY),
                ("4010", "Software Sales", "4000", AccountType.REVENUE),
                ("4110", "Support Services", "4100", AccountType.REVENUE),
                ("4210", "SaaS Subscriptions", "4200", AccountType.REVENUE),
                ("6010", "Developer Salaries", "6000", AccountType.EXPENSE),
                ("6410", "Digital Marketing", "6400", AccountType.EXPENSE),
                ("6510", "Product Development", "6500", AccountType.EXPENSE),
            ],
            "TechCorp Europe": [
                ("1001", "Bank Account EUR", "1000", AccountType.ASSET),
                ("1101", "Customer Receivables", "1100", AccountType.ASSET),
                ("1501", "IT Equipment", "1500", AccountType.ASSET),
                ("2001", "Supplier Payables", "2000", AccountType.LIABILITY),
                ("4001", "Product Sales EUR", "4000", AccountType.REVENUE),
                ("4101", "Consulting EUR", "4300", AccountType.REVENUE),
                ("6001", "Employee Costs", "6000", AccountType.EXPENSE),
                ("6201", "Office Rent EUR", "6200", AccountType.EXPENSE),
                ("6401", "Marketing EUR", "6400", AccountType.EXPENSE),
            ],
            "DataSolutions LLC": [
                ("100", "Main Checking", "1000", AccountType.ASSET),
                ("110", "A/R - Clients", "1100", AccountType.ASSET),
                ("150", "Computer Hardware", "1500", AccountType.ASSET),
                ("200", "A/P - Vendors", "2000", AccountType.LIABILITY),
                ("400", "Analytics Services", "4100", AccountType.REVENUE),
                ("410", "Data Consulting", "4300", AccountType.REVENUE),
                ("600", "Staff Payroll", "6000", AccountType.EXPENSE),
                ("640", "Client Acquisition", "6400", AccountType.EXPENSE),
            ],
            "CloudServices Inc": [
                ("1001", "Cash - Operations", "1000", AccountType.ASSET),
                ("1101", "Receivables", "1100", AccountType.ASSET),
                ("1501", "Server Equipment", "1500", AccountType.ASSET),
                ("1701", "Software Licenses", "1700", AccountType.ASSET),
                ("2001", "Payables", "2000", AccountType.LIABILITY),
                ("4001", "Cloud Hosting Revenue", "4200", AccountType.REVENUE),
                ("4101", "Professional Services", "4100", AccountType.REVENUE),
                ("6001", "Engineering Salaries", "6000", AccountType.EXPENSE),
                ("6501", "R&D Expenses", "6500", AccountType.EXPENSE),
            ]
        }

        total_mappings = 0
        for company in companies:
            templates = company_account_templates.get(company.name, [])
            for acc_num, acc_name, master_num, acc_type in templates:
                # Create company account
                existing_acc = db.query(CompanyAccount).filter(
                    CompanyAccount.company_id == company.id,
                    CompanyAccount.account_number == acc_num
                ).first()

                if not existing_acc:
                    comp_acc = CompanyAccount(
                        company_id=company.id,
                        account_number=acc_num,
                        account_name=acc_name,
                        account_type=acc_type
                    )
                    db.add(comp_acc)
                    db.commit()
                    db.refresh(comp_acc)

                    # Create mapping
                    master = next((m for m in master_accounts if m.account_number == master_num), None)
                    if master:
                        mapping = AccountMapping(
                            company_account_id=comp_acc.id,
                            master_account_id=master.id,
                            confidence_score=random.uniform(0.85, 0.99),
                            mapping_source="seeded",
                            is_verified=True
                        )
                        db.add(mapping)
                        db.commit()
                        total_mappings += 1

        print(f"  ✓ Created company accounts and {total_mappings} mappings")

        # Create Transactions
        print("\nCreating sample transactions...")

        transaction_count = 0
        for company in companies:
            company_accounts = db.query(CompanyAccount).filter(
                CompanyAccount.company_id == company.id
            ).all()

            if not company_accounts:
                continue

            # Create transactions for the last 3 months
            base_date = datetime.utcnow() - timedelta(days=90)

            for day in range(90):
                txn_date = base_date + timedelta(days=day)
                fiscal_year = txn_date.year
                fiscal_period = txn_date.month

                # Create 3-5 random transactions per day
                num_txns = random.randint(3, 5)

                for _ in range(num_txns):
                    account = random.choice(company_accounts)
                    amount = random.uniform(1000, 50000)

                    # Determine if debit or credit based on account type
                    is_debit = account.account_type in [AccountType.ASSET, AccountType.EXPENSE]

                    txn = Transaction(
                        company_id=company.id,
                        account_id=account.id,
                        transaction_date=txn_date,
                        description=f"Transaction for {account.account_name}",
                        reference=f"TXN-{random.randint(10000, 99999)}",
                        debit_amount=amount if is_debit else 0,
                        credit_amount=0 if is_debit else amount,
                        currency=company.currency,
                        transaction_type=TransactionType.STANDARD,
                        fiscal_year=fiscal_year,
                        fiscal_period=fiscal_period
                    )
                    db.add(txn)
                    transaction_count += 1

        db.commit()
        print(f"  ✓ Created {transaction_count} transactions across all companies")

        # Create Consolidation Runs
        print("\nCreating sample consolidation runs...")

        consolidation_dates = [
            (2024, 10, datetime(2024, 10, 31)),
            (2024, 11, datetime(2024, 11, 30)),
            (2024, 12, datetime(2024, 12, 31)),
        ]

        for year, period, end_date in consolidation_dates:
            existing_run = db.query(ConsolidationRun).filter(
                ConsolidationRun.organization_id == org.id,
                ConsolidationRun.fiscal_year == year,
                ConsolidationRun.fiscal_period == period
            ).first()

            if not existing_run:
                consolidation = ConsolidationRun(
                    organization_id=org.id,
                    run_name=f"Consolidation {year}-{period:02d}",
                    description=f"Monthly consolidation for {year}-{period:02d}",
                    fiscal_year=year,
                    fiscal_period=period,
                    period_end_date=end_date,
                    status=ConsolidationStatus.COMPLETED,
                    total_assets=random.uniform(5000000, 8000000),
                    total_liabilities=random.uniform(2000000, 3500000),
                    total_equity=random.uniform(2500000, 4500000),
                    total_revenue=random.uniform(1000000, 2000000),
                    total_expenses=random.uniform(700000, 1500000),
                    net_income=random.uniform(200000, 500000),
                    companies_included=[c.id for c in companies],
                    elimination_count=random.randint(5, 15),
                    processing_time_seconds=random.uniform(2.5, 8.3),
                    completed_at=end_date
                )
                db.add(consolidation)
                db.commit()
                print(f"  ✓ {consolidation.run_name}")

        print()
        print("=" * 70)
        print("✅ Database seeding completed successfully!")
        print("=" * 70)
        print()
        print("📊 Summary:")
        print(f"  • Demo User: demo@example.com / demo123")
        print(f"  • Organization: {org.name}")
        print(f"  • Companies: {len(companies)}")
        print(f"  • Master Accounts: {len(master_accounts)}")
        print(f"  • Account Mappings: {total_mappings}")
        print(f"  • Transactions: {transaction_count}")
        print(f"  • Consolidation Runs: 3")
        print()
        print("🌐 Access your app at: http://localhost:3000")
        print("   Login with: demo@example.com / demo123")
        print()

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
