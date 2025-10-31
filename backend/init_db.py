import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import engine, Base
from app.models.user import User
from app.models.consolidation import (
    Organization, Company, MasterAccount, CompanyAccount,
    AccountMapping, Transaction, ConsolidationRun, IntercompanyElimination
)

def init_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully!")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")

if __name__ == "__main__":
    init_database()
