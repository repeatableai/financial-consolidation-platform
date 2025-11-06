import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

function AccountActivity({ companyId, fiscalYear, fiscalPeriod }) {
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [error, setError] = useState('');

  const loadAccountActivity = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(
        `/api/v1/companies/${companyId}/account-activity?fiscal_year=${fiscalYear}&fiscal_period=${fiscalPeriod}`
      );
      setAccountData(response.data);
    } catch (error) {
      setError('Failed to load account activity');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (accountId) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const getImpactColor = (impact) => {
    return impact === 'positive' ? '#059669' : '#dc2626';
  };

  const getTypeColor = (type) => {
    const colors = {
      'asset': '#4f46e5',
      'liability': '#dc2626',
      'equity': '#059669',
      'revenue': '#d97706',
      'expense': '#dc2626'
    };
    return colors[type] || '#6b7280';
  };

  if (!accountData) {
    return (
      <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center'}}>
        <button
          onClick={loadAccountActivity}
          disabled={loading}
          style={{
            padding: '14px 28px',
            backgroundColor: loading ? '#9ca3af' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Loading...' : '📋 Show Detailed Account Activity'}
        </button>
      </div>
    );
  }

  return (
    <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2 style={{fontSize: '24px', fontWeight: '600'}}>📋 Account Activity Detail</h2>
        <button
          onClick={() => setAccountData(null)}
          style={{padding: '8px 16px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer'}}
        >
          ✕ Close
        </button>
      </div>

      <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
        {accountData.company_name} • {fiscalYear}-{String(fiscalPeriod).padStart(2, '0')} • Click any account to see transactions
      </p>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px'}}>{error}</div>}

      <div style={{display: 'grid', gap: '8px'}}>
        {accountData.accounts.map((account) => (
          <div key={account.account_id}>
            {/* Account Summary Row */}
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
                    <span style={{fontSize: '16px'}}>{expandedAccounts[account.account_id] ? '▼' : '▶'}</span>
                    <span style={{fontSize: '14px', fontWeight: '700'}}>{account.account_number}</span>
                    <span style={{fontSize: '15px', fontWeight: '600'}}>{account.account_name}</span>
                    {!account.is_mapped && (
                      <span style={{padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '10px', fontSize: '11px', fontWeight: '600'}}>
                        UNMAPPED
                      </span>
                    )}
                  </div>
                  <div style={{fontSize: '12px', color: '#6b7280', marginLeft: '28px'}}>
                    Mapped to: {account.master_account} • {account.transaction_count} transaction{account.transaction_count !== 1 ? 's' : ''}
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
            {expandedAccounts[account.account_id] && account.transactions && (
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
                              {txn.impact === 'positive' ? '↗ +' : '↘ −'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{backgroundColor: '#f9fafb', borderTop: '2px solid #000'}}>
                        <td colSpan="3" style={{padding: '10px', fontWeight: '700'}}>TOTALS</td>
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

                {/* Account Analysis */}
                <div style={{marginTop: '15px', padding: '12px', backgroundColor: account.net_change >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '6px'}}>
                  <div style={{fontSize: '13px', fontWeight: '600', color: account.net_change >= 0 ? '#065f46' : '#991b1b'}}>
                    Account Analysis:
                  </div>
                  <div style={{fontSize: '13px', color: '#374151', marginTop: '4px'}}>
                    This {account.account_type} account had a net {account.net_change >= 0 ? 'increase' : 'decrease'} of{' '}
                    <strong>{formatCurrency(Math.abs(account.net_change))}</strong> during this period.{' '}
                    Total activity: {formatCurrency(account.total_debits + account.total_credits)} across {account.transaction_count} transactions.
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{marginTop: '20px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
        <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#1e40af'}}>Activity Summary</div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px'}}>
          <div><span style={{color: '#6b7280'}}>Active Accounts:</span> <strong>{accountData.accounts.length}</strong></div>
          <div><span style={{color: '#6b7280'}}>Mapped:</span> <strong style={{color: '#059669'}}>{accountData.accounts.filter(a => a.is_mapped).length}</strong></div>
          <div><span style={{color: '#6b7280'}}>Unmapped:</span> <strong style={{color: '#dc2626'}}>{accountData.accounts.filter(a => !a.is_mapped).length}</strong></div>
          <div><span style={{color: '#6b7280'}}>Total Transactions:</span> <strong>{accountData.accounts.reduce((sum, a) => sum + a.transaction_count, 0)}</strong></div>
        </div>
      </div>
    </div>
  );
}

export default AccountActivity;
