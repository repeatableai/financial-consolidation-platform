"""
Update Consolidation Numbers to Show Different Data for Each Parent
This script updates existing consolidation runs to show distinctly different
financial data for TechCorp Holdings vs GlobalTech International
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from decimal import Decimal
from app.core.database import SessionLocal
from app.models.consolidation import ParentCompany, Company, ConsolidationRun

def update_consolidation_numbers():
    db = SessionLocal()

    try:
        print("📊 Updating Consolidation Numbers for Each Parent Company")
        print("=" * 80)
        print()

        # Get both parent companies
        parents = db.query(ParentCompany).all()

        for parent in parents:
            print(f"\n{parent.name} ({parent.reporting_currency}/{parent.accounting_standard})")
            print("-" * 80)

            # Get member company IDs
            member_ids = [str(m.id) for m in db.query(Company).filter(Company.parent_company_id == parent.id).all()]
            print(f"Member companies: {len(member_ids)}")

            # Get consolidation runs where companies_included matches this parent's members
            all_runs = db.query(ConsolidationRun).filter(
                ConsolidationRun.organization_id == parent.organization_id
            ).all()

            parent_runs = []
            for run in all_runs:
                if run.companies_included:
                    # Check if any of this parent's members are in the run
                    run_company_ids = run.companies_included if isinstance(run.companies_included, list) else []
                    if any(mid in run_company_ids for mid in member_ids):
                        parent_runs.append(run)

            print(f"Consolidation runs to update: {len(parent_runs)}")

            # Define different financial profiles
            if parent.name == "TechCorp Holdings":
                # Larger company with 9 members (USD)
                base_revenue = 45000000  # $45M
                base_assets = 125000000   # $125M
                print(f"\nUpdating to LARGER numbers (9 companies, USD):")

            elif parent.name == "GlobalTech International":
                # Smaller company with 3 members (EUR)
                base_revenue = 7500000   # €7.5M
                base_assets = 15500000   # €15.5M
                print(f"\nUpdating to SMALLER numbers (3 companies, EUR):")

            else:
                continue

            # Update each consolidation run with scaled numbers
            for i, run in enumerate(parent_runs):
                # Scale based on period (add some variation)
                period_multiplier = 1.0 + (run.fiscal_period / 12 * 0.15)  # Up to 15% growth
                year_multiplier = 1.0 + ((run.fiscal_year - 2024) * 0.10)  # 10% year-over-year

                total_multiplier = period_multiplier * year_multiplier

                revenue = base_revenue * total_multiplier
                expenses = revenue * 0.82  # 82% expense ratio = 18% profit margin
                net_income = revenue - expenses
                assets = base_assets * total_multiplier
                liabilities = assets * 0.62  # 62% leverage
                equity = assets - liabilities

                # Update the run
                run.total_revenue = Decimal(str(revenue))
                run.total_expenses = Decimal(str(expenses))
                run.net_income = Decimal(str(net_income))
                run.total_assets = Decimal(str(assets))
                run.total_liabilities = Decimal(str(liabilities))
                run.total_equity = Decimal(str(equity))

                print(f"  {run.run_name} ({run.fiscal_year}-{run.fiscal_period:02d}):")
                print(f"    Revenue: {revenue:,.0f}")
                print(f"    Net Income: {net_income:,.0f}")
                print(f"    Assets: {assets:,.0f}")

            db.commit()
            print(f"\n✓ Updated {len(parent_runs)} consolidation runs for {parent.name}")

        print("\n" + "=" * 80)
        print("✅ All consolidation numbers updated successfully!")
        print()
        print("Summary:")
        print("  • TechCorp Holdings: ~$45M revenue, $125M assets (USD, 9 companies)")
        print("  • GlobalTech International: ~€7.5M revenue, €15.5M assets (EUR, 3 companies)")

    except Exception as e:
        print(f"\n❌ Error updating consolidation numbers: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_consolidation_numbers()
