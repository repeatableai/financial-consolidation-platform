import { useState, useEffect } from 'react';
import axios from 'axios';

function Consolidation() {
  const [consolidationRuns, setConsolidationRuns] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [expandedRuns, setExpandedRuns] = useState({});
  const [runDetails, setRunDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizationId, setOrganizationId] = useState(null);
  const [showNewRunForm, setShowNewRunForm] = useState(false);
  const [formData, setFormData] = useState({
    fiscal_year: new Date().getFullYear(),
    fiscal_period: new Date().getMonth() + 1,
    run_name: '',
    selectedCompanies: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const orgResponse = await axios.get('/api/v1/organizations/current');
      setOrganizationId(orgResponse.data.id);

      const [runsRes, companiesRes] = await Promise.all([
        axios.get(`/api/v1/consolidation/runs?organization_id=${orgResponse.data.id}`),
        axios.get(`/api/v1/companies/?organization_id=${orgResponse.data.id}`)
      ]);

      setConsolidationRuns(runsRes.data);
      setCompanies(companiesRes.data);
      setFormData(prev => ({
        ...prev,
        selectedCompanies: companiesRes.data.map(c => c.id)
      }));

      setLoading(false);
    } catch (error) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const toggleRunExpansion = async (runId) => {
    if (expandedRuns[runId]) {
      setExpandedRuns(prev => ({ ...prev, [runId]: false }));
    } else {
      if (!runDetails[runId]) {
        try {
          const response = await axios.get(`/api/v1/consolidation/runs/${runId}/details`);
          setRunDetails(prev => ({ ...prev, [runId]: response.data }));
        } catch (error) {
          setError('Failed to load details');
          return;
        }
      }
      setExpandedRuns(prev => ({ ...prev, [runId]: true }));
    }
  };

  const runConsolidation = async (e) => {
    e.preventDefault();
    setRunning(true);
    setError('');
    setSuccess('');

    try {
      const periodEndDate = new Date(formData.fiscal_year, formData.fiscal_period, 0);

      const response = await axios.post('/api/v1/consolidation/run', {
        organization_id: organizationId,
        fiscal_year: formData.fiscal_year,
        fiscal_period: formData.fiscal_period,
        period_end_date: periodEndDate.toISOString(),
        company_ids: formData.selectedCompanies,
        run_name: formData.run_name || `Consolidation ${formData.fiscal_year}-${String(formData.fiscal_period).padStart(2, '0')}`
      });

      setSuccess(`Consolidation completed! Net Income: ${formatCurrency(response.data.net_income)}`);
      setShowNewRunForm(false);
      fetchData();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to run consolidation');
    } finally {
      setRunning(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const toggleCompany = (companyId) => {
    setFormData(prev => ({
      ...prev,
      selectedCompanies: prev.selectedCompanies.includes(companyId)
        ? prev.selectedCompanies.filter(id => id !== companyId)
        : [...prev.selectedCompanies, companyId]
    }));
  };

  if (loading) {
    return (
      <div>
        <h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>Consolidation</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <div>
          <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '5px'}}>Consolidation</h1>
          <p style={{color: '#666'}}>Run and analyze financial consolidations</p>
        </div>
        <button
          onClick={() => setShowNewRunForm(!showNewRunForm)}
          style={{padding: '12px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
        >
          {showNewRunForm ? 'Cancel' : '+ New Consolidation'}
        </button>
      </div>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px'}}>{error}</div>}
      {success && <div style={{padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '20px'}}>{success}</div>}

      {showNewRunForm && (
        <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
          <h2 style={{marginBottom: '20px', fontSize: '20px', fontWeight: '600'}}>Configure New Consolidation</h2>

          {/* Helper Info */}
          <div style={{padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe', marginBottom: '20px'}}>
            <div style={{fontSize: '13px', color: '#1e40af', marginBottom: '6px', fontWeight: '600'}}>💡 Available Periods with Transaction Data:</div>
            <div style={{fontSize: '13px', color: '#3b82f6'}}>
              • 2024: Oct (10), Nov (11), Dec (12)<br/>
              • 2025: Jan (1), Feb (2), Mar (3)
            </div>
          </div>

          <form onSubmit={runConsolidation}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Fiscal Year:</label>
                <select value={formData.fiscal_year} onChange={(e) => setFormData({...formData, fiscal_year: parseInt(e.target.value)})} style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Fiscal Period:</label>
                <select value={formData.fiscal_period} onChange={(e) => setFormData({...formData, fiscal_period: parseInt(e.target.value)})} style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })} ({i + 1})</option>
                  ))}
                </select>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Run Name:</label>
                <input type="text" value={formData.run_name} onChange={(e) => setFormData({...formData, run_name: e.target.value})} placeholder={`Consolidation ${formData.fiscal_year}-${String(formData.fiscal_period).padStart(2, '0')}`} style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}} />
              </div>
            </div>
            <div style={{marginBottom: '25px'}}>
              <label style={{display: 'block', marginBottom: '12px', fontWeight: '500'}}>Companies:</label>
              <div style={{display: 'grid', gap: '10px'}}>
                {companies.map(company => (
                  <label key={company.id} style={{display: 'flex', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', cursor: 'pointer'}}>
                    <input type="checkbox" checked={formData.selectedCompanies.includes(company.id)} onChange={() => toggleCompany(company.id)} style={{marginRight: '12px', width: '18px', height: '18px'}} />
                    <div><div style={{fontWeight: '600'}}>{company.name}</div><div style={{fontSize: '13px', color: '#6b7280'}}>{company.industry}</div></div>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={running || formData.selectedCompanies.length === 0} style={{padding: '14px', backgroundColor: running || formData.selectedCompanies.length === 0 ? '#9ca3af' : '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: running || formData.selectedCompanies.length === 0 ? 'not-allowed' : 'pointer', width: '100%'}}>
              {running ? '⚙️ Running...' : `🚀 Run Consolidation (${formData.selectedCompanies.length} companies)`}
            </button>
          </form>
          {running && <div style={{marginTop: '20px', textAlign: 'center'}}><div className="spinner" style={{margin: '0 auto 15px'}}></div><p style={{color: '#666'}}>Processing...</p></div>}
        </div>
      )}

      {consolidationRuns.length > 0 && (
        <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{marginBottom: '20px', fontSize: '20px', fontWeight: '600'}}>Consolidation History ({consolidationRuns.length})</h2>
          <div style={{display: 'grid', gap: '15px'}}>
            {consolidationRuns.map((run) => (
              <div key={run.id} style={{border: '2px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden'}}>
                <div onClick={() => toggleRunExpansion(run.id)} style={{padding: '20px', cursor: 'pointer', backgroundColor: expandedRuns[run.id] ? '#f0f9ff' : '#fafafa'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = expandedRuns[run.id] ? '#f0f9ff' : '#fafafa'}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <span style={{fontSize: '18px', color: '#4f46e5'}}>{expandedRuns[run.id] ? '▼' : '▶'}</span>
                        <h3 style={{fontSize: '18px', fontWeight: '600'}}>{run.run_name}</h3>
                      </div>
                      <div style={{fontSize: '14px', color: '#6b7280', marginLeft: '28px'}}>{formatDate(run.period_end_date)}</div>
                    </div>
                    <span style={{padding: '4px 12px', backgroundColor: run.status === 'completed' ? '#d1fae5' : '#fee2e2', color: run.status === 'completed' ? '#065f46' : '#991b1b', borderRadius: '12px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase'}}>{run.status}</span>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px'}}>
                    <MetricItem label="Assets" value={formatCurrency(run.total_assets)} color="#4f46e5" />
                    <MetricItem label="Revenue" value={formatCurrency(run.total_revenue)} color="#d97706" />
                    <MetricItem label="Net Income" value={formatCurrency(run.net_income)} color={run.net_income >= 0 ? '#059669' : '#dc2626'} />
                  </div>
                  <div style={{fontSize: '12px', color: '#6b7280', display: 'flex', gap: '15px'}}>
                    <span>Companies: {run.companies_included?.length || 0}</span>
                    <span>Eliminations: {run.elimination_count}</span>
                    <span style={{marginLeft: 'auto', color: '#4f46e5', fontWeight: '600'}}>Click to {expandedRuns[run.id] ? 'collapse' : 'expand'} →</span>
                  </div>
                </div>

                {expandedRuns[run.id] && runDetails[run.id] && (
                  <div style={{padding: '25px', backgroundColor: 'white', borderTop: '2px solid #e5e7eb'}}>
                    <h4 style={{fontSize: '16px', fontWeight: '600', marginBottom: '18px', color: '#1f2937'}}>📊 Company-by-Company Breakdown</h4>
                    <div style={{display: 'grid', gap: '12px'}}>
                      {runDetails[run.id].company_breakdowns.map((comp) => (
                        <div key={comp.company_id} style={{border: '1px solid #e5e7eb', borderRadius: '8px', padding: '18px', backgroundColor: '#f9fafb'}}>
                          <div style={{marginBottom: '15px'}}>
                            <h5 style={{fontSize: '15px', fontWeight: '600', marginBottom: '4px'}}>{comp.company_name}</h5>
                            <div style={{fontSize: '12px', color: '#6b7280'}}>{comp.currency} • {comp.transaction_count} transactions</div>
                          </div>
                          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px'}}>
                            <CompMetric label="Assets" value={formatCurrency(comp.assets)} color="#4f46e5" />
                            <CompMetric label="Liabilities" value={formatCurrency(comp.liabilities)} color="#dc2626" />
                            <CompMetric label="Equity" value={formatCurrency(comp.equity)} color="#6366f1" />
                            <CompMetric label="Revenue" value={formatCurrency(comp.revenue)} color="#059669" />
                            <CompMetric label="Expenses" value={formatCurrency(comp.expenses)} color="#dc2626" />
                            <CompMetric label="Net Income" value={formatCurrency(comp.net_income)} color={comp.net_income >= 0 ? '#059669' : '#dc2626'} />
                          </div>
                          <div style={{paddingTop: '10px', borderTop: '1px solid #e5e7eb', fontSize: '11px', color: '#6b7280'}}>
                            Contribution:{' '}
                            {run.total_revenue > 0 ? `Revenue ${((comp.revenue / run.total_revenue) * 100).toFixed(1)}%` : 'Revenue N/A'} •{' '}
                            {run.total_assets > 0 ? `Assets ${((comp.assets / run.total_assets) * 100).toFixed(1)}%` : 'Assets N/A'} •{' '}
                            {run.net_income > 0 ? `Net Income ${((comp.net_income / run.net_income) * 100).toFixed(1)}%` : 'Net Income N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop: '18px', padding: '18px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
                      <h5 style={{fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#1e40af'}}>Summary</h5>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12px'}}>
                        <div><span style={{color: '#6b7280'}}>Companies:</span> <span style={{fontWeight: '600'}}>{runDetails[run.id].company_breakdowns.length}</span></div>
                        <div><span style={{color: '#6b7280'}}>Eliminations:</span> <span style={{fontWeight: '600'}}>{runDetails[run.id].elimination_count}</span></div>
                        <div><span style={{color: '#6b7280'}}>Processing:</span> <span style={{fontWeight: '600'}}>{runDetails[run.id].processing_time_seconds?.toFixed(2)}s</span></div>
                        <div><span style={{color: '#6b7280'}}>Total Transactions:</span> <span style={{fontWeight: '600'}}>{runDetails[run.id].company_breakdowns.reduce((sum, c) => sum + c.transaction_count, 0)}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {consolidationRuns.length === 0 && !showNewRunForm && (
        <div style={{backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center'}}>
          <div style={{fontSize: '64px', marginBottom: '20px'}}>⚙️</div>
          <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>Ready to Run Your First Consolidation</h3>
          <p style={{fontSize: '15px', color: '#6b7280', marginBottom: '25px'}}>Consolidate financial data with automated eliminations</p>
          <button onClick={() => setShowNewRunForm(true)} style={{padding: '12px 32px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer'}}>🚀 Start Consolidation</button>
        </div>
      )}
    </div>
  );
}

function MetricItem({ label, value, color }) {
  return <div><div style={{fontSize: '10px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase'}}>{label}</div><div style={{fontSize: '15px', fontWeight: '600', color}}>{value}</div></div>;
}

function CompMetric({ label, value, color }) {
  return <div style={{backgroundColor: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb'}}><div style={{fontSize: '9px', color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase', fontWeight: '600'}}>{label}</div><div style={{fontSize: '14px', fontWeight: '600', color}}>{value}</div></div>;
}

export default Consolidation;
