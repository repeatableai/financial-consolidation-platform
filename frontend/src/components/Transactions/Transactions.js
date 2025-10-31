import { useState, useEffect } from 'react';
import axios from 'axios';

function Transactions() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchTransactions(selectedCompany);
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const orgResponse = await axios.get('/api/v1/organizations/current');
      const companiesResponse = await axios.get(`/api/v1/companies/?organization_id=${orgResponse.data.id}`);
      setCompanies(companiesResponse.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to load companies');
      setLoading(false);
    }
  };

  const fetchTransactions = async (companyId) => {
    try {
      const response = await axios.get(`/api/v1/transactions/company/${companyId}?limit=100`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
      setError('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setImportResult(null);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!selectedCompany) {
      setError('Please select a company first');
      return;
    }

    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        `/api/v1/transactions/import?company_id=${selectedCompany}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000
        }
      );

      setImportResult(response.data);

      if (response.data.error_count === 0) {
        setSuccess(`✅ Successfully imported ${response.data.success_count} transactions!`);
        setSelectedFile(null);
        fetchTransactions(selectedCompany);
      } else {
        setError(`⚠️ Import completed with ${response.data.error_count} errors. ${response.data.success_count} transactions imported.`);
      }
    } catch (error) {
      setError(`Import failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    window.open('/api/v1/transactions/template/csv', '_blank');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);
  };

  if (loading) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>Transactions</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <div>
      <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>💸 Transactions</h1>
      <p style={{color: '#666', marginBottom: '30px'}}>Import and manage financial transactions</p>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fecaca'}}>{error}</div>}
      {success && <div style={{padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '20px', border: '1px solid #6ee7b7'}}>{success}</div>}

      {/* Company Selector */}
      <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <label style={{display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '16px'}}>Select Company:</label>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px'}}
        >
          <option value="">Choose a company...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name} ({company.currency})</option>
          ))}
        </select>
      </div>

      {selectedCompany && (
        <>
          {/* Import Section */}
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
            <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>📤 Import Transactions</h2>
            <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
              Upload Excel (.xlsx) or CSV files with transaction data for {selectedCompanyData?.name}
            </p>

            {/* File Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                border: dragActive ? '3px dashed #4f46e5' : '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                backgroundColor: dragActive ? '#eff6ff' : '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '20px'
              }}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <div style={{fontSize: '48px', marginBottom: '15px'}}>📁</div>
              {selectedFile ? (
                <>
                  <div style={{fontSize: '16px', fontWeight: '600', color: '#059669', marginBottom: '8px'}}>
                    ✓ {selectedFile.name}
                  </div>
                  <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '15px'}}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    style={{padding: '8px 16px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer'}}
                  >
                    ✕ Remove
                  </button>
                </>
              ) : (
                <>
                  <div style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px'}}>
                    Drop files here or click to browse
                  </div>
                  <div style={{fontSize: '14px', color: '#6b7280'}}>
                    Supports: .xlsx, .xls, .csv
                  </div>
                </>
              )}
              <input
                id="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                style={{display: 'none'}}
              />
            </div>

            {/* Action Buttons */}
            <div style={{display: 'flex', gap: '15px'}}>
              <button
                onClick={handleImport}
                disabled={importing || !selectedFile}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: importing || !selectedFile ? '#9ca3af' : '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: importing || !selectedFile ? 'not-allowed' : 'pointer'
                }}
              >
                {importing ? '⏳ Importing...' : '📤 Import Transactions'}
              </button>

              <button
                onClick={downloadTemplate}
                style={{
                  padding: '14px 24px',
                  backgroundColor: 'white',
                  color: '#4f46e5',
                  border: '2px solid #4f46e5',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📥 Download Template
              </button>
            </div>

            {importing && (
              <div style={{marginTop: '20px', textAlign: 'center'}}>
                <div className="spinner" style={{margin: '0 auto 15px'}}></div>
                <p style={{color: '#666'}}>Validating and importing transactions...</p>
              </div>
            )}
          </div>

          {/* Import Results */}
          {importResult && (
            <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: importResult.error_count > 0 ? '2px solid #fbbf24' : '2px solid #6ee7b7'}}>
              <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '15px'}}>Import Results</h3>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px'}}>
                <ResultStat label="Total Rows" value={importResult.total_rows} color="#4f46e5" />
                <ResultStat label="✓ Imported" value={importResult.success_count} color="#059669" />
                <ResultStat label="✗ Errors" value={importResult.error_count} color={importResult.error_count > 0 ? '#dc2626' : '#6b7280'} />
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div>
                  <h4 style={{fontSize: '15px', fontWeight: '600', marginBottom: '10px', color: '#dc2626'}}>Errors Found:</h4>
                  <div style={{maxHeight: '200px', overflowY: 'auto', backgroundColor: '#fef2f2', padding: '15px', borderRadius: '6px'}}>
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} style={{fontSize: '13px', color: '#991b1b', marginBottom: '6px'}}>
                        Row {err.row}: {err.field} - {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transaction List */}
          {transactions.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
              <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '15px'}}>Recent Transactions ({transactions.length})</h3>

              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', fontSize: '14px', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                      <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Date</th>
                      <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Company</th>
                      <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Debit</th>
                      <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td style={{padding: '12px'}}>{new Date(txn.transaction_date).toLocaleDateString()}</td>
                        <td style={{padding: '12px'}}>{selectedCompanyData?.name}</td>
                        <td style={{padding: '12px', textAlign: 'right', color: '#059669', fontWeight: txn.debit_amount > 0 ? '600' : 'normal'}}>
                          {txn.debit_amount > 0 ? formatCurrency(txn.debit_amount) : '-'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'right', color: '#dc2626', fontWeight: txn.credit_amount > 0 ? '600' : 'normal'}}>
                          {txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {transactions.length === 0 && !importing && !importResult && (
            <div style={{backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '64px', marginBottom: '20px'}}>💸</div>
              <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>No Transactions Yet</h3>
              <p style={{fontSize: '15px', color: '#6b7280'}}>Import your first transaction file to get started</p>
            </div>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!selectedCompany && (
        <div style={{backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', textAlign: 'center'}}>
          <div style={{fontSize: '64px', marginBottom: '20px'}}>📊</div>
          <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>Transaction Management</h3>
          <p style={{fontSize: '15px', color: '#6b7280'}}>Select a company above to import and view transactions</p>
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value, color }) {
  return (
    <div style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px', borderLeft: `3px solid ${color}`}}>
      <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '6px'}}>{label}</div>
      <div style={{fontSize: '28px', fontWeight: '700', color}}>{value}</div>
    </div>
  );
}

export default Transactions;
