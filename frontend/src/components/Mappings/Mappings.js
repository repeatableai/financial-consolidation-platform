import { useState, useEffect } from 'react';
import axios from 'axios';

function Mappings() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [masterAccounts, setMasterAccounts] = useState([]);
  const [existingMappings, setExistingMappings] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizationId, setOrganizationId] = useState(null);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualMapping, setManualMapping] = useState({ companyAccountId: '', masterAccountId: '' });

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
      setSuggestions([]);
      setSelectedSuggestion(null);
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
    setSelectedSuggestion(null);

    try {
      const response = await axios.post('/api/v1/mappings/generate', {
        company_id: selectedCompany,
        confidence_threshold: 0.65
      });

      setSuggestions(response.data);
      if (response.data.length === 0) {
        setSuccess('✓ All accounts are already mapped!');
      } else {
        setSuccess(`🤖 Generated ${response.data.length} AI mapping suggestions with detailed analysis!`);
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'AI mapping unavailable. Using rule-based mapping instead.');
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
      setSelectedSuggestion(null);
      fetchCompanyData(selectedCompany);
      setSuccess('✓ Mapping accepted and saved!');
    } catch (error) {
      setError('Failed to create mapping');
    }
  };

  const createManualMapping = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/v1/mappings/', {
        company_account_id: manualMapping.companyAccountId,
        master_account_id: manualMapping.masterAccountId,
        confidence_score: 1.0
      });

      setShowManualMapping(false);
      setManualMapping({ companyAccountId: '', masterAccountId: '' });
      fetchCompanyData(selectedCompany);
      setSuccess('✓ Manual mapping created!');
    } catch (error) {
      setError('Failed to create mapping');
    }
  };

  const getUnmappedAccounts = () => {
    const mappedIds = new Set(existingMappings.map(m => m.company_account_id));
    return companyAccounts.filter(acc => !mappedIds.has(acc.id));
  };

  if (loading) {
    return <div><h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>Account Mappings</h1><div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}><div className="spinner"></div></div></div>;
  }

  const unmappedAccounts = getUnmappedAccounts();

  return (
    <div>
      <h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>🔗 Account Mappings</h1>
      <p style={{color: '#666', marginBottom: '30px'}}>Intelligent account mapping with AI-powered analysis and detailed explanations</p>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fecaca'}}>{error}</div>}
      {success && <div style={{padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '20px', border: '1px solid #6ee7b7'}}>{success}</div>}

      {/* Company Selector */}
      <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <label style={{display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '16px'}}>1️⃣ Select Company:</label>
        <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px'}}>
          <option value="">Choose a company...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name} ({company.currency})</option>
          ))}
        </select>
      </div>

      {selectedCompany && (
        <>
          {/* Stats */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px'}}>
            <StatBox label="Total Accounts" value={companyAccounts.length} color="#4f46e5" />
            <StatBox label="✓ Mapped" value={existingMappings.length} color="#059669" />
            <StatBox label="⚠ Unmapped" value={unmappedAccounts.length} color="#d97706" />
            <StatBox label="Master Accounts" value={masterAccounts.length} color="#6366f1" />
          </div>

          {/* Actions */}
          <div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
            <button onClick={generateAIMappings} disabled={generating || unmappedAccounts.length === 0} style={{flex: 1, padding: '15px', backgroundColor: generating || unmappedAccounts.length === 0 ? '#9ca3af' : '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: generating || unmappedAccounts.length === 0 ? 'not-allowed' : 'pointer'}}>
              {generating ? '🤖 Analyzing accounts...' : `🤖 Generate AI Mappings (${unmappedAccounts.length} unmapped)`}
            </button>
            <button onClick={() => setShowManualMapping(!showManualMapping)} disabled={unmappedAccounts.length === 0} style={{padding: '15px 25px', backgroundColor: unmappedAccounts.length === 0 ? '#9ca3af' : 'white', color: unmappedAccounts.length === 0 ? 'white' : '#4f46e5', border: `2px solid ${unmappedAccounts.length === 0 ? '#9ca3af' : '#4f46e5'}`, borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: unmappedAccounts.length === 0 ? 'not-allowed' : 'pointer'}}>
              {showManualMapping ? 'Cancel' : '+ Manual'}
            </button>
          </div>

          {generating && <div style={{backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', textAlign: 'center'}}><div className="spinner" style={{margin: '0 auto 20px'}}></div><p style={{fontSize: '16px', color: '#666'}}>AI is analyzing {unmappedAccounts.length} accounts...</p></div>}

          {showManualMapping && unmappedAccounts.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #4f46e5'}}>
              <h3 style={{marginBottom: '20px', fontSize: '18px', fontWeight: '600'}}>Create Manual Mapping</h3>
              <form onSubmit={createManualMapping}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Company Account:</label>
                    <select value={manualMapping.companyAccountId} onChange={(e) => setManualMapping({...manualMapping, companyAccountId: e.target.value})} required style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}>
                      <option value="">Select...</option>
                      {unmappedAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.account_number} - {acc.account_name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Master Account:</label>
                    <select value={manualMapping.masterAccountId} onChange={(e) => setManualMapping({...manualMapping, masterAccountId: e.target.value})} required style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}>
                      <option value="">Select...</option>
                      {masterAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.account_number} - {acc.account_name}</option>))}
                    </select>
                  </div>
                </div>
                <button type="submit" style={{padding: '10px 30px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'}}>Create Mapping</button>
              </form>
            </div>
          )}

          {/* AI Suggestions with Detail View */}
          {suggestions.length > 0 && (
            <div style={{display: 'grid', gridTemplateColumns: selectedSuggestion ? '1fr 400px' : '1fr', gap: '20px', marginBottom: '20px'}}>
              <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #4f46e5'}}>
                <h2 style={{marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#4f46e5'}}>🤖 AI Suggestions ({suggestions.length})</h2>
                <div style={{display: 'grid', gap: '10px'}}>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedSuggestion(suggestion)}
                      style={{
                        border: selectedSuggestion === suggestion ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: selectedSuggestion === suggestion ? '#eff6ff' : '#f9fafb',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSuggestion !== suggestion) e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSuggestion !== suggestion) e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px'}}>
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                            <div style={{flex: 1}}>
                              <div style={{fontSize: '10px', color: '#6b7280', marginBottom: '3px', textTransform: 'uppercase', fontWeight: '600'}}>Company</div>
                              <div style={{fontSize: '14px', fontWeight: '600'}}>{suggestion.company_account_number} - {suggestion.company_account_name}</div>
                            </div>
                            <div style={{fontSize: '18px', color: '#4f46e5'}}>→</div>
                            <div style={{flex: 1}}>
                              <div style={{fontSize: '10px', color: '#6b7280', marginBottom: '3px', textTransform: 'uppercase', fontWeight: '600'}}>Master</div>
                              <div style={{fontSize: '14px', fontWeight: '600'}}>{suggestion.master_account_number} - {suggestion.master_account_name}</div>
                            </div>
                          </div>
                          <div style={{display: 'flex', gap: '12px', fontSize: '11px'}}>
                            <span style={{padding: '2px 8px', backgroundColor: suggestion.confidence_score >= 0.9 ? '#d1fae5' : suggestion.confidence_score >= 0.8 ? '#fef3c7' : '#fee2e2', color: suggestion.confidence_score >= 0.9 ? '#065f46' : suggestion.confidence_score >= 0.8 ? '#92400e' : '#991b1b', borderRadius: '10px', fontWeight: '600'}}>
                              {(suggestion.confidence_score * 100).toFixed(0)}% Confident
                            </span>
                            <span style={{padding: '2px 8px', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '10px', fontWeight: '600'}}>
                              {suggestion.name_similarity || 'medium'} similarity
                            </span>
                            {suggestion.account_type_match && (
                              <span style={{padding: '2px 8px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '10px', fontWeight: '600'}}>
                                ✓ Type Match
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); acceptMapping(suggestion); }} style={{padding: '10px 20px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap'}}>
                          ✓ Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop: '15px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', fontSize: '13px', color: '#1e40af'}}>
                  💡 Click on any suggestion to see detailed analysis on the right →
                </div>
              </div>

              {/* Detailed Analysis Panel */}
              {selectedSuggestion && (
                <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '2px solid #4f46e5', position: 'sticky', top: '20px', maxHeight: '80vh', overflowY: 'auto'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                    <h3 style={{fontSize: '16px', fontWeight: '600'}}>📋 Detailed Analysis</h3>
                    <button onClick={() => setSelectedSuggestion(null)} style={{backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer'}}>✕</button>
                  </div>

                  <div style={{marginBottom: '20px'}}>
                    <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600'}}>Company Account</div>
                    <div style={{padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', marginBottom: '12px'}}>
                      <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '4px'}}>{selectedSuggestion.company_account_number}</div>
                      <div style={{fontSize: '15px'}}>{selectedSuggestion.company_account_name}</div>
                    </div>

                    <div style={{textAlign: 'center', margin: '15px 0', fontSize: '24px', color: '#4f46e5'}}>⬇</div>

                    <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600'}}>Suggested Master Account</div>
                    <div style={{padding: '12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe'}}>
                      <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#4f46e5'}}>{selectedSuggestion.master_account_number}</div>
                      <div style={{fontSize: '15px', fontWeight: '600'}}>{selectedSuggestion.master_account_name}</div>
                    </div>
                  </div>

                  <div style={{marginBottom: '20px'}}>
                    <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#1f2937'}}>AI Confidence Analysis:</div>
                    <div style={{marginBottom: '10px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px'}}>
                        <span>Confidence Score</span>
                        <span style={{fontWeight: '600'}}>{(selectedSuggestion.confidence_score * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
                        <div style={{
                          width: `${selectedSuggestion.confidence_score * 100}%`,
                          height: '100%',
                          backgroundColor: selectedSuggestion.confidence_score >= 0.9 ? '#059669' : selectedSuggestion.confidence_score >= 0.8 ? '#d97706' : '#dc2626',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>

                    <div style={{display: 'grid', gap: '8px', fontSize: '12px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px'}}>
                        <span>Account Type Match:</span>
                        <span style={{fontWeight: '600', color: selectedSuggestion.account_type_match ? '#059669' : '#dc2626'}}>
                          {selectedSuggestion.account_type_match ? '✓ Yes' : '✗ No'}
                        </span>
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px'}}>
                        <span>Name Similarity:</span>
                        <span style={{fontWeight: '600', color: '#4f46e5', textTransform: 'capitalize'}}>{selectedSuggestion.name_similarity}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{marginBottom: '20px'}}>
                    <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1f2937'}}>💭 AI Reasoning:</div>
                    <div style={{padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '13px', lineHeight: '1.6', color: '#1e40af'}}>
                      {selectedSuggestion.reasoning}
                    </div>
                  </div>

                  {selectedSuggestion.alternative_matches && selectedSuggestion.alternative_matches.length > 0 && (
                    <div>
                      <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1f2937'}}>🔄 Alternatives Considered:</div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>
                        {selectedSuggestion.alternative_matches.map((alt, i) => (
                          <div key={i} style={{padding: '6px', backgroundColor: '#f9fafb', borderRadius: '4px', marginBottom: '4px'}}>• {alt}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => acceptMapping(selectedSuggestion)} style={{width: '100%', padding: '14px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '20px'}}>
                    ✓ Accept This Mapping
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Existing Mappings */}
          {existingMappings.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
              <h2 style={{marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#059669'}}>✓ Active Mappings ({existingMappings.length})</h2>
              <div style={{display: 'grid', gap: '8px'}}>
                {existingMappings.map((mapping) => (
                  <div key={mapping.id} style={{padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #6ee7b7'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px'}}>
                      <div style={{flex: 1}}>
                        <span style={{fontWeight: '600', color: '#065f46'}}>{mapping.company_account_number}</span>
                        <span style={{margin: '0 6px', color: '#9ca3af'}}>-</span>
                        <span>{mapping.company_account_name}</span>
                      </div>
                      <div style={{fontSize: '14px', color: '#059669'}}>→</div>
                      <div style={{flex: 1}}>
                        <span style={{fontWeight: '600', color: '#065f46'}}>{mapping.master_account_number}</span>
                        <span style={{margin: '0 6px', color: '#9ca3af'}}>-</span>
                        <span>{mapping.master_account_name}</span>
                      </div>
                      {mapping.confidence_score && (
                        <span style={{fontSize: '11px', color: '#059669', fontWeight: '600'}}>{(mapping.confidence_score * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unmappedAccounts.length > 0 && !generating && suggestions.length === 0 && (
            <div style={{backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px', border: '2px solid #fbbf24'}}>
              <h3 style={{fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '10px'}}>⚠️ {unmappedAccounts.length} Unmapped Account{unmappedAccounts.length !== 1 ? 's' : ''}</h3>
              <div style={{display: 'grid', gap: '6px', marginTop: '12px'}}>
                {unmappedAccounts.slice(0, 5).map(acc => (
                  <div key={acc.id} style={{fontSize: '13px', color: '#78350f'}}>• {acc.account_number} - {acc.account_name}</div>
                ))}
                {unmappedAccounts.length > 5 && <div style={{fontSize: '13px', color: '#78350f', fontStyle: 'italic'}}>... and {unmappedAccounts.length - 5} more</div>}
              </div>
            </div>
          )}

          {unmappedAccounts.length === 0 && existingMappings.length > 0 && (
            <div style={{backgroundColor: '#d1fae5', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '2px solid #6ee7b7'}}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>✓</div>
              <h3 style={{fontSize: '18px', fontWeight: '600', color: '#065f46'}}>All Accounts Mapped!</h3>
              <p style={{fontSize: '14px', color: '#047857'}}>All {companyAccounts.length} accounts mapped to master accounts.</p>
            </div>
          )}
        </>
      )}

      {!selectedCompany && (
        <div style={{backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', textAlign: 'center'}}>
          <div style={{fontSize: '64px', marginBottom: '20px'}}>🔗</div>
          <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>Account Mapping Center</h3>
          <p style={{fontSize: '15px', color: '#6b7280'}}>Select a company to view and manage account mappings</p>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return <div style={{backgroundColor: 'white', padding: '16px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `3px solid ${color}`}}><div style={{fontSize: '12px', color: '#6b7280', marginBottom: '6px'}}>{label}</div><div style={{fontSize: '24px', fontWeight: '600', color}}>{value}</div></div>;
}

export default Mappings;
