"""
Add parent-subsidiary columns to existing database
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.core.database import engine

def add_columns():
    with engine.connect() as conn:
        print("Adding parent-subsidiary columns to companies table...")

        try:
            # Add new columns
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS parent_company_id VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS ownership_percentage FLOAT DEFAULT 100.0"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type VARCHAR DEFAULT 'member'"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS consolidation_method VARCHAR DEFAULT 'full'"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS acquisition_date TIMESTAMP"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS goodwill_amount FLOAT DEFAULT 0.0"))

            # Add new columns to intercompany_eliminations
            conn.execute(text("ALTER TABLE intercompany_eliminations ADD COLUMN IF NOT EXISTS from_company_id VARCHAR"))
            conn.execute(text("ALTER TABLE intercompany_eliminations ADD COLUMN IF NOT EXISTS to_company_id VARCHAR"))
            conn.execute(text("ALTER TABLE intercompany_eliminations ADD COLUMN IF NOT EXISTS elimination_type VARCHAR"))
            conn.execute(text("ALTER TABLE intercompany_eliminations ADD COLUMN IF NOT EXISTS elimination_status VARCHAR DEFAULT 'detected'"))
            conn.execute(text("ALTER TABLE intercompany_eliminations ADD COLUMN IF NOT EXISTS verified_by VARCHAR"))

            conn.commit()
            print("✓ Columns added successfully")

        except Exception as e:
            print(f"Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    from sqlalchemy import text
    add_columns()
