import { useState, useEffect } from 'react';
import axios from 'axios';

function Mappings() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [masterAccounts, setMasterAccounts] = useState([]);
  const [existingMappings, setExistingMappings] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizationId, setOrganizationId] = useState(null);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualMapping, setManualMapping] = useState({
    companyAccountId: '',
    masterAccountId: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyData(selectedCompany);
    }
  }, [selectedCompany]);

  const fetchInitialData = async () => {
    try {
      const orgResponse = await axios.get('/api/v1/organizations/current');
      setOrganizationId(orgResponse.data.id);

      const [companiesRes, masterRes] = await Promise.all([
        axios.get(`/api/v1/companies/?organization_id=${orgResponse.data.id}`),
        axios.get(`/api/v1/accounts/master?organization_id=${orgResponse.data.id}`)
      ]);

      setCompanies(companiesRes.data);
      setMasterAccounts(masterRes.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const fetchCompanyData = async (companyId) => {
    try {
      const [accountsRes, mappingsRes] = await Promise.all([
        axios.get(`/api/v1/accounts/company/${companyId}`),
        axios.get(`/api/v1/mappings/company/${companyId}`)
      ]);

      setCompanyAccounts(accountsRes.data);
      setExistingMappings(mappingsRes.data);
    } catch (error) {
      console.error('Failed to load company data:', error);
    }
  };

  const generateAIMappings = async () => {
    if (!selectedCompany) {
      setError('Please select a company first');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');
    setSuggestions([]);

    try {
      const response = await axios.post('/api/v1/mappings/generate', {
        company_id: selectedCompany,
        confidence_threshold: 0.70
      });

      setSuggestions(response.data);
      if (response.data.length === 0) {
        setSuccess('All accounts are already mapped! No unmapped accounts found.');
      } else {
        setSuccess(`Generated ${response.data.length} AI mapping suggestions!`);
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to generate mappings. Check OpenAI API key.');
    } finally {
      setGenerating(false);
    }
  };

  const acceptMapping = async (suggestion) => {
    try {
      await axios.post('/api/v1/mappings/', {
        company_account_id: suggestion.company_account_id,
        master_account_id: suggestion.master_account_id,
        confidence_score: suggestion.confidence_score
      });

      setSuggestions(prev => prev.filter(s => s.company_account_id !== suggestion.company_account_id));
      fetchCompanyData(selectedCompany);
      setSuccess('Mapping accepted successfully!');
    } catch (error) {
      setError('Failed to create mapping');
    }
  };

  const createManualMapping = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/v1/mappings/', {
        company_account_id: manualMapping.companyAccountId,
        master_account_id: manualMapping.masterAccountId,
        confidence_score: 1.0
      });

      setShowManualMapping(false);
      setManualMapping({ companyAccountId: '', masterAccountId: '' });
      fetchCompanyData(selectedCompany);
      setSuccess('Manual mapping created successfully!');
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create mapping');
    }
  };

  const getUnmappedAccounts = () => {
    const mappedIds = new Set(existingMappings.map(m => m.company_account_id));
    return companyAccounts.filter(acc => !mappedIds.has(acc.id));
  };

  if (loading) {
    return (
      <div>
        <h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>Account Mappings</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const unmappedAccounts = getUnmappedAccounts();

  return (
    <div>
      <h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>Account Mappings</h1>
      <p style={{color: '#666', marginBottom: '30px'}}>Map company accounts to your master chart of accounts</p>

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
          <option value="">Choose a company to view mappings...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name} ({company.currency})</option>
          ))}
        </select>
      </div>

      {selectedCompany && (
        <>
          {/* Stats Bar */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px'}}>
            <StatBox label="Total Accounts" value={companyAccounts.length} color="#4f46e5" />
            <StatBox label="Mapped" value={existingMappings.length} color="#059669" />
            <StatBox label="Unmapped" value={unmappedAccounts.length} color="#d97706" />
            <StatBox label="Master Accounts" value={masterAccounts.length} color="#6366f1" />
          </div>

          {/* Action Buttons */}
          <div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
            <button
              onClick={generateAIMappings}
              disabled={generating || unmappedAccounts.length === 0}
              style={{
                flex: 1,
                padding: '15px',
                backgroundColor: generating || unmappedAccounts.length === 0 ? '#9ca3af' : '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: generating || unmappedAccounts.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span>🤖</span>
              {generating ? 'Generating AI Mappings...' : `Generate AI Mappings (${unmappedAccounts.length} accounts)`}
            </button>

            <button
              onClick={() => setShowManualMapping(!showManualMapping)}
              disabled={unmappedAccounts.length === 0}
              style={{
                padding: '15px 25px',
                backgroundColor: unmappedAccounts.length === 0 ? '#9ca3af' : 'white',
                color: unmappedAccounts.length === 0 ? 'white' : '#4f46e5',
                border: `2px solid ${unmappedAccounts.length === 0 ? '#9ca3af' : '#4f46e5'}`,
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: unmappedAccounts.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {showManualMapping ? 'Cancel' : '+ Manual Mapping'}
            </button>
          </div>

          {/* Manual Mapping Form */}
          {showManualMapping && unmappedAccounts.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
              <h3 style={{marginBottom: '20px', fontSize: '18px', fontWeight: '600'}}>Create Manual Mapping</h3>
              <form onSubmit={createManualMapping}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Company Account:</label>
                    <select
                      value={manualMapping.companyAccountId}
                      onChange={(e) => setManualMapping({...manualMapping, companyAccountId: e.target.value})}
                      required
                      style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                    >
                      <option value="">Select account...</option>
                      {unmappedAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.account_number} - {acc.account_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Master Account:</label>
                    <select
                      value={manualMapping.masterAccountId}
                      onChange={(e) => setManualMapping({...manualMapping, masterAccountId: e.target.value})}
                      required
                      style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                    >
                      <option value="">Select master account...</option>
                      {masterAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.account_number} - {acc.account_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{padding: '10px 30px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'}}
                >
                  Create Mapping
                </button>
              </form>
            </div>
          )}

          {/* AI Generating Indicator */}
          {generating && (
            <div style={{backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', textAlign: 'center'}}>
              <div className="spinner" style={{margin: '0 auto 20px'}}></div>
              <p style={{fontSize: '16px', color: '#666', marginBottom: '10px'}}>AI is analyzing {unmappedAccounts.length} accounts...</p>
              <p style={{fontSize: '14px', color: '#999'}}>This may take a few moments</p>
            </div>
          )}

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
              <h2 style={{marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#4f46e5'}}>🤖 AI Suggestions ({suggestions.length})</h2>

              <div style={{display: 'grid', gap: '12px'}}>
                {suggestions.map((suggestion, index) => (
                  <div key={index} style={{border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', backgroundColor: '#f9fafb'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px'}}>
                      <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <div style={{flex: 1}}>
                          <div style={{fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600'}}>Company Account</div>
                          <div style={{fontSize: '15px', fontWeight: '600', color: '#1f2937'}}>{suggestion.company_account_name}</div>
                        </div>

                        <div style={{fontSize: '20px', color: '#4f46e5', fontWeight: 'bold'}}>→</div>

                        <div style={{flex: 1}}>
                          <div style={{fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600'}}>Master Account</div>
                          <div style={{fontSize: '15px', fontWeight: '600', color: '#1f2937'}}>{suggestion.master_account_name}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => acceptMapping(suggestion)}
                        style={{padding: '10px 24px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap'}}
                      >
                        ✓ Accept
                      </button>
                    </div>

                    <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '20px', fontSize: '13px'}}>
                      <div>
                        <span style={{color: '#6b7280'}}>Confidence: </span>
                        <span style={{fontWeight: '600', color: suggestion.confidence_score >= 0.9 ? '#059669' : suggestion.confidence_score >= 0.8 ? '#d97706' : '#dc2626'}}>
                          {(suggestion.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      {suggestion.reasoning && (
                        <div style={{color: '#6b7280', fontStyle: 'italic'}}>"{suggestion.reasoning}"</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Mappings */}
          {existingMappings.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
              <h2 style={{marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#059669'}}>✓ Active Mappings ({existingMappings.length})</h2>

              <div style={{display: 'grid', gap: '8px'}}>
                {existingMappings.map((mapping) => (
                  <div key={mapping.id} style={{padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #6ee7b7'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                      <div style={{flex: 1}}>
                        <span style={{fontWeight: '600', color: '#065f46'}}>{mapping.company_account_number}</span>
                        <span style={{margin: '0 8px', color: '#6b7280'}}>-</span>
                        <span style={{color: '#374151'}}>{mapping.company_account_name}</span>
                      </div>

                      <div style={{fontSize: '16px', color: '#059669'}}>→</div>

                      <div style={{flex: 1}}>
                        <span style={{fontWeight: '600', color: '#065f46'}}>{mapping.master_account_number}</span>
                        <span style={{margin: '0 8px', color: '#6b7280'}}>-</span>
                        <span style={{color: '#374151'}}>{mapping.master_account_name}</span>
                      </div>

                      <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        {mapping.confidence_score && (
                          <span style={{fontSize: '12px', color: '#059669', fontWeight: '600'}}>
                            {(mapping.confidence_score * 100).toFixed(0)}%
                          </span>
                        )}
                        {mapping.is_verified && (
                          <span style={{fontSize: '12px', backgroundColor: '#059669', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: '600'}}>
                            VERIFIED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmapped Accounts Warning */}
          {unmappedAccounts.length > 0 && !generating && suggestions.length === 0 && (
            <div style={{backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #fbbf24'}}>
              <h3 style={{fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '10px'}}>
                ⚠️ {unmappedAccounts.length} Unmapped Account{unmappedAccounts.length !== 1 ? 's' : ''}
              </h3>
              <p style={{fontSize: '14px', color: '#78350f', marginBottom: '15px'}}>
                These accounts are not yet mapped. Use AI or create manual mappings:
              </p>
              <div style={{display: 'grid', gap: '6px'}}>
                {unmappedAccounts.slice(0, 5).map(acc => (
                  <div key={acc.id} style={{fontSize: '13px', color: '#78350f', paddingLeft: '10px'}}>
                    • {acc.account_number} - {acc.account_name}
                  </div>
                ))}
                {unmappedAccounts.length > 5 && (
                  <div style={{fontSize: '13px', color: '#78350f', paddingLeft: '10px', fontStyle: 'italic'}}>
                    ... and {unmappedAccounts.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State - All Mapped */}
          {unmappedAccounts.length === 0 && existingMappings.length > 0 && (
            <div style={{backgroundColor: '#d1fae5', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '2px solid #6ee7b7'}}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>✓</div>
              <h3 style={{fontSize: '18px', fontWeight: '600', color: '#065f46', marginBottom: '10px'}}>
                All Accounts Mapped!
              </h3>
              <p style={{fontSize: '14px', color: '#047857'}}>
                All {companyAccounts.length} accounts in this company are mapped to master accounts.
              </p>
            </div>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!selectedCompany && companies.length > 0 && (
        <div style={{backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center'}}>
          <div style={{fontSize: '64px', marginBottom: '20px'}}>🔗</div>
          <h3 style={{fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '15px'}}>
            Account Mapping Center
          </h3>
          <p style={{fontSize: '15px', color: '#6b7280', marginBottom: '10px'}}>
            Select a company above to view and manage account mappings
          </p>
          <p style={{fontSize: '14px', color: '#9ca3af'}}>
            Use AI to automatically suggest mappings or create them manually
          </p>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{backgroundColor: 'white', padding: '16px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `3px solid ${color}`}}>
      <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '6px'}}>{label}</div>
      <div style={{fontSize: '24px', fontWeight: '600', color}}>{value}</div>
    </div>
  );
}

export default Mappings;
