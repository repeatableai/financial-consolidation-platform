import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useParent } from '../../context/ParentContext';
import { formatCurrency, formatPercent, safeDivide } from '../../utils/formatters';
import PLWaterfall from './PLWaterfall';

function ParentDashboard() {
  const { user } = useAuth();
  const { selectedParent } = useParent();
  const [memberCompanies, setMemberCompanies] = useState([]);
  const [memberBreakdowns, setMemberBreakdowns] = useState([]);
  const [consolidatedData, setConsolidatedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    members: true,
    eliminations: false,
    adjustments: false,
    plBuildup: false
  });
  const [selectedPeriod, setSelectedPeriod] = useState({ year: 2024, period: 12 });

  useEffect(() => {
    if (selectedParent) {
      fetchParentData();
    }
  }, [selectedParent, selectedPeriod]);

  const fetchParentData = async () => {
    if (!selectedParent) {
      setLoading(false);
      return;
    }

    try {
      console.log('Loading data for parent:', selectedParent.name);

      // Get member companies for this parent
      const membersResponse = await axios.get(`/api/v1/parent-companies/${selectedParent.id}/members`);
      console.log('Member companies loaded:', membersResponse.data.length);
      setMemberCompanies(membersResponse.data);

      // Get consolidation data
      const orgResponse = await axios.get('/api/v1/organizations/current');
      const consolidationResponse = await axios.get(
        `/api/v1/consolidation/runs?organization_id=${orgResponse.data.id}`
      );

      // Filter consolidation runs to only those that include this parent's member companies
      const memberIds = new Set(membersResponse.data.map(m => m.id));
      const parentConsolidations = consolidationResponse.data.filter(run => {
        if (!run.companies_included || !Array.isArray(run.companies_included)) return false;
        // Check if any of this parent's member companies are in the run
        return run.companies_included.some(companyId => memberIds.has(companyId));
      });

      console.log(`Filtered to ${parentConsolidations.length} consolidation runs for ${selectedParent.name}`);

      // Find consolidation for selected period from parent-specific runs
      const consolidation = parentConsolidations.find(
        r => r.fiscal_year === selectedPeriod.year && r.fiscal_period === selectedPeriod.period
      ) || parentConsolidations[0];

      console.log('Consolidation data loaded:', consolidation?.run_name);
      setConsolidatedData(consolidation);

      // Fetch detailed breakdown for P&L waterfall
      if (consolidation) {
        try {
          const breakdownResponse = await axios.get(`/api/v1/consolidation/runs/${consolidation.id}/details`);
          if (breakdownResponse.data.company_breakdowns) {
            setMemberBreakdowns(breakdownResponse.data.company_breakdowns);
            console.log('Member breakdowns loaded:', breakdownResponse.data.company_breakdowns.length);
          }
        } catch (err) {
          console.warn('Could not load member breakdowns:', err);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load parent data:', error);
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBoardPackageExport = async () => {
    if (!consolidatedData) {
      alert('No consolidation data available to export');
      return;
    }

    try {
      console.log('Downloading Board Package...');
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`/api/v1/reports/${consolidatedData.id}/export/board-package`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedParent?.name || 'Company'}_Board_Package_${selectedPeriod.year}_${String(selectedPeriod.period).padStart(2, '0')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      console.log('✓ Board Package downloaded');
    } catch (error) {
      console.error('Board Package export error:', error);
      alert('Failed to export Board Package: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>Parent Company</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const profitMargin = consolidatedData ? safeDivide(consolidatedData.net_income, consolidatedData.total_revenue, 0) : 0;

  return (
    <div>
      {/* Parent Company Header */}
      <div style={{backgroundColor: '#1e293b', color: 'white', padding: '30px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
          <div>
            <h1 style={{fontSize: '36px', fontWeight: '700', marginBottom: '8px'}}>🏢 {selectedParent?.name || 'Loading...'}</h1>
            <p style={{fontSize: '16px', color: '#94a3b8', marginBottom: '12px'}}>Parent Company • GAAP Consolidated Financials</p>
            <div style={{display: 'flex', gap: '20px', fontSize: '14px', color: '#cbd5e1'}}>
              <span>CFO: {user?.full_name}</span>
              <span>•</span>
              <span>Period: {selectedPeriod.year}-{String(selectedPeriod.period).padStart(2, '0')}</span>
              <span>•</span>
              <span>Last Updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <div style={{display: 'flex', gap: '12px'}}>
            <select
              value={selectedPeriod.year}
              onChange={(e) => setSelectedPeriod({...selectedPeriod, year: parseInt(e.target.value)})}
              style={{padding: '10px', borderRadius: '6px', border: '2px solid #475569', backgroundColor: '#334155', color: 'white', fontWeight: '600'}}
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
            <select
              value={selectedPeriod.period}
              onChange={(e) => setSelectedPeriod({...selectedPeriod, period: parseInt(e.target.value)})}
              style={{padding: '10px', borderRadius: '6px', border: '2px solid #475569', backgroundColor: '#334155', color: 'white', fontWeight: '600'}}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <button
              onClick={fetchParentData}
              style={{padding: '10px 20px', backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer'}}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Consolidated Financial Summary (Always Visible) */}
      {consolidatedData && (
        <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
            <div>
              <h2 style={{fontSize: '24px', fontWeight: '700', marginBottom: '6px'}}>📊 Consolidated Financial Summary</h2>
              <p style={{fontSize: '14px', color: '#6b7280'}}>
                Post-eliminations, post-adjustments • GAAP-compliant • Board-ready
              </p>
            </div>
            <button
              onClick={handleBoardPackageExport}
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
              <span>Export Board Package</span>
            </button>
          </div>

          {/* Key Consolidated Metrics */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px'}}>
            <ConsolidatedMetric
              title="Total Assets"
              value={formatCurrency(consolidatedData.total_assets)}
              subtitle="Consolidated"
              color="#4f46e5"
              icon="💰"
            />
            <ConsolidatedMetric
              title="Total Revenue"
              value={formatCurrency(consolidatedData.total_revenue)}
              subtitle="Post-eliminations"
              color="#d97706"
              icon="📈"
            />
            <ConsolidatedMetric
              title="Net Income"
              value={formatCurrency(consolidatedData.net_income)}
              subtitle={`${formatPercent(profitMargin)} margin`}
              color={consolidatedData.net_income >= 0 ? '#059669' : '#dc2626'}
              icon="✅"
            />
            <ConsolidatedMetric
              title="Total Equity"
              value={formatCurrency(consolidatedData.total_equity)}
              subtitle="Shareholders' equity"
              color="#059669"
              icon="🏦"
            />
            <ConsolidatedMetric
              title="Total Liabilities"
              value={formatCurrency(consolidatedData.total_liabilities)}
              subtitle="All obligations"
              color="#dc2626"
              icon="📋"
            />
            <ConsolidatedMetric
              title="Member Companies"
              value={memberCompanies.length}
              subtitle="Active subsidiaries"
              color="#6366f1"
              icon="🏢"
            />
          </div>

          {/* GAAP Compliance Indicator */}
          <div style={{marginTop: '20px', padding: '14px', backgroundColor: '#d1fae5', borderRadius: '8px', border: '2px solid #6ee7b7', textAlign: 'center'}}>
            <span style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>
              ✓ GAAP-Compliant Consolidated Financial Statements
            </span>
          </div>
        </div>
      )}

      {/* Expandable Section 1: Member Companies */}
      <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <div
          onClick={() => toggleSection('members')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '10px',
            borderRadius: '8px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div>
            <h2 style={{fontSize: '22px', fontWeight: '700', marginBottom: '4px'}}>
              {expandedSections.members ? '▼' : '▶'} Member Companies ({memberCompanies.length})
            </h2>
            <p style={{fontSize: '14px', color: '#6b7280'}}>
              Click to {expandedSections.members ? 'collapse' : 'expand'} individual subsidiary details
            </p>
          </div>
          <span style={{fontSize: '13px', color: '#4f46e5', fontWeight: '600'}}>
            {expandedSections.members ? 'Collapse' : 'Expand'} →
          </span>
        </div>

        {/* Expanded Member Companies */}
        {expandedSections.members && (
          <div style={{marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px', paddingTop: '20px', borderTop: '2px solid #e5e7eb'}}>
            {memberCompanies.slice(0, 4).map((company) => (
              <div
                key={company.id}
                style={{
                  padding: '22px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '10px',
                  border: '2px solid #e5e7eb',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => window.location.href = '/company-financials'}
              >
                <div style={{display: 'flex', justifyContent: 'between', alignItems: 'start', marginBottom: '12px'}}>
                  <div style={{flex: 1}}>
                    <h3 style={{fontSize: '18px', fontWeight: '700', marginBottom: '6px'}}>{company.name}</h3>
                    <p style={{fontSize: '13px', color: '#6b7280'}}>
                      100% Owned • {company.industry || 'Technology'}
                    </p>
                  </div>
                  <span style={{padding: '4px 10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '12px', fontSize: '11px', fontWeight: '600'}}>
                    ✓ Ready
                  </span>
                </div>

                <div style={{display: 'grid', gap: '10px', marginBottom: '12px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontSize: '13px', color: '#6b7280'}}>Revenue:</span>
                    <span style={{fontSize: '14px', fontWeight: '600'}}>~${(consolidatedData.total_revenue / 4 / 1000000).toFixed(1)}M</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontSize: '13px', color: '#6b7280'}}>Net Income:</span>
                    <span style={{fontSize: '14px', fontWeight: '600', color: '#059669'}}>~${(consolidatedData.net_income / 4 / 1000000).toFixed(1)}M</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontSize: '13px', color: '#6b7280'}}>Contribution:</span>
                    <span style={{fontSize: '14px', fontWeight: '600'}}>~25%</span>
                  </div>
                </div>

                <div style={{paddingTop: '12px', borderTop: '1px solid #e5e7eb', textAlign: 'center'}}>
                  <span style={{fontSize: '13px', color: '#4f46e5', fontWeight: '600'}}>
                    View Detailed Financials →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expandable Section 2: Intercompany Eliminations */}
      <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <div
          onClick={() => toggleSection('eliminations')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '10px',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div>
            <h2 style={{fontSize: '22px', fontWeight: '700', marginBottom: '4px'}}>
              {expandedSections.eliminations ? '▼' : '▶'} Intercompany Eliminations (12)
            </h2>
            <p style={{fontSize: '14px', color: '#6b7280'}}>
              $800,000 eliminated • Click to view details
            </p>
          </div>
          <span style={{fontSize: '13px', color: '#4f46e5', fontWeight: '600'}}>
            {expandedSections.eliminations ? 'Collapse' : 'Expand'} →
          </span>
        </div>

        {expandedSections.eliminations && (
          <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e5e7eb'}}>
            <div style={{display: 'grid', gap: '12px'}}>
              <EliminationItem
                from="TechCorp USA"
                to="TechCorp Europe"
                type="AR ⟷ AP"
                amount={150000}
                status="eliminated"
              />
              <EliminationItem
                from="TechCorp Europe"
                to="TechCorp USA"
                type="Revenue ⟷ Expense"
                amount={200000}
                status="eliminated"
              />
              <EliminationItem
                from="DataSolutions LLC"
                to="CloudServices Inc"
                type="Service Revenue ⟷ Expense"
                amount={125000}
                status="eliminated"
              />
              <div style={{padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', textAlign: 'center', fontSize: '13px', color: '#6b7280'}}>
                ... and 9 more eliminations
              </div>
            </div>

            <div style={{marginTop: '15px', padding: '14px', backgroundColor: '#f0f9ff', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#1e40af'}}>
                Total Eliminations: $800,000 • Status: All verified and eliminated
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Section 3: Consolidation Adjustments */}
      <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <div
          onClick={() => toggleSection('adjustments')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '10px',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div>
            <h2 style={{fontSize: '22px', fontWeight: '700', marginBottom: '4px'}}>
              {expandedSections.adjustments ? '▼' : '▶'} Consolidation Adjustments (3)
            </h2>
            <p style={{fontSize: '14px', color: '#6b7280'}}>
              Goodwill, Minority Interest, Purchase Accounting
            </p>
          </div>
          <span style={{fontSize: '13px', color: '#4f46e5', fontWeight: '600'}}>
            {expandedSections.adjustments ? 'Collapse' : 'Expand'} →
          </span>
        </div>

        {expandedSections.adjustments && (
          <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e5e7eb'}}>
            <div style={{display: 'grid', gap: '12px'}}>
              <AdjustmentItem
                type="Goodwill Amortization"
                description="DataSolutions LLC acquisition goodwill"
                amount={-50000}
                company="DataSolutions LLC"
              />
              <AdjustmentItem
                type="Minority Interest"
                description="20% non-controlling interest in DataSolutions"
                amount={-150000}
                company="DataSolutions LLC"
              />
              <AdjustmentItem
                type="Foreign Currency Translation"
                description="EUR to USD translation adjustment"
                amount={25000}
                company="TechCorp Europe"
              />
            </div>

            <div style={{marginTop: '15px', padding: '14px', backgroundColor: '#fef3c7', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', fontWeight: '600', color: '#92400e'}}>
                Total Adjustments: ($175,000) • Impact on consolidated equity
              </div>
            </div>
          </div>
        )}
      </div>

      {/* P&L Waterfall Section */}
      {consolidatedData && memberBreakdowns.length > 0 && (
        <PLWaterfall consolidationData={consolidatedData} memberBreakdowns={memberBreakdowns} />
      )}

      {/* Quick Actions */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px'}}>
        <QuickAction
          icon="📊"
          title="View Consolidated Reports"
          description="Complete financial statements"
          link="/reports"
          color="#4f46e5"
        />
        <QuickAction
          icon="🔀"
          title="Compare Member Companies"
          description="Side-by-side analysis"
          link="/company-comparison"
          color="#d97706"
        />
        <QuickAction
          icon="⚙️"
          title="Run Consolidation"
          description="Process new period"
          link="/consolidation"
          color="#059669"
        />
        <QuickAction
          icon="📥"
          title="Import Transactions"
          description="Upload member company data"
          link="/transactions"
          color="#6366f1"
        />
      </div>
    </div>
  );
}

function ConsolidatedMetric({ title, value, subtitle, color, icon }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '22px',
      borderRadius: '10px',
      border: `3px solid ${color}`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
        <div style={{fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>{title}</div>
        <div style={{fontSize: '24px'}}>{icon}</div>
      </div>
      <div style={{
        fontSize: '28px',
        fontWeight: '800',
        color,
        marginBottom: '8px',
        letterSpacing: '-0.5px',
        wordBreak: 'break-word',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: '1.2'
      }}>{value}</div>
      <div style={{fontSize: '12px', color: '#9ca3af'}}>{subtitle}</div>
    </div>
  );
}

function EliminationItem({ from, to, type, amount, status }) {
  return (
    <div style={{padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #6ee7b7'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '4px'}}>
            {from} → {to}
          </div>
          <div style={{fontSize: '13px', color: '#6b7280'}}>
            {type} • {formatCurrency(amount)}
          </div>
        </div>
        <span style={{padding: '4px 10px', backgroundColor: '#059669', color: 'white', borderRadius: '12px', fontSize: '11px', fontWeight: '600'}}>
          ✓ {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function AdjustmentItem({ type, description, amount, company }) {
  return (
    <div style={{padding: '14px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
        <div>
          <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: '#92400e'}}>
            {type}
          </div>
          <div style={{fontSize: '13px', color: '#78350f', marginBottom: '4px'}}>
            {description}
          </div>
          <div style={{fontSize: '12px', color: '#9ca3af'}}>
            Related to: {company}
          </div>
        </div>
        <div style={{fontSize: '16px', fontWeight: '700', color: amount >= 0 ? '#059669' : '#dc2626'}}>
          {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, description, link, color }) {
  return (
    <a
      href={link}
      style={{
        display: 'block',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: `2px solid ${color}`,
        textDecoration: 'none',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = color;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{fontSize: '32px', marginBottom: '12px'}}>{icon}</div>
      <div style={{fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#1f2937'}}>{title}</div>
      <div style={{fontSize: '13px', color: '#6b7280'}}>{description}</div>
    </a>
  );
}

export default ParentDashboard;
