"""Add file_uploads table to track uploaded files"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.core.database import engine, SessionLocal

def add_file_uploads_table():
    """Create the file_uploads table"""

    db = SessionLocal()

    try:
        print("Creating file_uploads table...")

        # Create file_uploads table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS file_uploads (
                id VARCHAR PRIMARY KEY,
                organization_id VARCHAR NOT NULL,
                company_id VARCHAR,
                filename VARCHAR NOT NULL,
                file_type VARCHAR NOT NULL,
                file_size INTEGER,
                mime_type VARCHAR,
                rows_processed INTEGER,
                rows_successful INTEGER,
                rows_failed INTEGER,
                status VARCHAR DEFAULT 'completed',
                error_summary TEXT,
                uploaded_by VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id),
                FOREIGN KEY (company_id) REFERENCES companies(id),
                FOREIGN KEY (uploaded_by) REFERENCES users(id)
            )
        """))

        db.commit()
        print("✓ file_uploads table created successfully!")

    except Exception as e:
        print(f"Error creating table: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_file_uploads_table()
