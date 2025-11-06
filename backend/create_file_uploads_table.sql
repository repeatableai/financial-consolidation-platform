-- Create file_uploads table to track all uploaded files

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
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_org ON file_uploads(organization_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_company ON file_uploads(company_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created ON file_uploads(created_at DESC);
