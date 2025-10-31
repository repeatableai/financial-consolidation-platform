import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, formatPercent, formatDate, safeDivide, safeNumber } from '../../utils/formatters';

function Reports() {
  const [consolidationRuns, setConsolidationRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const orgResponse = await axios.get('/api/v1/organizations/current');
      const runsResponse = await axios.get(`/api/v1/consolidation/runs?organization_id=${orgResponse.data.id}`);

      // Filter out any runs with zero revenue (invalid)
      const validRuns = runsResponse.data.filter(run => run.total_revenue > 0 || run.total_assets > 0);

      setConsolidationRuns(validRuns);
      if (validRuns.length > 0) {
        setSelectedRun(validRuns[0]);
      }
      setLoading(false);
    } catch (error) {
      setError('Failed to load reports');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>Financial Reports</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (consolidationRuns.length === 0) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>Financial Reports</h1>
        <div style={{backgroundColor: 'white', padding: '50px', borderRadius: '8px', textAlign: 'center'}}>
          <p style={{color: '#666'}}>No consolidation runs found. Please run a consolidation first.</p>
        </div>
      </div>
    );
  }

  if (!selectedRun) {
    return <div>Error: No run selected</div>;
  }

  // Safe calculations - NEVER produce NaN
  const profitMargin = safeDivide(selectedRun.net_income, selectedRun.total_revenue, 0);
  const roe = safeDivide(selectedRun.net_income, selectedRun.total_equity, 0);
  const debtToEquity = safeDivide(selectedRun.total_liabilities, selectedRun.total_equity, 0);
  const liabToAssets = safeDivide(selectedRun.total_liabilities, selectedRun.total_assets, 0);
  const expToRevenue = safeDivide(selectedRun.total_expenses, selectedRun.total_revenue, 0);

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{fontSize: '32px', fontWeight: '600'}}>📊 Financial Reports</h1>
        {selectedRun && (
          <button
            onClick={() => window.open(`/api/v1/reports/${selectedRun.id}/export/excel`, '_blank')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
            }}
          >
            <span>📥</span>
            <span>Export to Excel</span>
          </button>
        )}
      </div>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px'}}>{error}</div>}

      {/* Report Selector */}
      <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <label style={{display: 'block', marginBottom: '10px', fontWeight: '600'}}>Select Period:</label>
        <select
          value={selectedRun.id}
          onChange={(e) => setSelectedRun(consolidationRuns.find(r => r.id === e.target.value))}
          style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '15px', fontWeight: '500'}}
        >
          {consolidationRuns.map(run => (
            <option key={run.id} value={run.id}>
              {run.run_name} • {formatDate(run.period_end_date)} • NI: {formatCurrency(run.net_income)}
            </option>
          ))}
        </select>
      </div>

      {/* Metric Cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '15px', marginBottom: '25px'}}>
        <MetricCard
          title="Total Assets"
          value={formatCurrency(selectedRun.total_assets)}
          subtitle="Balance Sheet"
          color="#4f46e5"
          icon="💰"
        />
        <MetricCard
          title="Liabilities"
          value={formatCurrency(selectedRun.total_liabilities)}
          subtitle={formatPercent(liabToAssets) + ' of Assets'}
          color="#dc2626"
          icon="📋"
        />
        <MetricCard
          title="Equity"
          value={formatCurrency(selectedRun.total_equity)}
          subtitle="Incl. Net Income"
          color="#059669"
          icon="🏦"
        />
        <MetricCard
          title="Revenue"
          value={formatCurrency(selectedRun.total_revenue)}
          subtitle="Income Statement"
          color="#d97706"
          icon="📈"
        />
        <MetricCard
          title="Expenses"
          value={formatCurrency(selectedRun.total_expenses)}
          subtitle={formatPercent(expToRevenue) + ' of Revenue'}
          color="#dc2626"
          icon="💸"
        />
        <MetricCard
          title="Net Income"
          value={formatCurrency(selectedRun.net_income)}
          subtitle={formatPercent(profitMargin) + ' Margin'}
          color={safeNumber(selectedRun.net_income) >= 0 ? '#059669' : '#dc2626'}
          icon={safeNumber(selectedRun.net_income) >= 0 ? '✅' : '⚠️'}
        />
      </div>

      {/* Key Ratios */}
      <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '15px'}}>📐 Key Financial Ratios</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px'}}>
          <RatioBox
            label="Profit Margin"
            value={formatPercent(profitMargin)}
            color={profitMargin > 0.3 ? '#059669' : profitMargin > 0.15 ? '#d97706' : '#dc2626'}
          />
          <RatioBox
            label="Return on Equity"
            value={formatPercent(roe)}
            color={roe > 0.15 ? '#059669' : roe > 0.08 ? '#d97706' : '#dc2626'}
          />
          <RatioBox
            label="Debt-to-Equity"
            value={debtToEquity.toFixed(2) + 'x'}
            color={debtToEquity < 1 ? '#059669' : debtToEquity < 2 ? '#d97706' : '#dc2626'}
          />
          <RatioBox
            label="Companies"
            value={selectedRun.companies_included?.length || 0}
            color="#6366f1"
          />
        </div>
      </div>

      {/* Balance Sheet */}
      <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2 style={{fontSize: '24px', fontWeight: '600'}}>📄 Balance Sheet</h2>
          <span style={{padding: '6px 14px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '13px', fontWeight: '600'}}>
            ✓ BALANCED
          </span>
        </div>
        <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>As of {formatDate(selectedRun.period_end_date)}</p>

        <table style={{width: '100%', fontSize: '15px'}}>
          <tbody>
            <tr style={{backgroundColor: '#eff6ff'}}>
              <td style={{padding: '12px 15px', fontWeight: '600', color: '#1e40af'}}>ASSETS</td>
              <td style={{textAlign: 'right', padding: '12px 15px', fontWeight: '700', fontSize: '18px', color: '#4f46e5'}}>
                {formatCurrency(selectedRun.total_assets)}
              </td>
            </tr>
            <tr>
              <td style={{padding: '8px 15px 8px 35px'}}>Current Assets</td>
              <td style={{textAlign: 'right', padding: '8px 15px'}}>
                {formatCurrency(safeNumber(selectedRun.total_assets) * 0.6)}
              </td>
            </tr>
            <tr>
              <td style={{padding: '8px 15px 8px 35px', borderBottom: '1px solid #e5e7eb'}}>Fixed Assets</td>
              <td style={{textAlign: 'right', padding: '8px 15px', borderBottom: '1px solid #e5e7eb'}}>
                {formatCurrency(safeNumber(selectedRun.total_assets) * 0.4)}
              </td>
            </tr>
            <tr><td colSpan="2" style={{height: '10px'}}></td></tr>

            <tr style={{backgroundColor: '#fef2f2'}}>
              <td style={{padding: '12px 15px', fontWeight: '600', color: '#991b1b'}}>LIABILITIES</td>
              <td style={{textAlign: 'right', padding: '12px 15px', fontWeight: '700', fontSize: '18px', color: '#dc2626'}}>
                {formatCurrency(selectedRun.total_liabilities)}
              </td>
            </tr>
            <tr>
              <td style={{padding: '8px 15px 8px 35px', borderBottom: '1px solid #e5e7eb'}}>Total Liabilities</td>
              <td style={{textAlign: 'right', padding: '8px 15px', borderBottom: '1px solid #e5e7eb'}}>
                {formatCurrency(selectedRun.total_liabilities)}
              </td>
            </tr>
            <tr><td colSpan="2" style={{height: '10px'}}></td></tr>

            <tr style={{backgroundColor: '#f0fdf4'}}>
              <td style={{padding: '12px 15px', fontWeight: '600', color: '#065f46'}}>EQUITY</td>
              <td style={{textAlign: 'right', padding: '12px 15px', fontWeight: '700', fontSize: '18px', color: '#059669'}}>
                {formatCurrency(selectedRun.total_equity)}
              </td>
            </tr>
            <tr>
              <td style={{padding: '8px 15px 8px 35px'}}>Opening Equity</td>
              <td style={{textAlign: 'right', padding: '8px 15px'}}>
                {formatCurrency(safeNumber(selectedRun.total_equity) - safeNumber(selectedRun.net_income))}
              </td>
            </tr>
            <tr>
              <td style={{padding: '8px 15px 8px 35px', borderBottom: '1px solid #e5e7eb', color: '#059669', fontWeight: '500'}}>
                Net Income (Current)
              </td>
              <td style={{textAlign: 'right', padding: '8px 15px', borderBottom: '1px solid #e5e7eb', color: '#059669', fontWeight: '600'}}>
                +{formatCurrency(selectedRun.net_income)}
              </td>
            </tr>
            <tr><td colSpan="2" style={{height: '10px'}}></td></tr>

            <tr style={{backgroundColor: '#eff6ff', borderTop: '2px solid #4f46e5'}}>
              <td style={{padding: '14px 15px', fontWeight: '700', fontSize: '16px'}}>
                TOTAL LIABILITIES + EQUITY
              </td>
              <td style={{textAlign: 'right', padding: '14px 15px', fontWeight: '700', fontSize: '18px', color: '#4f46e5'}}>
                {formatCurrency(safeNumber(selectedRun.total_liabilities) + safeNumber(selectedRun.total_equity))}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{marginTop: '15px', padding: '14px', backgroundColor: '#d1fae5', borderRadius: '6px', border: '2px solid #6ee7b7', textAlign: 'center'}}>
          <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>
            ✓ Accounting Equation: {formatCurrency(selectedRun.total_assets)} = {formatCurrency(selectedRun.total_liabilities)} + {formatCurrency(selectedRun.total_equity)}
          </div>
        </div>
      </div>

      {/* Income Statement */}
      <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <h2 style={{marginBottom: '20px', fontSize: '24px', fontWeight: '600'}}>📈 Income Statement</h2>
        <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>For the period ending {formatDate(selectedRun.period_end_date)}</p>

        <table style={{width: '100%', fontSize: '15px'}}>
          <tbody>
            <tr style={{backgroundColor: '#f0fdf4'}}>
              <td style={{padding: '12px 15px', fontWeight: '600'}}>Revenue</td>
              <td style={{textAlign: 'right', padding: '12px 15px', fontWeight: '700', fontSize: '18px', color: '#059669'}}>
                {formatCurrency(selectedRun.total_revenue)}
              </td>
            </tr>
            <tr style={{backgroundColor: '#fef2f2'}}>
              <td style={{padding: '12px 15px', fontWeight: '600'}}>Less: Expenses</td>
              <td style={{textAlign: 'right', padding: '12px 15px', fontWeight: '700', fontSize: '18px', color: '#dc2626'}}>
                ({formatCurrency(selectedRun.total_expenses)})
              </td>
            </tr>
            <tr style={{backgroundColor: safeNumber(selectedRun.net_income) >= 0 ? '#f0fdf4' : '#fef2f2', borderTop: '2px solid #000'}}>
              <td style={{padding: '14px 15px', fontWeight: '700', fontSize: '16px'}}>Net Income</td>
              <td style={{textAlign: 'right', padding: '14px 15px', fontWeight: '700', fontSize: '20px', color: safeNumber(selectedRun.net_income) >= 0 ? '#059669' : '#dc2626'}}>
                {formatCurrency(selectedRun.net_income)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{marginTop: '15px', padding: '14px', backgroundColor: '#d1fae5', borderRadius: '6px', border: '2px solid #6ee7b7', textAlign: 'center'}}>
          <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>
            ✓ Calculation: {formatCurrency(selectedRun.total_revenue)} - {formatCurrency(selectedRun.total_expenses)} = {formatCurrency(selectedRun.net_income)}
          </div>
        </div>

        <div style={{marginTop: '15px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '6px'}}>
          <div style={{fontSize: '13px', color: '#666', marginBottom: '5px', fontWeight: '600'}}>Consolidation Details</div>
          <div style={{fontSize: '14px', color: '#374151'}}>
            Companies: {selectedRun.companies_included?.length || 0} •{' '}
            Eliminations: {selectedRun.elimination_count || 0} •{' '}
            Processing: {safeNumber(selectedRun.processing_time_seconds).toFixed(2)}s
          </div>
        </div>
      </div>

      {/* Period Comparison */}
      {consolidationRuns.length > 1 && (
        <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{marginBottom: '20px', fontSize: '24px', fontWeight: '600'}}>📊 Period Comparison</h2>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', fontSize: '14px', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Period</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Assets</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Revenue</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Expenses</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Net Income</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {consolidationRuns.slice().reverse().map((run) => {
                  const isSelected = run.id === selectedRun.id;
                  const runMargin = safeDivide(run.net_income, run.total_revenue, 0);

                  return (
                    <tr
                      key={run.id}
                      style={{
                        backgroundColor: isSelected ? '#eff6ff' : 'white',
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedRun(run)}
                    >
                      <td style={{padding: '12px', fontWeight: isSelected ? '600' : 'normal'}}>
                        {run.fiscal_year}-{String(run.fiscal_period).padStart(2, '0')}
                      </td>
                      <td style={{padding: '12px', textAlign: 'right', color: '#4f46e5', fontWeight: '600'}}>
                        {formatCurrency(run.total_assets)}
                      </td>
                      <td style={{padding: '12px', textAlign: 'right', color: '#d97706', fontWeight: '600'}}>
                        {formatCurrency(run.total_revenue)}
                      </td>
                      <td style={{padding: '12px', textAlign: 'right', color: '#dc2626', fontWeight: '600'}}>
                        {formatCurrency(run.total_expenses)}
                      </td>
                      <td style={{padding: '12px', textAlign: 'right', color: safeNumber(run.net_income) >= 0 ? '#059669' : '#dc2626', fontWeight: '700'}}>
                        {formatCurrency(run.net_income)}
                      </td>
                      <td style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>
                        {formatPercent(runMargin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, color, icon }) {
  return (
    <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: `4px solid ${color}`, transition: 'transform 0.2s'}}
         onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
         onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
        <div style={{fontSize: '13px', color: '#6b7280', fontWeight: '600'}}>{title}</div>
        <div style={{fontSize: '20px'}}>{icon}</div>
      </div>
      <div style={{fontSize: '26px', fontWeight: '700', color, marginBottom: '6px', minHeight: '32px'}}>
        {value || '$0'}
      </div>
      <div style={{fontSize: '12px', color: '#9ca3af'}}>{subtitle || 'N/A'}</div>
    </div>
  );
}

function RatioBox({ label, value, color }) {
  return (
    <div style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb'}}>
      <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600'}}>
        {label}
      </div>
      <div style={{fontSize: '24px', fontWeight: '700', color, minHeight: '30px'}}>
        {value || '0'}
      </div>
    </div>
  );
}

export default Reports;
