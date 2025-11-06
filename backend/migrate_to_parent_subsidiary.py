"""
Migrate existing flat organization structure to parent-subsidiary hierarchy
Run once to convert existing data
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.consolidation import (
    Organization, ParentCompany, Company, CompanyType,
    ConsolidationMethod, ConsolidationAdjustment, IntercompanyElimination
)

def migrate_to_parent_subsidiary():
    # Create new tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("=" * 80)
        print("  MIGRATING TO PARENT-SUBSIDIARY STRUCTURE")
        print("=" * 80)
        print()

        # Get Nick's organization
        user = db.query(User).filter(User.email == "nick@repeatable.ai").first()
        if not user or not user.organization_id:
            print("User not found")
            return

        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        print(f"Organization: {org.name}")
        print()

        # Create parent company from organization
        parent = ParentCompany(
            organization_id=org.id,
            name="TechCorp Holdings",
            legal_name="TechCorp Holdings Inc.",
            tax_id="99-8877665",
            incorporation_country="United States",
            fiscal_year_end_month=12,
            reporting_currency="USD",
            accounting_standard="GAAP"
        )
        db.add(parent)
        db.commit()
        db.refresh(parent)

        print(f"✓ Created Parent Company: {parent.name}")
        print(f"  ID: {parent.id}")
        print()

        # Update existing companies to be members of parent
        companies = db.query(Company).filter(Company.organization_id == org.id).all()

        ownership_map = {
            "TechCorp USA": 100.0,
            "TechCorp Europe": 100.0,
            "DataSolutions LLC": 80.0,  # Minority interest
            "CloudServices Inc": 100.0
        }

        goodwill_map = {
            "DataSolutions LLC": 500000.0  # Goodwill from acquisition
        }

        print("Converting companies to member companies:")
        for company in companies:
            company.parent_company_id = parent.id
            company.ownership_percentage = ownership_map.get(company.name, 100.0)
            company.company_type = CompanyType.MEMBER
            company.consolidation_method = ConsolidationMethod.FULL
            company.goodwill_amount = goodwill_map.get(company.name, 0.0)

            print(f"  ✓ {company.name}")
            print(f"    Ownership: {company.ownership_percentage}%")
            print(f"    Goodwill: ${company.goodwill_amount:,.0f}")

        db.commit()

        print()
        print("=" * 80)
        print("✅ MIGRATION COMPLETE!")
        print("=" * 80)
        print()
        print(f"Parent Company: {parent.name}")
        print(f"Member Companies: {len(companies)}")
        print(f"  - TechCorp USA (100% owned)")
        print(f"  - TechCorp Europe (100% owned)")
        print(f"  - DataSolutions LLC (80% owned - 20% minority interest)")
        print(f"  - CloudServices Inc (100% owned)")
        print()
        print("Structure:")
        print(f"  User (CFO) → Organization → Parent Company → 4 Member Companies")
        print()
        print("Refresh your browser to see the new parent-subsidiary structure!")
        print()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_to_parent_subsidiary()
