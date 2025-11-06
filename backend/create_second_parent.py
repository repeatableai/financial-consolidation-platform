"""
Create Second Parent Company: GlobalTech International
Run this script to create a second parent company with member companies for testing
Usage: python create_second_parent.py
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from datetime import datetime, timedelta
from decimal import Decimal
import random
import uuid
from app.core.database import SessionLocal
from app.models.user import User
from app.models.consolidation import (
    Organization, ParentCompany, Company, MasterAccount, CompanyAccount,
    AccountMapping, Transaction, ConsolidationRun,
    AccountType, TransactionType, ConsolidationStatus, CompanyType, ConsolidationMethod
)

def create_globaltech():
    db = SessionLocal()

    try:
        print("🌍 Creating GlobalTech International (Second Parent Company)...")
        print()

        # Get demo user
        demo_user = db.query(User).filter(User.email == "demo@example.com").first()
        if not demo_user:
            print("❌ Demo user not found. Please run seed_data.py first.")
            return

        # Get organization
        org = db.query(Organization).filter(Organization.owner_id == demo_user.id).first()
        if not org:
            print("❌ Organization not found. Please run seed_data.py first.")
            return

        print(f"✓ Using organization: {org.name}")

        # Check if GlobalTech already exists
        existing = db.query(ParentCompany).filter(
            ParentCompany.name == "GlobalTech International"
        ).first()

        if existing:
            print("⚠ GlobalTech International already exists. Deleting and recreating...")

            # Get all member companies for this parent
            member_companies = db.query(Company).filter(Company.parent_company_id == existing.id).all()

            for company in member_companies:
                # Delete transactions first
                db.query(Transaction).filter(Transaction.company_id == company.id).delete()

                # Get company accounts
                company_accounts = db.query(CompanyAccount).filter(CompanyAccount.company_id == company.id).all()

                for ca in company_accounts:
                    # Delete account mappings
                    db.query(AccountMapping).filter(AccountMapping.company_account_id == ca.id).delete()

                # Delete company accounts
                db.query(CompanyAccount).filter(CompanyAccount.company_id == company.id).delete()

            # Delete consolidation runs for GlobalTech (by name pattern)
            db.query(ConsolidationRun).filter(
                ConsolidationRun.organization_id == org.id,
                ConsolidationRun.run_name.like("GlobalTech%")
            ).delete(synchronize_session=False)

            # Delete member companies
            db.query(Company).filter(Company.parent_company_id == existing.id).delete()

            # Delete parent company
            db.delete(existing)
            db.commit()

        # Create GlobalTech International Parent Company
        print("\nCreating GlobalTech International parent company...")
        parent_id = str(uuid.uuid4())
        globaltech_parent = ParentCompany(
            id=parent_id,
            organization_id=org.id,
            name="GlobalTech International",
            legal_name="GlobalTech International Ltd.",
            tax_id="EU987654321",
            incorporation_country="Ireland",
            fiscal_year_end_month=12,
            reporting_currency="EUR",
            accounting_standard="IFRS",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(globaltech_parent)
        db.commit()
        print(f"✓ Parent company created: {globaltech_parent.name} (EUR, IFRS)")

        # Create Member Companies
        print("\nCreating member companies...")

        member_companies_data = [
            {
                "name": "GlobalTech France",
                "legal_name": "GlobalTech France SAS",
                "tax_id": "FR123456789",
                "industry": "Software Development",
                "currency": "EUR",
                "ownership": 100.0,
                "goodwill": 0,
                "description": "French software development and consulting",
                "revenue": 2500000,  # €2.5M
                "assets": 5000000,   # €5M
            },
            {
                "name": "GlobalTech Germany",
                "legal_name": "GlobalTech Deutschland GmbH",
                "tax_id": "DE987654321",
                "industry": "Enterprise Software",
                "currency": "EUR",
                "ownership": 100.0,
                "goodwill": 0,
                "description": "German enterprise software solutions",
                "revenue": 3200000,  # €3.2M
                "assets": 7000000,   # €7M
            },
            {
                "name": "AcquiredTech Spain",
                "legal_name": "AcquiredTech España SL",
                "tax_id": "ES456789123",
                "industry": "Cloud Services",
                "currency": "EUR",
                "ownership": 75.0,  # 25% minority interest
                "goodwill": 350000,  # €350k goodwill from acquisition
                "description": "Spanish cloud services provider (acquired)",
                "revenue": 1800000,  # €1.8M
                "assets": 3500000,   # €3.5M
            }
        ]

        member_companies = []
        for comp_data in member_companies_data:
            company = Company(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                parent_company_id=globaltech_parent.id,
                name=comp_data["name"],
                legal_name=comp_data["legal_name"],
                entity_type="Subsidiary",
                tax_id=comp_data["tax_id"],
                industry=comp_data["industry"],
                currency=comp_data["currency"],
                company_type=CompanyType.MEMBER,
                ownership_percentage=comp_data["ownership"],
                consolidation_method=ConsolidationMethod.FULL,
                goodwill_amount=comp_data["goodwill"],
                description=comp_data["description"],
                is_active=True,
                created_at=datetime.now()
            )
            db.add(company)
            member_companies.append((company, comp_data))
            print(f"  ✓ {comp_data['name']} ({comp_data['ownership']}% ownership)")

        db.commit()

        # Create Master Accounts for GlobalTech
        print("\nCreating master chart of accounts...")
        master_accounts_data = [
            # Assets
            ("1000", "Cash and Cash Equivalents", AccountType.ASSET),
            ("1100", "Accounts Receivable", AccountType.ASSET),
            ("1200", "Inventory", AccountType.ASSET),
            ("1300", "Prepaid Expenses", AccountType.ASSET),
            ("1500", "Property, Plant & Equipment", AccountType.ASSET),
            ("1600", "Accumulated Depreciation", AccountType.ASSET),
            ("1700", "Intangible Assets", AccountType.ASSET),
            ("1800", "Goodwill", AccountType.ASSET),
            # Liabilities
            ("2000", "Accounts Payable", AccountType.LIABILITY),
            ("2100", "Accrued Expenses", AccountType.LIABILITY),
            ("2200", "Short-term Debt", AccountType.LIABILITY),
            ("2500", "Long-term Debt", AccountType.LIABILITY),
            # Equity
            ("3000", "Share Capital", AccountType.EQUITY),
            ("3100", "Retained Earnings", AccountType.EQUITY),
            ("3200", "Other Comprehensive Income", AccountType.EQUITY),
            ("3300", "Non-Controlling Interest", AccountType.EQUITY),
            # Revenue
            ("4000", "Software License Revenue", AccountType.REVENUE),
            ("4100", "Subscription Revenue", AccountType.REVENUE),
            ("4200", "Consulting Revenue", AccountType.REVENUE),
            # Expenses
            ("5000", "Cost of Revenue", AccountType.EXPENSE),
            ("5100", "Salaries and Wages", AccountType.EXPENSE),
            ("5200", "Rent and Facilities", AccountType.EXPENSE),
            ("5300", "Marketing and Sales", AccountType.EXPENSE),
            ("5400", "Research and Development", AccountType.EXPENSE),
            ("5500", "General and Administrative", AccountType.EXPENSE),
            ("5600", "Depreciation and Amortization", AccountType.EXPENSE),
        ]

        master_accounts = {}
        for acct_num, acct_name, acct_type in master_accounts_data:
            ma = MasterAccount(
                id=str(uuid.uuid4()),
                organization_id=org.id,
                account_number=acct_num,
                account_name=acct_name,
                account_type=acct_type,
                is_active=True
            )
            db.add(ma)
            master_accounts[(acct_num, acct_name)] = ma

        db.commit()
        print(f"✓ Created {len(master_accounts)} master accounts (IFRS)")

        # Create Company Accounts and Transactions for each member
        print("\nCreating transactions for Q1 2024...")

        for company, comp_data in member_companies:
            print(f"\n  Processing {company.name}...")

            # Create company-specific accounts
            company_accounts = {}
            for (acct_num, acct_name), master_acct in master_accounts.items():
                ca = CompanyAccount(
                    id=str(uuid.uuid4()),
                    company_id=company.id,
                    account_number=acct_num,
                    account_name=acct_name,
                    account_type=master_acct.account_type,
                    is_active=True
                )
                db.add(ca)
                company_accounts[acct_num] = ca

                # Create account mapping
                mapping = AccountMapping(
                    id=str(uuid.uuid4()),
                    company_account_id=ca.id,
                    master_account_id=master_acct.id
                )
                db.add(mapping)

            db.commit()

            # Generate transactions
            revenue = comp_data["revenue"]
            assets = comp_data["assets"]

            # Balance Sheet transactions
            transactions = [
                # Assets
                ("1000", revenue * 0.25, 0, "Opening balance - Cash"),
                ("1100", revenue * 0.20, 0, "Opening balance - AR"),
                ("1200", revenue * 0.10, 0, "Opening balance - Inventory"),
                ("1500", assets * 0.30, 0, "Opening balance - PP&E"),
                ("1600", 0, assets * 0.10, "Accumulated depreciation"),
                ("1700", assets * 0.08, 0, "Opening balance - Intangibles"),

                # Liabilities
                ("2000", 0, assets * 0.25, "Opening balance - AP"),
                ("2100", 0, assets * 0.15, "Opening balance - Accrued expenses"),
                ("2500", 0, assets * 0.20, "Opening balance - Long-term debt"),

                # Equity
                ("3000", 0, assets * 0.15, "Share capital"),
                ("3100", 0, assets * 0.10, "Retained earnings"),

                # Revenue for Q1
                ("4000", 0, revenue * 0.50, "Q1 License revenue"),
                ("4100", 0, revenue * 0.35, "Q1 Subscription revenue"),
                ("4200", 0, revenue * 0.15, "Q1 Consulting revenue"),

                # Expenses for Q1
                ("5000", revenue * 0.30, 0, "Q1 Cost of revenue"),
                ("5100", revenue * 0.25, 0, "Q1 Salaries"),
                ("5200", revenue * 0.05, 0, "Q1 Rent"),
                ("5300", revenue * 0.10, 0, "Q1 Marketing"),
                ("5400", revenue * 0.08, 0, "Q1 R&D"),
                ("5500", revenue * 0.07, 0, "Q1 G&A"),
            ]

            for acct_num, debit, credit, desc in transactions:
                if acct_num in company_accounts:
                    txn = Transaction(
                        id=str(uuid.uuid4()),
                        company_id=company.id,
                        account_id=company_accounts[acct_num].id,
                        transaction_date=datetime(2024, 3, 31),
                        description=desc,
                        debit_amount=Decimal(str(debit)),
                        credit_amount=Decimal(str(credit)),
                        fiscal_year=2024,
                        fiscal_period=3,
                        transaction_type=TransactionType.STANDARD,
                        created_at=datetime.now()
                    )
                    db.add(txn)

            print(f"    ✓ Created {len(transactions)} transactions")

        db.commit()

        # Create consolidation run
        print("\nCreating consolidation run for GlobalTech...")

        total_revenue = sum(c["revenue"] for _, c in member_companies)
        total_assets = sum(c["assets"] for _, c in member_companies)
        total_expenses = total_revenue * 0.85
        net_income = total_revenue - total_expenses

        # Calculate NCI for AcquiredTech Spain (25%)
        spain_revenue = 1800000
        spain_expenses = spain_revenue * 0.85
        spain_net_income = spain_revenue - spain_expenses
        nci_income = spain_net_income * 0.25
        nci_equity = 3500000 * 0.25  # 25% of AcquiredTech Spain assets

        consolidation = ConsolidationRun(
            id=str(uuid.uuid4()),
            organization_id=org.id,
            run_name="GlobalTech Q1 2024",
            fiscal_year=2024,
            fiscal_period=3,
            period_end_date=datetime(2024, 3, 31),
            companies_included=[str(c.id) for c, _ in member_companies],
            total_revenue=Decimal(str(total_revenue)),
            total_expenses=Decimal(str(total_expenses)),
            net_income=Decimal(str(net_income)),
            total_assets=Decimal(str(total_assets)),
            total_liabilities=Decimal(str(total_assets * 0.60)),
            total_equity=Decimal(str(total_assets * 0.40)),
            status=ConsolidationStatus.COMPLETED,
            created_at=datetime.now(),
            completed_at=datetime.now()
        )
        db.add(consolidation)
        db.commit()

        print(f"✓ Consolidation run created: {consolidation.run_name}")
        print(f"  Total Revenue: €{total_revenue:,.0f}")
        print(f"  Net Income: €{net_income:,.0f}")
        print(f"  Total Assets: €{total_assets:,.0f}")
        print(f"  NCI Income: €{nci_income:,.0f}")

        print("\n✅ GlobalTech International created successfully!")
        print(f"\n📊 Summary:")
        print(f"  Parent: {globaltech_parent.name}")
        print(f"  Currency: {globaltech_parent.reporting_currency}")
        print(f"  Standard: {globaltech_parent.accounting_standard}")
        print(f"  Members: {len(member_companies)}")
        print(f"    - GlobalTech France (100%)")
        print(f"    - GlobalTech Germany (100%)")
        print(f"    - AcquiredTech Spain (75% - 25% NCI)")
        print(f"\n💡 You can now switch between TechCorp Holdings and GlobalTech International!")

    except Exception as e:
        print(f"\n❌ Error creating GlobalTech: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_globaltech()
