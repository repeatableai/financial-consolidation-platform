import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParent } from '../../context/ParentContext';
import { formatCurrency, formatPercent, formatDate, safeDivide, safeNumber } from '../../utils/formatters';

function CompanyFinancials() {
  const { selectedParent } = useParent();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [financials, setFinancials] = useState(null);
  const [accountActivity, setAccountActivity] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState({
    year: 2024,
    period: 12
  });

  useEffect(() => {
    if (selectedParent) {
      fetchCompanies();
    }
  }, [selectedParent]);

  useEffect(() => {
    if (selectedCompany) {
      fetchFinancials();
    }
  }, [selectedCompany, selectedPeriod]);

  const fetchCompanies = async () => {
    if (!selectedParent) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`/api/v1/parent-companies/${selectedParent.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCompanies(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load member companies:', error);
      setError('Failed to load member companies');
      setLoading(false);
    }
  };

  const fetchFinancials = async () => {
    if (!selectedCompany) return;

    setCalculating(true);
    setError('');

    try {
      const response = await axios.get(
        `/api/v1/companies/${selectedCompany}/financials?fiscal_year=${selectedPeriod.year}&fiscal_period=${selectedPeriod.period}`
      );
      setFinancials(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to calculate financials');
      setFinancials(null);
    } finally {
      setCalculating(false);
    }
  };

  const handleRefresh = () => {
    fetchFinancials();
  };

  const loadAccountActivity = async () => {
    if (!selectedCompany) return;

    setLoadingActivity(true);
    try {
      const response = await axios.get(
        `/api/v1/companies/${selectedCompany}/account-activity?fiscal_year=${selectedPeriod.year}&fiscal_period=${selectedPeriod.period}`
      );
      setAccountActivity(response.data);
    } catch (error) {
      setError('Failed to load account activity');
    } finally {
      setLoadingActivity(false);
    }
  };

  const toggleAccount = (accountId) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  if (loading) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>Company Financials</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!selectedParent) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>Company Financials</h1>
        <div style={{padding: '40px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center'}}>
          <p style={{color: '#6b7280', marginBottom: '20px'}}>No parent company selected. Please select a parent company from the sidebar.</p>
        </div>
      </div>
    );
  }

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);
  const profitMargin = financials ? safeDivide(financials.net_income, financials.total_revenue, 0) : 0;
  const roe = financials ? safeDivide(financials.net_income, financials.total_equity, 0) : 0;
  const debtToEquity = financials ? safeDivide(financials.total_liabilities, financials.total_equity, 0) : 0;
  const isBalanced = financials ? Math.abs(financials.total_assets - (financials.total_liabilities + financials.total_equity)) < 0.01 : false;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <div>
          <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '5px'}}>📊 Company Financial Statements</h1>
          <p style={{color: '#666'}}>Individual company financials by period</p>
        </div>
        {financials && (
          <button
            onClick={handleRefresh}
            disabled={calculating}
            style={{
              padding: '12px 24px',
              backgroundColor: calculating ? '#9ca3af' : '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: calculating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{calculating ? '⏳' : '🔄'}</span>
            <span>{calculating ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px'}}>{error}</div>}

      {/* Company and Period Selector */}
      <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px'}}>
          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>Company:</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px'}}
            >
              <option value="">Select company...</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>Fiscal Year:</label>
            <select
              value={selectedPeriod.year}
              onChange={(e) => setSelectedPeriod({...selectedPeriod, year: parseInt(e.target.value)})}
              style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px'}}
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>Period:</label>
            <select
              value={selectedPeriod.period}
              onChange={(e) => setSelectedPeriod({...selectedPeriod, period: parseInt(e.target.value)})}
              style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px'}}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('default', { month: 'long' })} ({i + 1})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCompanyData && (
          <div style={{marginTop: '12px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', fontSize: '13px', color: '#1e40af'}}>
            Viewing: <strong>{selectedCompanyData.name}</strong> • Period: <strong>{selectedPeriod.year}-{String(selectedPeriod.period).padStart(2, '0')}</strong>
          </div>
        )}
      </div>

      {calculating && (
        <div style={{backgroundColor: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px'}}>
          <div className="spinner" style={{margin: '0 auto 20px'}}></div>
          <p style={{color: '#666'}}>Calculating financial statements...</p>
        </div>
      )}

      {financials && !calculating && (
        <>
          {/* Data Quality Warning */}
          {financials.unmapped_account_count > 0 && (
            <div style={{padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '20px', border: '2px solid #fbbf24'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <span style={{fontSize: '24px'}}>⚠️</span>
                <div>
                  <div style={{fontWeight: '600', color: '#92400e', marginBottom: '4px'}}>Data Completeness Warning</div>
                  <div style={{fontSize: '14px', color: '#78350f'}}>
                    {financials.unmapped_account_count} account{financials.unmapped_account_count !== 1 ? 's are' : ' is'} unmapped.
                    Transactions from unmapped accounts are excluded from these financial statements.
                    <a href="/mappings" style={{marginLeft: '8px', color: '#4f46e5', fontWeight: '600'}}>Map accounts →</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Metrics */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px'}}>
            <MetricCard title="Total Assets" value={formatCurrency(financials.total_assets)} color="#4f46e5" icon="💰" />
            <MetricCard title="Liabilities" value={formatCurrency(financials.total_liabilities)} color="#dc2626" icon="📋" />
            <MetricCard title="Equity" value={formatCurrency(financials.total_equity)} color="#059669" icon="🏦" />
            <MetricCard title="Revenue" value={formatCurrency(financials.total_revenue)} color="#d97706" icon="📈" />
            <MetricCard title="Expenses" value={formatCurrency(financials.total_expenses)} color="#dc2626" icon="💸" />
            <MetricCard title="Net Income" value={formatCurrency(financials.net_income)} color={financials.net_income >= 0 ? '#059669' : '#dc2626'} icon={financials.net_income >= 0 ? '✅' : '⚠️'} />
          </div>

          {/* Key Ratios */}
          <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '15px'}}>Key Ratios</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px'}}>
              <RatioBox label="Profit Margin" value={formatPercent(profitMargin)} color={profitMargin > 0.3 ? '#059669' : profitMargin > 0.15 ? '#d97706' : '#dc2626'} />
              <RatioBox label="ROE" value={formatPercent(roe)} color={roe > 0.15 ? '#059669' : '#d97706'} />
              <RatioBox label="Debt-to-Equity" value={debtToEquity.toFixed(2)} color={debtToEquity < 1 ? '#059669' : debtToEquity < 2 ? '#d97706' : '#dc2626'} />
              <RatioBox label="Transactions" value={financials.transaction_count} color="#6366f1" />
            </div>
          </div>

          {/* Balance Sheet */}
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{fontSize: '24px', fontWeight: '600'}}>Balance Sheet</h2>
              {isBalanced && (
                <span style={{padding: '6px 14px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '13px', fontWeight: '600'}}>
                  ✓ BALANCED
                </span>
              )}
            </div>
            <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
              {financials.company_name} • {selectedPeriod.year}-{String(selectedPeriod.period).padStart(2, '0')}
            </p>

            <table style={{width: '100%', fontSize: '15px'}}>
              <tbody>
                <tr style={{backgroundColor: '#eff6ff'}}>
                  <td style={{padding: '12px', fontWeight: '600', color: '#1e40af'}}>ASSETS</td>
                  <td style={{textAlign: 'right', padding: '12px', fontWeight: '700', fontSize: '18px', color: '#4f46e5'}}>
                    {formatCurrency(financials.total_assets)}
                  </td>
                </tr>
                <tr style={{backgroundColor: '#fef2f2'}}>
                  <td style={{padding: '12px', fontWeight: '600', color: '#991b1b'}}>LIABILITIES</td>
                  <td style={{textAlign: 'right', padding: '12px', fontWeight: '700', fontSize: '18px', color: '#dc2626'}}>
                    {formatCurrency(financials.total_liabilities)}
                  </td>
                </tr>
                <tr style={{backgroundColor: '#f0fdf4'}}>
                  <td style={{padding: '12px', fontWeight: '600', color: '#065f46'}}>EQUITY</td>
                  <td style={{textAlign: 'right', padding: '12px', fontWeight: '700', fontSize: '18px', color: '#059669'}}>
                    {formatCurrency(financials.total_equity)}
                  </td>
                </tr>
                <tr style={{backgroundColor: '#eff6ff', borderTop: '2px solid #4f46e5'}}>
                  <td style={{padding: '14px', fontWeight: '700', fontSize: '16px'}}>TOTAL LIABILITIES + EQUITY</td>
                  <td style={{textAlign: 'right', padding: '14px', fontWeight: '700', fontSize: '18px', color: '#4f46e5'}}>
                    {formatCurrency(financials.total_liabilities + financials.total_equity)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{marginTop: '15px', padding: '14px', backgroundColor: isBalanced ? '#d1fae5' : '#fee2e2', borderRadius: '6px', border: `2px solid ${isBalanced ? '#6ee7b7' : '#fecaca'}`, textAlign: 'center'}}>
              <div style={{fontSize: '14px', fontWeight: '600', color: isBalanced ? '#065f46' : '#991b1b'}}>
                {isBalanced ? '✓' : '✗'} {formatCurrency(financials.total_assets)} = {formatCurrency(financials.total_liabilities + financials.total_equity)}
              </div>
            </div>
          </div>

          {/* Income Statement */}
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
            <h2 style={{fontSize: '24px', fontWeight: '600', marginBottom: '20px'}}>Income Statement</h2>

            <table style={{width: '100%', fontSize: '15px'}}>
              <tbody>
                <tr style={{backgroundColor: '#f0fdf4'}}>
                  <td style={{padding: '12px', fontWeight: '600'}}>Revenue</td>
                  <td style={{textAlign: 'right', padding: '12px', fontWeight: '700', fontSize: '18px', color: '#059669'}}>
                    {formatCurrency(financials.total_revenue)}
                  </td>
                </tr>
                <tr style={{backgroundColor: '#fef2f2'}}>
                  <td style={{padding: '12px', fontWeight: '600'}}>Less: Expenses</td>
                  <td style={{textAlign: 'right', padding: '12px', fontWeight: '700', fontSize: '18px', color: '#dc2626'}}>
                    ({formatCurrency(financials.total_expenses)})
                  </td>
                </tr>
                <tr style={{backgroundColor: financials.net_income >= 0 ? '#f0fdf4' : '#fef2f2', borderTop: '2px solid #000'}}>
                  <td style={{padding: '14px', fontWeight: '700', fontSize: '16px'}}>Net Income</td>
                  <td style={{textAlign: 'right', padding: '14px', fontWeight: '700', fontSize: '20px', color: financials.net_income >= 0 ? '#059669' : '#dc2626'}}>
                    {formatCurrency(financials.net_income)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{marginTop: '15px', padding: '14px', backgroundColor: '#d1fae5', borderRadius: '6px', border: '2px solid #6ee7b7', textAlign: 'center'}}>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>
                ✓ {formatCurrency(financials.total_revenue)} - {formatCurrency(financials.total_expenses)} = {formatCurrency(financials.net_income)}
              </div>
            </div>
          </div>

          {/* Account Balances (Trial Balance) */}
          {financials.account_balances && financials.account_balances.length > 0 && (
            <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
              <h2 style={{fontSize: '24px', fontWeight: '600', marginBottom: '20px'}}>Trial Balance</h2>
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', fontSize: '14px', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                      <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Account #</th>
                      <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Account Name</th>
                      <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Type</th>
                      <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Debit</th>
                      <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Credit</th>
                      <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financials.account_balances.map((acc, idx) => (
                      <tr key={idx} style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td style={{padding: '10px'}}>{acc.account_number}</td>
                        <td style={{padding: '10px'}}>{acc.account_name}</td>
                        <td style={{padding: '10px'}}>
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: getTypeColor(acc.account_type) + '20',
                            color: getTypeColor(acc.account_type),
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {acc.account_type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{padding: '10px', textAlign: 'right', color: '#059669', fontWeight: acc.debit > 0 ? '600' : 'normal'}}>
                          {acc.debit > 0 ? formatCurrency(acc.debit) : '-'}
                        </td>
                        <td style={{padding: '10px', textAlign: 'right', color: '#dc2626', fontWeight: acc.credit > 0 ? '600' : 'normal'}}>
                          {acc.credit > 0 ? formatCurrency(acc.credit) : '-'}
                        </td>
                        <td style={{padding: '10px', textAlign: 'right', fontWeight: '600'}}>
                          {formatCurrency(acc.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{backgroundColor: '#f9fafb', borderTop: '2px solid #000'}}>
                      <td colSpan="3" style={{padding: '12px', fontWeight: '700'}}>TOTALS</td>
                      <td style={{padding: '12px', textAlign: 'right', fontWeight: '700', color: '#059669'}}>
                        {formatCurrency(financials.account_balances.reduce((sum, acc) => sum + acc.debit, 0))}
                      </td>
                      <td style={{padding: '12px', textAlign: 'right', fontWeight: '700', color: '#dc2626'}}>
                        {formatCurrency(financials.account_balances.reduce((sum, acc) => sum + acc.credit, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Button to Load Detailed Activity */}
              {!accountActivity && (
                <div style={{marginTop: '20px', textAlign: 'center'}}>
                  <button
                    onClick={loadAccountActivity}
                    disabled={loadingActivity}
                    style={{
                      padding: '14px 28px',
                      backgroundColor: loadingActivity ? '#9ca3af' : '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: loadingActivity ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    {loadingActivity ? '⏳ Loading...' : '📋 Show Detailed Account Activity & Transactions'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Detailed Account Activity Section */}
          {accountActivity && (
            <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2 style={{fontSize: '24px', fontWeight: '600'}}>📋 Detailed Account Activity</h2>
                <button
                  onClick={() => setAccountActivity(null)}
                  style={{padding: '8px 16px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}
                >
                  ✕ Close
                </button>
              </div>

              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
                Click any account to expand and see all transactions with positive/negative impact indicators
              </p>

              <div style={{display: 'grid', gap: '10px'}}>
                {accountActivity.accounts.map((account) => (
                  <div key={account.account_id}>
                    {/* Account Summary Row - Clickable */}
                    <div
                      onClick={() => toggleAccount(account.account_id)}
                      style={{
                        padding: '16px',
                        backgroundColor: expandedAccounts[account.account_id] ? '#eff6ff' : '#f9fafb',
                        borderRadius: '8px',
                        border: expandedAccounts[account.account_id] ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px'}}>
                            <span style={{fontSize: '16px', color: '#4f46e5'}}>{expandedAccounts[account.account_id] ? '▼' : '▶'}</span>
                            <span style={{fontSize: '14px', fontWeight: '700'}}>{account.account_number}</span>
                            <span style={{fontSize: '15px', fontWeight: '600'}}>{account.account_name}</span>
                            {!account.is_mapped && (
                              <span style={{padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '10px', fontSize: '11px', fontWeight: '600'}}>
                                UNMAPPED
                              </span>
                            )}
                          </div>
                          <div style={{fontSize: '12px', color: '#6b7280', marginLeft: '28px'}}>
                            → {account.master_account} • {account.transaction_count} transaction{account.transaction_count !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'right'}}>
                          <div>
                            <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '2px'}}>Debits</div>
                            <div style={{fontSize: '15px', fontWeight: '600', color: '#059669'}}>
                              {formatCurrency(account.total_debits)}
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '2px'}}>Credits</div>
                            <div style={{fontSize: '15px', fontWeight: '600', color: '#dc2626'}}>
                              {formatCurrency(account.total_credits)}
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '2px'}}>Net Change</div>
                            <div style={{fontSize: '16px', fontWeight: '700', color: account.net_change >= 0 ? '#4f46e5' : '#dc2626'}}>
                              {account.net_change >= 0 ? '+' : ''}{formatCurrency(account.net_change)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Transaction Detail */}
                    {expandedAccounts[account.account_id] && account.transactions && account.transactions.length > 0 && (
                      <div style={{marginTop: '8px', marginLeft: '28px', padding: '20px', backgroundColor: 'white', border: '2px solid #e5e7eb', borderRadius: '8px'}}>
                        <h4 style={{fontSize: '14px', fontWeight: '600', marginBottom: '15px', color: '#1f2937'}}>
                          Transaction History ({account.transactions.length})
                        </h4>

                        <div style={{overflowX: 'auto'}}>
                          <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
                            <thead>
                              <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Date</th>
                                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Description</th>
                                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Reference</th>
                                <th style={{padding: '10px', textAlign: 'right', fontWeight: '600'}}>Debit</th>
                                <th style={{padding: '10px', textAlign: 'right', fontWeight: '600'}}>Credit</th>
                                <th style={{padding: '10px', textAlign: 'center', fontWeight: '600'}}>Impact</th>
                              </tr>
                            </thead>
                            <tbody>
                              {account.transactions.map((txn, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid #e5e7eb'}}>
                                  <td style={{padding: '10px'}}>{new Date(txn.date).toLocaleDateString()}</td>
                                  <td style={{padding: '10px'}}>{txn.description}</td>
                                  <td style={{padding: '10px', color: '#6b7280'}}>{txn.reference || '-'}</td>
                                  <td style={{padding: '10px', textAlign: 'right', color: '#059669', fontWeight: txn.debit > 0 ? '600' : 'normal'}}>
                                    {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                                  </td>
                                  <td style={{padding: '10px', textAlign: 'right', color: '#dc2626', fontWeight: txn.credit > 0 ? '600' : 'normal'}}>
                                    {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                                  </td>
                                  <td style={{padding: '10px', textAlign: 'center'}}>
                                    <span style={{
                                      padding: '3px 10px',
                                      backgroundColor: txn.impact === 'positive' ? '#d1fae5' : '#fee2e2',
                                      color: txn.impact === 'positive' ? '#065f46' : '#991b1b',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      fontWeight: '600'
                                    }}>
                                      {txn.impact === 'positive' ? '↗ Increase' : '↘ Decrease'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{backgroundColor: '#f9fafb', borderTop: '2px solid #000'}}>
                                <td colSpan="3" style={{padding: '10px', fontWeight: '700'}}>ACCOUNT TOTALS</td>
                                <td style={{padding: '10px', textAlign: 'right', fontWeight: '700', color: '#059669'}}>
                                  {formatCurrency(account.total_debits)}
                                </td>
                                <td style={{padding: '10px', textAlign: 'right', fontWeight: '700', color: '#dc2626'}}>
                                  {formatCurrency(account.total_credits)}
                                </td>
                                <td style={{padding: '10px', textAlign: 'center', fontWeight: '700'}}>
                                  {formatCurrency(account.net_change)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Account Impact Analysis */}
                        <div style={{marginTop: '15px', padding: '14px', backgroundColor: account.net_change >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '6px', border: `1px solid ${account.net_change >= 0 ? '#6ee7b7' : '#fecaca'}`}}>
                          <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: account.net_change >= 0 ? '#065f46' : '#991b1b'}}>
                            📊 Account Impact Analysis:
                          </div>
                          <div style={{fontSize: '13px', color: '#374151', lineHeight: '1.6'}}>
                            This <strong>{account.account_type}</strong> account experienced a net{' '}
                            <strong style={{color: account.net_change >= 0 ? '#059669' : '#dc2626'}}>
                              {account.net_change >= 0 ? 'increase' : 'decrease'} of {formatCurrency(Math.abs(account.net_change))}
                            </strong> during this period.
                            Total activity: <strong>{formatCurrency(account.total_debits + account.total_credits)}</strong> across{' '}
                            <strong>{account.transaction_count}</strong> transaction{account.transaction_count !== 1 ? 's' : ''}.
                            {account.net_change >= 0 && account.account_type === 'asset' && (
                              <span style={{color: '#059669'}}> This is a positive indicator - assets increased.</span>
                            )}
                            {account.net_change < 0 && account.account_type === 'asset' && (
                              <span style={{color: '#dc2626'}}> This indicates assets decreased.</span>
                            )}
                            {account.net_change >= 0 && account.account_type === 'revenue' && (
                              <span style={{color: '#059669'}}> This is positive - revenue increased.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Activity Summary */}
              <div style={{marginTop: '20px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
                <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#1e40af'}}>Activity Summary</div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px'}}>
                  <div><span style={{color: '#6b7280'}}>Active Accounts:</span> <strong>{accountActivity.accounts.length}</strong></div>
                  <div><span style={{color: '#6b7280'}}>Mapped:</span> <strong style={{color: '#059669'}}>{accountActivity.accounts.filter(a => a.is_mapped).length}</strong></div>
                  <div><span style={{color: '#6b7280'}}>Unmapped:</span> <strong style={{color: '#dc2626'}}>{accountActivity.accounts.filter(a => !a.is_mapped).length}</strong></div>
                  <div><span style={{color: '#6b7280'}}>Total Transactions:</span> <strong>{accountActivity.accounts.reduce((sum, a) => sum + a.transaction_count, 0)}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px'}}>Statement Details</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '14px'}}>
              <div><span style={{color: '#6b7280'}}>Transactions:</span> <strong>{financials.transaction_count}</strong></div>
              <div><span style={{color: '#6b7280'}}>Mapped Accounts:</span> <strong>{financials.mapped_account_count}</strong></div>
              <div><span style={{color: '#6b7280'}}>Unmapped:</span> <strong style={{color: financials.unmapped_account_count > 0 ? '#dc2626' : '#059669'}}>{financials.unmapped_account_count}</strong></div>
              <div><span style={{color: '#6b7280'}}>Last Updated:</span> <strong>{new Date(financials.last_calculated).toLocaleTimeString()}</strong></div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!selectedCompany && !calculating && (
        <div style={{backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', textAlign: 'center'}}>
          <div style={{fontSize: '64px', marginBottom: '20px'}}>📊</div>
          <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>Individual Company Financials</h3>
          <p style={{fontSize: '15px', color: '#6b7280'}}>Select a company and period above to view financial statements</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, color, icon }) {
  return (
    <div style={{backgroundColor: 'white', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: `4px solid ${color}`}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
        <div style={{fontSize: '12px', color: '#6b7280', fontWeight: '600'}}>{title}</div>
        <div style={{fontSize: '18px'}}>{icon}</div>
      </div>
      <div style={{fontSize: '24px', fontWeight: '700', color}}>{value}</div>
    </div>
  );
}

function RatioBox({ label, value, color }) {
  return (
    <div style={{padding: '14px', backgroundColor: '#f9fafb', borderRadius: '6px'}}>
      <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600'}}>{label}</div>
      <div style={{fontSize: '22px', fontWeight: '700', color}}>{value}</div>
    </div>
  );
}

function getTypeColor(type) {
  const colors = {
    'asset': '#4f46e5',
    'liability': '#dc2626',
    'equity': '#059669',
    'revenue': '#d97706',
    'expense': '#dc2626'
  };
  return colors[type] || '#6b7280';
}

export default CompanyFinancials;
