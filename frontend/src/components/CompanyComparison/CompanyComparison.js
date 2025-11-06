import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, formatPercent, safeDivide, safeNumber } from '../../utils/formatters';

function CompanyComparison() {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizationId, setOrganizationId] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState({ year: 2024, period: 12 });

  useEffect(() => {
    fetchOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchComparison();
    }
  }, [organizationId, selectedPeriod]);

  const fetchOrganization = async () => {
    try {
      const response = await axios.get('/api/v1/organizations/current');
      console.log('Organization loaded:', response.data);
      setOrganizationId(response.data.id);
    } catch (error) {
      console.error('Failed to load organization:', error);
      setError('Failed to load organization: ' + (error.response?.data?.detail || error.message));
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    if (!organizationId) {
      console.log('No organization ID, skipping fetch');
      return;
    }

    setLoading(true);
    setError('');

    console.log(`Fetching comparison: org=${organizationId}, year=${selectedPeriod.year}, period=${selectedPeriod.period}`);

    try {
      // Get list of companies first
      const companiesResponse = await axios.get(`/api/v1/companies/?organization_id=${organizationId}`);
      console.log('Companies loaded:', companiesResponse.data.length);

      if (companiesResponse.data.length === 0) {
        setError('No companies found');
        setComparison(null);
        setLoading(false);
        return;
      }

      // Fetch financials for each company
      const comparisonPromises = companiesResponse.data.map(company =>
        axios.get(`/api/v1/companies/${company.id}/financials?fiscal_year=${selectedPeriod.year}&fiscal_period=${selectedPeriod.period}`)
          .catch(err => {
            console.warn(`Failed to load financials for ${company.name}:`, err);
            return null;
          })
      );

      const financialResponses = await Promise.all(comparisonPromises);

      // Build comparison data from individual financials
      const comparisonData = financialResponses
        .filter(response => response && response.data)
        .map(response => {
          const f = response.data;
          return {
            company_id: f.company_id,
            company_name: f.company_name,
            currency: f.currency,
            total_assets: f.total_assets,
            total_liabilities: f.total_liabilities,
            total_equity: f.total_equity,
            total_revenue: f.total_revenue,
            total_expenses: f.total_expenses,
            net_income: f.net_income,
            profit_margin: f.total_revenue > 0 ? f.net_income / f.total_revenue : 0,
            transaction_count: f.transaction_count
          };
        });

      if (comparisonData.length === 0) {
        setError('No financial data available for selected period');
        setComparison(null);
        setLoading(false);
        return;
      }

      // Calculate consolidated totals
      const consolidated = {
        revenue: comparisonData.reduce((sum, c) => sum + c.total_revenue, 0),
        assets: comparisonData.reduce((sum, c) => sum + c.total_assets, 0),
        net_income: comparisonData.reduce((sum, c) => sum + c.net_income, 0)
      };

      // Add percentages
      comparisonData.forEach(c => {
        c.revenue_pct = consolidated.revenue > 0 ? (c.total_revenue / consolidated.revenue * 100) : 0;
        c.assets_pct = consolidated.assets > 0 ? (c.total_assets / consolidated.assets * 100) : 0;
      });

      setComparison({
        fiscal_year: selectedPeriod.year,
        fiscal_period: selectedPeriod.period,
        companies: comparisonData,
        consolidated_totals: consolidated
      });

      console.log('✓ Comparison built successfully:', comparisonData.length, 'companies');

    } catch (error) {
      console.error('Comparison fetch error:', error);
      setError(`Failed to load comparison: ${error.response?.data?.detail || error.message}`);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>🔀 Company Comparison</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
          <p style={{marginLeft: '20px', color: '#666'}}>Loading comparison data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>🔀 Company Comparison</h1>
      <p style={{color: '#666', marginBottom: '30px'}}>Side-by-side financial comparison of all member companies</p>

      {error && (
        <div style={{padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', border: '2px solid #fecaca'}}>
          <div style={{fontWeight: '600', marginBottom: '6px'}}>⚠️ Error Loading Comparison</div>
          <div style={{fontSize: '14px'}}>{error}</div>
        </div>
      )}

      {/* Period Selector */}
      <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <div style={{display: 'flex', gap: '15px', alignItems: 'end'}}>
          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>Fiscal Year:</label>
            <select
              value={selectedPeriod.year}
              onChange={(e) => setSelectedPeriod({...selectedPeriod, year: parseInt(e.target.value)})}
              style={{padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px', minWidth: '120px'}}
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
              style={{padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px', minWidth: '150px'}}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('default', { month: 'long' })} ({i + 1})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchComparison}
            style={{padding: '12px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {comparison && comparison.companies && comparison.companies.length > 0 ? (
        <>
          {/* Comparison Table */}
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', overflowX: 'auto'}}>
            <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '20px'}}>
              Side-by-Side Financial Comparison • {selectedPeriod.year}-{String(selectedPeriod.period).padStart(2, '0')}
            </h2>
            <table style={{width: '100%', fontSize: '14px', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                  <th style={{padding: '14px', textAlign: 'left', fontWeight: '700', fontSize: '15px'}}>Metric</th>
                  {comparison.companies.map(company => (
                    <th key={company.company_id} style={{padding: '14px', textAlign: 'right', fontWeight: '700', fontSize: '15px', minWidth: '140px'}}>
                      {company.company_name}
                    </th>
                  ))}
                  <th style={{padding: '14px', textAlign: 'right', fontWeight: '700', fontSize: '15px', backgroundColor: '#eff6ff', color: '#1e40af'}}>
                    Consolidated
                  </th>
                </tr>
              </thead>
              <tbody>
                <MetricRow
                  label="Total Assets"
                  companies={comparison.companies}
                  metric="total_assets"
                  consolidated={comparison.companies.reduce((sum, c) => sum + c.total_assets, 0)}
                  color="#4f46e5"
                />
                <MetricRow
                  label="Total Liabilities"
                  companies={comparison.companies}
                  metric="total_liabilities"
                  consolidated={comparison.companies.reduce((sum, c) => sum + c.total_liabilities, 0)}
                  color="#dc2626"
                />
                <MetricRow
                  label="Total Equity"
                  companies={comparison.companies}
                  metric="total_equity"
                  consolidated={comparison.companies.reduce((sum, c) => sum + c.total_equity, 0)}
                  color="#059669"
                />
                <MetricRow
                  label="Revenue"
                  companies={comparison.companies}
                  metric="total_revenue"
                  consolidated={comparison.consolidated_totals?.revenue || comparison.companies.reduce((sum, c) => sum + c.total_revenue, 0)}
                  color="#d97706"
                  showPct={true}
                />
                <MetricRow
                  label="Expenses"
                  companies={comparison.companies}
                  metric="total_expenses"
                  consolidated={comparison.companies.reduce((sum, c) => sum + c.total_expenses, 0)}
                  color="#dc2626"
                />
                <MetricRow
                  label="Net Income"
                  companies={comparison.companies}
                  metric="net_income"
                  consolidated={comparison.consolidated_totals?.net_income || comparison.companies.reduce((sum, c) => sum + c.net_income, 0)}
                  color="#059669"
                  highlight={true}
                />
                <tr style={{borderTop: '2px solid #e5e7eb'}}>
                  <td style={{padding: '14px', fontWeight: '600', fontSize: '13px', color: '#6b7280'}}>Profit Margin</td>
                  {comparison.companies.map(company => {
                    const margin = safeDivide(company.net_income, company.total_revenue, 0);
                    return (
                      <td key={company.company_id} style={{padding: '14px', textAlign: 'right', fontSize: '14px', fontWeight: '600'}}>
                        {formatPercent(margin)}
                      </td>
                    );
                  })}
                  <td style={{padding: '14px', textAlign: 'right', fontSize: '14px', fontWeight: '700', backgroundColor: '#eff6ff'}}>
                    {formatPercent(safeDivide(
                      comparison.companies.reduce((sum, c) => sum + c.net_income, 0),
                      comparison.companies.reduce((sum, c) => sum + c.total_revenue, 0),
                      0
                    ))}
                  </td>
                </tr>
                <tr>
                  <td style={{padding: '14px', fontWeight: '600', fontSize: '13px', color: '#6b7280'}}>Transactions</td>
                  {comparison.companies.map(company => (
                    <td key={company.company_id} style={{padding: '14px', textAlign: 'right', fontSize: '14px', color: '#6b7280'}}>
                      {company.transaction_count || 0}
                    </td>
                  ))}
                  <td style={{padding: '14px', textAlign: 'right', fontSize: '14px', fontWeight: '600', backgroundColor: '#eff6ff'}}>
                    {comparison.companies.reduce((sum, c) => sum + (c.transaction_count || 0), 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Revenue Contribution Visualization */}
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
            <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '20px'}}>📊 Revenue Contribution</h2>
            <div style={{marginBottom: '25px'}}>
              {comparison.companies.map(company => {
                const revenueTotal = comparison.consolidated_totals?.revenue || comparison.companies.reduce((sum, c) => sum + c.total_revenue, 0);
                const percentage = safeDivide(company.total_revenue, revenueTotal, 0) * 100;

                return (
                  <div key={company.company_id} style={{marginBottom: '16px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px'}}>
                      <span style={{fontWeight: '600'}}>{company.company_name}</span>
                      <span style={{color: '#6b7280'}}>
                        {formatCurrency(company.total_revenue)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{height: '28px', backgroundColor: '#e5e7eb', borderRadius: '6px', overflow: 'hidden'}}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: '#d97706',
                          borderRadius: '6px',
                          transition: 'width 0.5s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: '10px',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        {percentage > 15 && `${percentage.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#1e40af'}}>
                Total Consolidated Revenue: {formatCurrency(comparison.consolidated_totals?.revenue || comparison.companies.reduce((sum, c) => sum + c.total_revenue, 0))}
              </div>
            </div>
          </div>

          {/* Net Income Contribution */}
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '20px'}}>💰 Net Income Contribution</h2>
            <div style={{marginBottom: '25px'}}>
              {comparison.companies.map(company => {
                const incomeTotal = comparison.consolidated_totals?.net_income || comparison.companies.reduce((sum, c) => sum + c.net_income, 0);
                const percentage = incomeTotal > 0 ? safeDivide(company.net_income, incomeTotal, 0) * 100 : 0;

                return (
                  <div key={company.company_id} style={{marginBottom: '16px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px'}}>
                      <span style={{fontWeight: '600'}}>{company.company_name}</span>
                      <span style={{color: company.net_income >= 0 ? '#059669' : '#dc2626', fontWeight: '600'}}>
                        {formatCurrency(company.net_income)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{height: '28px', backgroundColor: '#e5e7eb', borderRadius: '6px', overflow: 'hidden'}}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: company.net_income >= 0 ? '#059669' : '#dc2626',
                          borderRadius: '6px',
                          transition: 'width 0.5s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: '10px',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        {percentage > 15 && `${percentage.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #6ee7b7'}}>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>
                Total Consolidated Net Income: {formatCurrency(comparison.consolidated_totals?.net_income || comparison.companies.reduce((sum, c) => sum + c.net_income, 0))}
              </div>
            </div>
          </div>
        </>
      ) : (
        !loading && !error && (
          <div style={{backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', textAlign: 'center'}}>
            <div style={{fontSize: '64px', marginBottom: '20px'}}>📊</div>
            <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>No Comparison Data Available</h3>
            <p style={{fontSize: '15px', color: '#6b7280', marginBottom: '20px'}}>
              Select a different period or ensure companies have transaction data for {selectedPeriod.year}-{String(selectedPeriod.period).padStart(2, '0')}
            </p>
            <p style={{fontSize: '13px', color: '#9ca3af'}}>
              Try periods: 2024-10, 2024-11, 2024-12, or 2025-01, 2025-02, 2025-03
            </p>
          </div>
        )
      )}
    </div>
  );
}

function MetricRow({ label, companies, metric, consolidated, color, showPct, highlight }) {
  const maxValue = Math.max(...companies.map(c => safeNumber(c[metric])));

  return (
    <tr style={{
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: highlight ? '#f9fafb' : 'transparent'
    }}>
      <td style={{padding: '14px', fontWeight: '600', fontSize: '14px', color: '#374151'}}>{label}</td>
      {companies.map(company => {
        const value = safeNumber(company[metric]);
        const isMax = value === maxValue && value > 0;
        const revenue_pct = company.revenue_pct || 0;

        return (
          <td
            key={company.company_id}
            style={{
              padding: '14px',
              textAlign: 'right',
              fontWeight: isMax ? '700' : '600',
              fontSize: '14px',
              color: isMax ? color : '#374151',
              backgroundColor: isMax ? `${color}15` : 'transparent',
              borderLeft: isMax ? `3px solid ${color}` : 'none'
            }}
          >
            {formatCurrency(value)}
            {showPct && revenue_pct > 0 && (
              <div style={{fontSize: '11px', color: '#6b7280', marginTop: '2px'}}>
                ({revenue_pct.toFixed(1)}%)
              </div>
            )}
          </td>
        );
      })}
      <td style={{
        padding: '14px',
        textAlign: 'right',
        fontWeight: '700',
        fontSize: '15px',
        backgroundColor: '#eff6ff',
        color: '#1e40af'
      }}>
        {formatCurrency(consolidated)}
      </td>
    </tr>
  );
}

export default CompanyComparison;
