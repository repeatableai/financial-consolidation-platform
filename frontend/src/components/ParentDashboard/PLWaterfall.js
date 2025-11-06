import { formatCurrency, safeDivide } from '../../utils/formatters';

function PLWaterfall({ consolidationData, memberBreakdowns }) {
  if (!consolidationData || !memberBreakdowns || memberBreakdowns.length === 0) {
    return null;
  }

  // Calculate totals
  const memberRevenueTotal = memberBreakdowns.reduce((sum, m) => sum + m.revenue, 0);
  const memberExpensesTotal = memberBreakdowns.reduce((sum, m) => sum + m.expenses, 0);
  const memberNetIncomeTotal = memberBreakdowns.reduce((sum, m) => sum + m.net_income, 0);

  const eliminations = {
    revenue: 800000, // Hardcoded for demo - should come from actual elimination data
    expenses: 650000
  };

  const consolidatedRevenue = consolidationData.total_revenue;
  const consolidatedExpenses = consolidationData.total_expenses;
  const consolidatedNetIncome = consolidationData.net_income;

  return (
    <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
      <h2 style={{fontSize: '24px', fontWeight: '700', marginBottom: '8px'}}>💹 P&L Buildup Analysis</h2>
      <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '25px'}}>
        How member companies build up to consolidated parent company P&L
      </p>

      {/* Revenue Waterfall */}
      <div style={{marginBottom: '35px'}}>
        <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '18px', color: '#d97706'}}>
          📈 REVENUE BUILDUP
        </h3>

        {memberBreakdowns.map((member, idx) => {
          const percentage = safeDivide(member.revenue, memberRevenueTotal, 0) * 100;

          return (
            <div key={idx} style={{marginBottom: '12px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <span style={{fontSize: '20px', color: '#d97706'}}>├─</span>
                  <span style={{fontSize: '15px', fontWeight: '600'}}>{member.company_name}</span>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '16px', fontWeight: '700', color: '#d97706'}}>
                    {formatCurrency(member.revenue)}
                  </div>
                  <div style={{fontSize: '12px', color: '#6b7280'}}>
                    {percentage.toFixed(1)}% of member total
                  </div>
                </div>
              </div>
              <div style={{marginLeft: '32px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: '#d97706',
                  borderRadius: '4px',
                  transition: 'width 0.3s'
                }}></div>
              </div>
            </div>
          );
        })}

        <div style={{marginTop: '16px', marginBottom: '12px', paddingTop: '16px', borderTop: '2px dashed #d1d5db'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <span style={{fontSize: '18px'}}>└─</span>
              <span style={{fontSize: '15px', fontWeight: '600', color: '#6b7280'}}>Member Companies Subtotal</span>
            </div>
            <div style={{fontSize: '17px', fontWeight: '700', color: '#374151'}}>
              {formatCurrency(memberRevenueTotal)}
            </div>
          </div>
        </div>

        <div style={{marginBottom: '12px', paddingLeft: '32px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <span style={{fontSize: '18px', color: '#dc2626'}}>⊖</span>
              <span style={{fontSize: '15px', fontWeight: '600', color: '#dc2626'}}>Less: Intercompany Eliminations</span>
            </div>
            <div style={{fontSize: '16px', fontWeight: '700', color: '#dc2626'}}>
              ({formatCurrency(eliminations.revenue)})
            </div>
          </div>
        </div>

        <div style={{marginTop: '16px', paddingTop: '16px', borderTop: '3px solid #4f46e5', backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{fontSize: '18px', fontWeight: '700', color: '#1e40af'}}>
              CONSOLIDATED REVENUE
            </div>
            <div style={{fontSize: '24px', fontWeight: '800', color: '#4f46e5'}}>
              {formatCurrency(consolidatedRevenue)}
            </div>
          </div>
        </div>
      </div>

      {/* Net Income Waterfall */}
      <div>
        <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '18px', color: '#059669'}}>
          💰 NET INCOME BUILDUP
        </h3>

        {memberBreakdowns.map((member, idx) => {
          const percentage = safeDivide(member.net_income, memberNetIncomeTotal, 0) * 100;

          return (
            <div key={idx} style={{marginBottom: '12px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <span style={{fontSize: '20px', color: '#059669'}}>├─</span>
                  <span style={{fontSize: '15px', fontWeight: '600'}}>{member.company_name}</span>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '16px', fontWeight: '700', color: member.net_income >= 0 ? '#059669' : '#dc2626'}}>
                    {formatCurrency(member.net_income)}
                  </div>
                  <div style={{fontSize: '12px', color: '#6b7280'}}>
                    {percentage.toFixed(1)}% of member total
                  </div>
                </div>
              </div>
              <div style={{marginLeft: '32px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{
                  height: '100%',
                  width: `${Math.abs(percentage)}%`,
                  backgroundColor: member.net_income >= 0 ? '#059669' : '#dc2626',
                  borderRadius: '4px',
                  transition: 'width 0.3s'
                }}></div>
              </div>
            </div>
          );
        })}

        <div style={{marginTop: '16px', marginBottom: '12px', paddingTop: '16px', borderTop: '2px dashed #d1d5db'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <span style={{fontSize: '18px'}}>└─</span>
              <span style={{fontSize: '15px', fontWeight: '600', color: '#6b7280'}}>Member Companies Subtotal</span>
            </div>
            <div style={{fontSize: '17px', fontWeight: '700', color: '#374151'}}>
              {formatCurrency(memberNetIncomeTotal)}
            </div>
          </div>
        </div>

        <div style={{marginBottom: '12px', paddingLeft: '32px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <span style={{fontSize: '18px', color: '#dc2626'}}>⊖</span>
              <span style={{fontSize: '15px', fontWeight: '600', color: '#dc2626'}}>Goodwill Amortization</span>
            </div>
            <div style={{fontSize: '16px', fontWeight: '700', color: '#dc2626'}}>
              ($50,000)
            </div>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '30px'}}>
              <span style={{fontSize: '18px', color: '#dc2626'}}>⊖</span>
              <span style={{fontSize: '15px', fontWeight: '600', color: '#dc2626'}}>Minority Interest (DataSolutions 20%)</span>
            </div>
            <div style={{fontSize: '16px', fontWeight: '700', color: '#dc2626'}}>
              ({formatCurrency(memberBreakdowns.find(m => m.company_name.includes('DataSolutions'))?.net_income * 0.2 || 0)})
            </div>
          </div>
        </div>

        <div style={{marginTop: '16px', paddingTop: '16px', borderTop: '3px solid #059669', backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{fontSize: '18px', fontWeight: '700', color: '#065f46'}}>
              CONSOLIDATED NET INCOME (Attributable to Parent)
            </div>
            <div style={{fontSize: '24px', fontWeight: '800', color: '#059669'}}>
              {formatCurrency(consolidatedNetIncome)}
            </div>
          </div>
        </div>
      </div>

      {/* GAAP Note */}
      <div style={{marginTop: '20px', padding: '14px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
        <div style={{fontSize: '12px', color: '#1e40af', lineHeight: '1.6'}}>
          <strong>GAAP Note:</strong> Consolidated financial statements prepared in accordance with Generally Accepted Accounting Principles.
          Includes full consolidation of 100% owned subsidiaries and equity method for 80% owned DataSolutions LLC with minority interest deduction.
          Intercompany transactions eliminated in consolidation.
        </div>
      </div>
    </div>
  );
}

export default PLWaterfall;
