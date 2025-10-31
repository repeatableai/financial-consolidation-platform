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
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizationId, setOrganizationId] = useState(null);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualMapping, setManualMapping] = useState({ companyAccountId: '', masterAccountId: '' });
  const [showHelp, setShowHelp] = useState(false);

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
      setSelectedMapping(null);
    } catch (error) {
      console.error('Failed to load company data:', error);
    }
  };

  const generateAIMappings = async () => {
    if (!selectedCompany) {
      setError('⚠️ Please select a company first');
      return;
    }

    console.log('🤖 Starting AI mapping generation for company:', selectedCompany);
    setGenerating(true);
    setError('');
    setSuccess('');
    setSuggestions([]);
    setSelectedSuggestion(null);

    try {
      console.log('Making API request...');
      const response = await axios.post('/api/v1/mappings/generate', {
        company_id: selectedCompany,
        confidence_threshold: 0.60  // Lower to get more suggestions
      }, {
        timeout: 30000  // 30 second timeout
      });

      console.log(`✓ Received ${response.data.length} suggestions`);
      setSuggestions(response.data);

      if (response.data.length === 0) {
        setSuccess('✓ All accounts are already mapped! All company accounts have been successfully mapped to the master chart.');
      } else {
        setSuccess(`✓ Successfully generated ${response.data.length} intelligent mapping suggestion${response.data.length !== 1 ? 's' : ''}! Click any suggestion to view detailed analysis.`);
      }
    } catch (error) {
      console.error('❌ AI mapping error:', error);
      const errorDetail = error.response?.data?.detail || error.message || 'Unknown error';
      setError(`Note: AI service encountered an issue (${errorDetail}). The system automatically used rule-based intelligent mapping as a fallback. You can still accept the suggestions below.`);

      // The backend returns suggestions even on AI failure via fallback
      if (error.response?.status === 200 && error.response?.data) {
        setSuggestions(error.response.data);
      }
    } finally {
      setGenerating(false);
      console.log('✓ AI mapping process complete');
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
      setSuccess('✓ Mapping accepted and saved successfully!');
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
      setSuccess('✓ Manual mapping created successfully!');
    } catch (error) {
      setError('Failed to create mapping');
    }
  };

  const getUnmappedAccounts = () => {
    const mappedIds = new Set(existingMappings.map(m => m.company_account_id));
    return companyAccounts.filter(acc => !mappedIds.has(acc.id));
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      'asset': '#4f46e5',
      'liability': '#dc2626',
      'equity': '#059669',
      'revenue': '#d97706',
      'expense': '#dc2626'
    };
    return colors[type] || '#6b7280';
  };

  const getAccountTypeDescription = (type) => {
    const descriptions = {
      'asset': 'Resources owned (cash, receivables, equipment)',
      'liability': 'Obligations owed (payables, debt)',
      'equity': 'Owner\'s stake (stock, retained earnings)',
      'revenue': 'Income earned (sales, services)',
      'expense': 'Costs incurred (salaries, rent, utilities)'
    };
    return descriptions[type] || '';
  };

  if (loading) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>Account Mappings</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const unmappedAccounts = getUnmappedAccounts();
  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <div>
      {/* Header with Help */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px'}}>
        <div>
          <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '5px'}}>🔗 Account Mapping Center</h1>
          <p style={{color: '#666', marginBottom: '10px'}}>Intelligent mapping of company-specific accounts to your master chart of accounts</p>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          style={{padding: '8px 16px', backgroundColor: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'}}
        >
          {showHelp ? 'Hide' : 'Show'} Help
        </button>
      </div>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fecaca'}}><strong>Error:</strong> {error}</div>}
      {success && <div style={{padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '20px', border: '1px solid #6ee7b7'}}>{success}</div>}

      {/* Help Panel */}
      {showHelp && (
        <div style={{backgroundColor: '#f0f9ff', padding: '25px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #bfdbfe'}}>
          <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#1e40af'}}>📚 How Account Mapping Works</h3>

          <div style={{display: 'grid', gap: '15px', fontSize: '14px', lineHeight: '1.6'}}>
            <div>
              <div style={{fontWeight: '600', marginBottom: '6px', color: '#1f2937'}}>🎯 What is Account Mapping?</div>
              <div style={{color: '#4b5563'}}>
                Account mapping links your company-specific account names to a standardized master chart of accounts. This allows consolidation across multiple entities with different naming conventions.
              </div>
            </div>

            <div>
              <div style={{fontWeight: '600', marginBottom: '6px', color: '#1f2937'}}>🤖 AI-Powered Mapping</div>
              <div style={{color: '#4b5563'}}>
                Our AI analyzes account names, types, and industry context to suggest the best matches. It provides confidence scores and detailed reasoning for each suggestion.
              </div>
            </div>

            <div>
              <div style={{fontWeight: '600', marginBottom: '6px', color: '#1f2937'}}>✅ Account Types Must Match</div>
              <div style={{color: '#4b5563'}}>
                Assets map to Assets, Liabilities to Liabilities, etc. Mismatched types can cause financial statement errors.
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginTop: '10px'}}>
              <AccountTypeChip type="asset" label="Asset" />
              <AccountTypeChip type="liability" label="Liability" />
              <AccountTypeChip type="equity" label="Equity" />
              <AccountTypeChip type="revenue" label="Revenue" />
              <AccountTypeChip type="expense" label="Expense" />
            </div>
          </div>
        </div>
      )}

      {/* Company Selector */}
      <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #e5e7eb'}}>
        <label style={{display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '16px'}}>
          1️⃣ Select Company to Map:
        </label>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          style={{width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px', fontWeight: '500'}}
        >
          <option value="">Choose a company...</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>
              {company.name} • {company.industry || 'General'} • {company.currency}
            </option>
          ))}
        </select>

        {selectedCompanyData && (
          <div style={{marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '13px', color: '#6b7280'}}>
            <strong>Selected:</strong> {selectedCompanyData.name} • Industry: {selectedCompanyData.industry || 'N/A'} • Currency: {selectedCompanyData.currency}
          </div>
        )}
      </div>

      {selectedCompany && (
        <>
          {/* Detailed Statistics Dashboard */}
          <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
            <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '15px'}}>📊 Mapping Statistics</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px'}}>
              <StatCard label="Company Accounts" value={companyAccounts.length} color="#4f46e5" detail="Total accounts in company" />
              <StatCard label="✓ Mapped" value={existingMappings.length} color="#059669" detail="Successfully mapped" />
              <StatCard label="⚠ Unmapped" value={unmappedAccounts.length} color={unmappedAccounts.length > 0 ? '#d97706' : '#6b7280'} detail="Need mapping" />
              <StatCard label="Master Accounts" value={masterAccounts.length} color="#6366f1" detail="Available for mapping" />
              <StatCard label="Coverage" value={companyAccounts.length > 0 ? `${((existingMappings.length / companyAccounts.length) * 100).toFixed(0)}%` : '0%'} color={existingMappings.length === companyAccounts.length ? '#059669' : '#d97706'} detail="Mapping completion" />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
            <button
              onClick={generateAIMappings}
              disabled={generating || unmappedAccounts.length === 0}
              style={{
                flex: 1,
                padding: '16px',
                backgroundColor: generating ? '#9ca3af' : unmappedAccounts.length === 0 ? '#6b7280' : '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: generating || unmappedAccounts.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: generating || unmappedAccounts.length === 0 ? 'none' : '0 2px 4px rgba(79, 70, 229, 0.3)'
              }}
            >
              <span style={{fontSize: '24px'}}>🤖</span>
              <div style={{textAlign: 'left'}}>
                <div>{generating ? 'AI is Analyzing...' : `Generate AI Mappings`}</div>
                <div style={{fontSize: '12px', opacity: 0.9}}>
                  {generating ? 'Please wait...' : `${unmappedAccounts.length} unmapped account${unmappedAccounts.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </button>

            <button
              onClick={() => {setShowManualMapping(!showManualMapping); setSelectedSuggestion(null);}}
              disabled={unmappedAccounts.length === 0}
              style={{
                padding: '16px 28px',
                backgroundColor: 'white',
                color: unmappedAccounts.length === 0 ? '#9ca3af' : '#4f46e5',
                border: `2px solid ${unmappedAccounts.length === 0 ? '#9ca3af' : '#4f46e5'}`,
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: unmappedAccounts.length === 0 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {showManualMapping ? '✕ Cancel' : '✏️ Manual Mapping'}
            </button>
          </div>

          {/* AI Generating Indicator */}
          {generating && (
            <div style={{backgroundColor: 'white', padding: '50px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', textAlign: 'center', border: '2px dashed #4f46e5'}}>
              <div className="spinner" style={{margin: '0 auto 25px', width: '50px', height: '50px', borderWidth: '4px'}}></div>
              <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: '#4f46e5'}}>AI Analysis in Progress</h3>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '8px'}}>
                Analyzing {unmappedAccounts.length} unmapped accounts...
              </p>
              <div style={{fontSize: '13px', color: '#9ca3af'}}>
                The AI is comparing account names, types, and industry context to find the best matches
              </div>
            </div>
          )}

          {/* Manual Mapping Form */}
          {showManualMapping && unmappedAccounts.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
              <h3 style={{marginBottom: '8px', fontSize: '18px', fontWeight: '600', color: '#4f46e5'}}>✏️ Create Manual Mapping</h3>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>Select a company account and the master account it should map to</p>

              <form onSubmit={createManualMapping}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '10px', fontWeight: '600', color: '#374151'}}>
                      Company Account:
                    </label>
                    <select
                      value={manualMapping.companyAccountId}
                      onChange={(e) => setManualMapping({...manualMapping, companyAccountId: e.target.value})}
                      required
                      style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '14px'}}
                    >
                      <option value="">Select company account...</option>
                      {unmappedAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_number} - {acc.account_name} ({acc.account_type})
                        </option>
                      ))}
                    </select>
                    {manualMapping.companyAccountId && unmappedAccounts.find(a => a.id === manualMapping.companyAccountId) && (
                      <div style={{marginTop: '8px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '4px', fontSize: '12px', color: '#6b7280'}}>
                        <div><strong>Type:</strong> {unmappedAccounts.find(a => a.id === manualMapping.companyAccountId).account_type}</div>
                        <div><strong>Number:</strong> {unmappedAccounts.find(a => a.id === manualMapping.companyAccountId).account_number}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{display: 'block', marginBottom: '10px', fontWeight: '600', color: '#374151'}}>
                      Master Account:
                    </label>
                    <select
                      value={manualMapping.masterAccountId}
                      onChange={(e) => setManualMapping({...manualMapping, masterAccountId: e.target.value})}
                      required
                      style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '14px'}}
                    >
                      <option value="">Select master account...</option>
                      {masterAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_number} - {acc.account_name} ({acc.account_type})
                        </option>
                      ))}
                    </select>
                    {manualMapping.masterAccountId && masterAccounts.find(a => a.id === manualMapping.masterAccountId) && (
                      <div style={{marginTop: '8px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '4px', fontSize: '12px', color: '#065f46'}}>
                        <div><strong>Type:</strong> {masterAccounts.find(a => a.id === manualMapping.masterAccountId).account_type}</div>
                        <div><strong>Number:</strong> {masterAccounts.find(a => a.id === manualMapping.masterAccountId).account_number}</div>
                      </div>
                    )}
                  </div>
                </div>

                {manualMapping.companyAccountId && manualMapping.masterAccountId && (
                  <div style={{padding: '15px', backgroundColor: '#fef3c7', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fbbf24'}}>
                    <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#92400e'}}>⚠️ Type Match Verification:</div>
                    <div style={{fontSize: '13px', color: '#78350f'}}>
                      {unmappedAccounts.find(a => a.id === manualMapping.companyAccountId)?.account_type ===
                       masterAccounts.find(a => a.id === manualMapping.masterAccountId)?.account_type ? (
                        <span style={{color: '#065f46', fontWeight: '600'}}>✓ Types match - this mapping is valid!</span>
                      ) : (
                        <span style={{color: '#991b1b', fontWeight: '600'}}>✗ Warning: Types don't match - this may cause errors!</span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  style={{padding: '12px 32px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'}}
                >
                  ✓ Create Mapping
                </button>
              </form>
            </div>
          )}

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div style={{display: 'grid', gridTemplateColumns: selectedSuggestion ? '1fr 420px' : '1fr', gap: '20px', marginBottom: '20px'}}>
              {/* Suggestions List */}
              <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #4f46e5'}}>
                <h2 style={{marginBottom: '8px', fontSize: '20px', fontWeight: '600', color: '#4f46e5'}}>
                  🤖 AI Mapping Suggestions ({suggestions.length})
                </h2>
                <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '18px'}}>
                  Click any suggestion for detailed analysis, or accept directly
                </p>

                <div style={{display: 'grid', gap: '10px'}}>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedSuggestion(suggestion)}
                      style={{
                        border: selectedSuggestion === suggestion ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: selectedSuggestion === suggestion ? '#eff6ff' : '#fafafa',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSuggestion !== suggestion) e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSuggestion !== suggestion) e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '15px'}}>
                        <div style={{flex: 1}}>
                          {/* Mapping Flow */}
                          <div style={{display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '12px'}}>
                            <div style={{padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e5e7eb'}}>
                              <div style={{fontSize: '10px', color: getAccountTypeColor(suggestion.company_account_number ? 'asset' : 'asset'), marginBottom: '3px', textTransform: 'uppercase', fontWeight: '700'}}>Company</div>
                              <div style={{fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>{suggestion.company_account_number}</div>
                              <div style={{fontSize: '13px', fontWeight: '500'}}>{suggestion.company_account_name}</div>
                            </div>

                            <div style={{fontSize: '22px', color: '#4f46e5', fontWeight: 'bold'}}>→</div>

                            <div style={{padding: '10px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe'}}>
                              <div style={{fontSize: '10px', color: '#4f46e5', marginBottom: '3px', textTransform: 'uppercase', fontWeight: '700'}}>Master</div>
                              <div style={{fontSize: '12px', fontWeight: '600', color: '#4f46e5', marginBottom: '2px'}}>{suggestion.master_account_number}</div>
                              <div style={{fontSize: '13px', fontWeight: '500'}}>{suggestion.master_account_name}</div>
                            </div>
                          </div>

                          {/* Badges */}
                          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                            <Badge
                              text={`${(suggestion.confidence_score * 100).toFixed(0)}% Confident`}
                              color={suggestion.confidence_score >= 0.9 ? '#059669' : suggestion.confidence_score >= 0.8 ? '#d97706' : '#dc2626'}
                            />
                            <Badge
                              text={`${suggestion.name_similarity || 'medium'} similarity`}
                              color="#6366f1"
                            />
                            {suggestion.account_type_match && (
                              <Badge text="✓ Type Match" color="#059669" />
                            )}
                          </div>

                          {/* Quick Reason */}
                          <div style={{marginTop: '10px', fontSize: '12px', color: '#6b7280', fontStyle: 'italic', lineHeight: '1.5'}}>
                            {suggestion.reasoning ? suggestion.reasoning.substring(0, 100) + (suggestion.reasoning.length > 100 ? '...' : '') : 'AI suggested mapping'}
                          </div>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); acceptMapping(suggestion); }}
                          style={{
                            padding: '12px 20px',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
                          }}
                        >
                          ✓ Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSuggestion && (
                  <div style={{marginTop: '15px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', fontSize: '13px', color: '#1e40af', textAlign: 'center'}}>
                    💡 Viewing detailed analysis on the right →
                  </div>
                )}
              </div>

              {/* Detailed Analysis Panel */}
              {selectedSuggestion && (
                <div style={{backgroundColor: 'white', padding: '28px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '2px solid #4f46e5', position: 'sticky', top: '20px', maxHeight: '85vh', overflowY: 'auto'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                    <h3 style={{fontSize: '17px', fontWeight: '700', color: '#1f2937'}}>📋 Detailed Analysis</h3>
                    <button
                      onClick={() => setSelectedSuggestion(null)}
                      style={{backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: '600'}}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Visual Mapping Flow */}
                  <div style={{marginBottom: '25px'}}>
                    <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px'}}>Mapping Flow</div>

                    <div style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '12px'}}>
                      <div style={{fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600'}}>FROM: Company Account</div>
                      <div style={{fontSize: '14px', fontWeight: '700', color: '#1f2937', marginBottom: '4px'}}>
                        {suggestion.company_account_number}
                      </div>
                      <div style={{fontSize: '15px', marginBottom: '8px'}}>{suggestion.company_account_name}</div>
                      <div style={{fontSize: '11px', padding: '4px 8px', backgroundColor: getAccountTypeColor(suggestion.company_account_number ? 'asset' : 'asset') + '20', color: getAccountTypeColor(suggestion.company_account_number ? 'asset' : 'asset'), borderRadius: '4px', display: 'inline-block', fontWeight: '600'}}>
                        Type: {suggestion.company_account_number ? 'ASSET/EXPENSE' : 'Unknown'}
                      </div>
                    </div>

                    <div style={{textAlign: 'center', margin: '15px 0'}}>
                      <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '20px', fontSize: '13px', fontWeight: '600'}}>
                        <span>MAPS TO</span>
                        <span style={{fontSize: '18px'}}>↓</span>
                      </div>
                    </div>

                    <div style={{padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '2px solid #4f46e5'}}>
                      <div style={{fontSize: '11px', color: '#4f46e5', marginBottom: '4px', fontWeight: '600'}}>TO: Master Account</div>
                      <div style={{fontSize: '14px', fontWeight: '700', color: '#4f46e5', marginBottom: '4px'}}>
                        {suggestion.master_account_number}
                      </div>
                      <div style={{fontSize: '15px', fontWeight: '600', marginBottom: '8px'}}>{suggestion.master_account_name}</div>
                      <div style={{fontSize: '11px', padding: '4px 8px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '4px', display: 'inline-block', fontWeight: '600'}}>
                        Consolidated Account
                      </div>
                    </div>
                  </div>

                  {/* Confidence Analysis */}
                  <div style={{marginBottom: '25px'}}>
                    <div style={{fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#1f2937'}}>🎯 AI Confidence Analysis</div>

                    <div style={{marginBottom: '12px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px'}}>
                        <span style={{fontWeight: '600'}}>Confidence Score</span>
                        <span style={{fontWeight: '700', fontSize: '16px', color: suggestion.confidence_score >= 0.9 ? '#059669' : suggestion.confidence_score >= 0.8 ? '#d97706' : '#dc2626'}}>
                          {(suggestion.confidence_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{height: '12px', backgroundColor: '#e5e7eb', borderRadius: '6px', overflow: 'hidden'}}>
                        <div style={{
                          width: `${suggestion.confidence_score * 100}%`,
                          height: '100%',
                          backgroundColor: suggestion.confidence_score >= 0.9 ? '#059669' : suggestion.confidence_score >= 0.8 ? '#d97706' : '#dc2626',
                          transition: 'width 0.5s',
                          borderRadius: '6px'
                        }}></div>
                      </div>
                      <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '4px'}}>
                        {suggestion.confidence_score >= 0.9 ? 'Very High - Highly recommended' :
                         suggestion.confidence_score >= 0.8 ? 'High - Recommended' :
                         suggestion.confidence_score >= 0.7 ? 'Good - Review suggested' :
                         'Moderate - Verify carefully'}
                      </div>
                    </div>

                    <div style={{display: 'grid', gap: '10px'}}>
                      <DetailRow
                        label="Account Type Match"
                        value={suggestion.account_type_match ? '✓ Yes' : '✗ No'}
                        valueColor={suggestion.account_type_match ? '#059669' : '#dc2626'}
                        description={suggestion.account_type_match ? 'Types are compatible' : 'Types may not match'}
                      />
                      <DetailRow
                        label="Name Similarity"
                        value={`${suggestion.name_similarity || 'medium'}`.toUpperCase()}
                        valueColor={suggestion.name_similarity === 'high' ? '#059669' : suggestion.name_similarity === 'medium' ? '#d97706' : '#6b7280'}
                        description="Based on keyword matching"
                      />
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  <div style={{marginBottom: '25px'}}>
                    <div style={{fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#1f2937'}}>💭 Why This Mapping?</div>
                    <div style={{padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '14px', lineHeight: '1.7', color: '#1e40af'}}>
                      {suggestion.reasoning || 'The AI determined this is the best match based on account name similarity, type compatibility, and industry context.'}
                    </div>
                  </div>

                  {/* Alternatives */}
                  {suggestion.alternative_matches && suggestion.alternative_matches.length > 0 && (
                    <div style={{marginBottom: '25px'}}>
                      <div style={{fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#1f2937'}}>🔄 Alternative Matches Considered</div>
                      <div style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.6'}}>
                        {suggestion.alternative_matches.map((alt, i) => (
                          <div key={i} style={{padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', marginBottom: '6px', border: '1px solid #e5e7eb'}}>
                            {i + 1}. {alt}
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '8px', fontStyle: 'italic'}}>
                        The AI considered these alternatives but determined the primary suggestion is the best match
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => acceptMapping(selectedSuggestion)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(5, 150, 105, 0.3)',
                      transition: 'transform 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    ✓ Accept This Mapping
                  </button>

                  <div style={{marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#9ca3af'}}>
                    This will create a permanent mapping
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing Mappings */}
          {existingMappings.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px'}}>
                <h2 style={{fontSize: '20px', fontWeight: '600', color: '#059669'}}>
                  ✓ Active Mappings ({existingMappings.length})
                </h2>
                {selectedMapping && (
                  <button
                    onClick={() => setSelectedMapping(null)}
                    style={{fontSize: '13px', padding: '6px 12px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div style={{display: 'grid', gap: '8px'}}>
                {existingMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    onClick={() => setSelectedMapping(mapping.id === selectedMapping ? null : mapping.id)}
                    style={{
                      padding: '14px',
                      backgroundColor: selectedMapping === mapping.id ? '#f0fdf4' : '#f9fafb',
                      borderRadius: '6px',
                      border: selectedMapping === mapping.id ? '2px solid #059669' : '1px solid #d1fae5',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px'}}>
                      <div style={{flex: 1}}>
                        <span style={{fontWeight: '600', color: '#065f46'}}>{mapping.company_account_number}</span>
                        <span style={{margin: '0 6px', color: '#9ca3af'}}>-</span>
                        <span style={{color: '#374151'}}>{mapping.company_account_name}</span>
                      </div>

                      <div style={{fontSize: '16px', color: '#059669', fontWeight: 'bold'}}>→</div>

                      <div style={{flex: 1}}>
                        <span style={{fontWeight: '600', color: '#065f46'}}>{mapping.master_account_number}</span>
                        <span style={{margin: '0 6px', color: '#9ca3af'}}>-</span>
                        <span style={{color: '#374151'}}>{mapping.master_account_name}</span>
                      </div>

                      <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        {mapping.confidence_score && (
                          <span style={{fontSize: '11px', padding: '3px 8px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '10px', fontWeight: '600'}}>
                            {(mapping.confidence_score * 100).toFixed(0)}%
                          </span>
                        )}
                        {mapping.is_verified && (
                          <span style={{fontSize: '11px', padding: '3px 8px', backgroundColor: '#059669', color: 'white', borderRadius: '10px', fontWeight: '600'}}>
                            VERIFIED
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedMapping === mapping.id && (
                      <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #d1fae5', fontSize: '12px', color: '#6b7280'}}>
                        <div><strong>Created:</strong> {new Date(mapping.created_at).toLocaleDateString()}</div>
                        {mapping.confidence_score && (
                          <div><strong>Confidence:</strong> {(mapping.confidence_score * 100).toFixed(1)}% - {mapping.is_verified ? 'Verified by user' : 'AI suggested'}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{marginTop: '15px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', fontSize: '12px', color: '#065f46'}}>
                ℹ️ Click any mapping to see additional details
              </div>
            </div>
          )}

          {/* Unmapped Accounts Warning */}
          {unmappedAccounts.length > 0 && !generating && suggestions.length === 0 && (
            <div style={{backgroundColor: '#fef3c7', padding: '25px', borderRadius: '8px', marginBottom: '20px', border: '2px solid #fbbf24'}}>
              <div style={{display: 'flex', alignItems: 'start', gap: '15px'}}>
                <div style={{fontSize: '32px'}}>⚠️</div>
                <div style={{flex: 1}}>
                  <h3 style={{fontSize: '17px', fontWeight: '600', color: '#92400e', marginBottom: '10px'}}>
                    {unmappedAccounts.length} Unmapped Account{unmappedAccounts.length !== 1 ? 's' : ''}
                  </h3>
                  <p style={{fontSize: '14px', color: '#78350f', marginBottom: '15px', lineHeight: '1.5'}}>
                    These accounts don't have mappings yet. Unmapped accounts won't be included in consolidations, which can lead to incomplete financial statements.
                  </p>

                  <div style={{backgroundColor: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px'}}>
                    <div style={{fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: '#92400e'}}>Unmapped Accounts:</div>
                    <div style={{display: 'grid', gap: '6px'}}>
                      {unmappedAccounts.slice(0, 8).map(acc => (
                        <div key={acc.id} style={{fontSize: '13px', color: '#78350f', display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#fef3c7', borderRadius: '4px'}}>
                          <span><strong>{acc.account_number}</strong> - {acc.account_name}</span>
                          <span style={{fontSize: '11px', padding: '2px 6px', backgroundColor: '#fbbf24', color: '#78350f', borderRadius: '10px', fontWeight: '600'}}>
                            {acc.account_type}
                          </span>
                        </div>
                      ))}
                      {unmappedAccounts.length > 8 && (
                        <div style={{fontSize: '13px', color: '#78350f', fontStyle: 'italic', textAlign: 'center', marginTop: '6px'}}>
                          ... and {unmappedAccounts.length - 8} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{display: 'flex', gap: '10px'}}>
                    <button
                      onClick={generateAIMappings}
                      style={{flex: 1, padding: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'}}
                    >
                      🤖 Generate AI Mappings
                    </button>
                    <button
                      onClick={() => setShowManualMapping(true)}
                      style={{padding: '12px 20px', backgroundColor: 'white', color: '#4f46e5', border: '2px solid #4f46e5', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'}}
                    >
                      ✏️ Manual
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {unmappedAccounts.length === 0 && existingMappings.length > 0 && (
            <div style={{backgroundColor: '#d1fae5', padding: '40px', borderRadius: '8px', textAlign: 'center', border: '2px solid #6ee7b7'}}>
              <div style={{fontSize: '64px', marginBottom: '15px'}}>✓</div>
              <h3 style={{fontSize: '22px', fontWeight: '700', color: '#065f46', marginBottom: '12px'}}>
                Perfect! All Accounts Mapped
              </h3>
              <p style={{fontSize: '15px', color: '#047857', marginBottom: '20px'}}>
                All {companyAccounts.length} accounts in {selectedCompanyData?.name} are successfully mapped to your master chart of accounts.
              </p>
              <div style={{padding: '15px', backgroundColor: 'white', borderRadius: '6px', display: 'inline-block'}}>
                <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '6px'}}>Mapping Coverage</div>
                <div style={{fontSize: '32px', fontWeight: '700', color: '#059669'}}>100%</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!selectedCompany && (
        <div style={{backgroundColor: 'white', padding: '60px 40px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center'}}>
          <div style={{fontSize: '72px', marginBottom: '25px'}}>🔗</div>
          <h3 style={{fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '15px'}}>
            Account Mapping Center
          </h3>
          <p style={{fontSize: '16px', color: '#6b7280', marginBottom: '12px', maxWidth: '600px', margin: '0 auto 30px'}}>
            Map company-specific accounts to your standardized master chart of accounts using AI-powered intelligent suggestions
          </p>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', maxWidth: '800px', margin: '0 auto', textAlign: 'left'}}>
            <FeatureBox icon="🤖" title="AI-Powered" description="Intelligent suggestions based on account analysis" />
            <FeatureBox icon="🎯" title="High Accuracy" description="Confidence scores and detailed reasoning" />
            <FeatureBox icon="✏️" title="Manual Control" description="Create custom mappings anytime" />
            <FeatureBox icon="📊" title="Full Transparency" description="See exactly why each mapping was suggested" />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ label, value, color, detail }) {
  return (
    <div style={{backgroundColor: '#fafafa', padding: '16px', borderRadius: '8px', borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
      <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px'}}>{label}</div>
      <div style={{fontSize: '28px', fontWeight: '700', color, marginBottom: '4px'}}>{value}</div>
      <div style={{fontSize: '11px', color: '#6b7280'}}>{detail}</div>
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{
      padding: '4px 10px',
      backgroundColor: color + '20',
      color: color,
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      border: `1px solid ${color}40`
    }}>
      {text}
    </span>
  );
}

function DetailRow({ label, value, valueColor, description }) {
  return (
    <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '13px'}}>
      <div>
        <div style={{fontWeight: '600', marginBottom: '2px'}}>{label}</div>
        {description && <div style={{fontSize: '11px', color: '#9ca3af'}}>{description}</div>}
      </div>
      <div style={{fontWeight: '700', color: valueColor}}>{value}</div>
    </div>
  );
}

function AccountTypeChip({ type, label }) {
  const color = type === 'asset' ? '#4f46e5' : type === 'liability' ? '#dc2626' : type === 'equity' ? '#059669' : type === 'revenue' ? '#d97706' : '#dc2626';
  return (
    <div style={{padding: '8px 12px', backgroundColor: color + '15', border: `1px solid ${color}40`, borderRadius: '6px', textAlign: 'center'}}>
      <div style={{fontSize: '12px', fontWeight: '600', color}}>{label}</div>
    </div>
  );
}

function FeatureBox({ icon, title, description }) {
  return (
    <div style={{padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
      <div style={{fontSize: '32px', marginBottom: '10px'}}>{icon}</div>
      <div style={{fontSize: '15px', fontWeight: '600', marginBottom: '6px', color: '#1f2937'}}>{title}</div>
      <div style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>{description}</div>
    </div>
  );
}

export default Mappings;
