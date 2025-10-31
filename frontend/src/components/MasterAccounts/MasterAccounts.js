import { useState, useEffect } from 'react';
import axios from 'axios';

function MasterAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizationId, setOrganizationId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    account_number: '',
    account_name: '',
    account_type: 'asset',
    category: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, filterType, searchTerm]);

  const fetchData = async () => {
    try {
      const orgResponse = await axios.get('/api/v1/organizations/current');
      setOrganizationId(orgResponse.data.id);

      const accountsResponse = await axios.get(`/api/v1/accounts/master?organization_id=${orgResponse.data.id}`);
      setAccounts(accountsResponse.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to load master accounts');
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = accounts;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(acc => acc.account_type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(acc =>
        acc.account_number.toLowerCase().includes(search) ||
        acc.account_name.toLowerCase().includes(search)
      );
    }

    setFilteredAccounts(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(`/api/v1/accounts/master?organization_id=${organizationId}`, formData);
      setShowAddForm(false);
      setFormData({ account_number: '', account_name: '', account_type: 'asset', category: '' });
      setSuccess('✓ Master account created successfully!');
      fetchData();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create account');
    }
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

  const getAccountTypeStats = () => {
    return {
      asset: accounts.filter(a => a.account_type === 'asset').length,
      liability: accounts.filter(a => a.account_type === 'liability').length,
      equity: accounts.filter(a => a.account_type === 'equity').length,
      revenue: accounts.filter(a => a.account_type === 'revenue').length,
      expense: accounts.filter(a => a.account_type === 'expense').length
    };
  };

  if (loading) {
    return (
      <div>
        <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '20px'}}>Master Accounts</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const stats = getAccountTypeStats();

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <div>
          <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '5px'}}>📘 Master Chart of Accounts</h1>
          <p style={{color: '#666'}}>Standardized accounts for consolidation</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{padding: '12px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
        >
          {showAddForm ? 'Cancel' : '+ Add Account'}
        </button>
      </div>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px'}}>{error}</div>}
      {success && <div style={{padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '20px'}}>{success}</div>}

      {/* Statistics */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '20px'}}>
        <StatCard label="Total Accounts" value={accounts.length} color="#4f46e5" />
        <StatCard label="Assets" value={stats.asset} color="#4f46e5" />
        <StatCard label="Liabilities" value={stats.liability} color="#dc2626" />
        <StatCard label="Equity" value={stats.equity} color="#059669" />
        <StatCard label="Revenue" value={stats.revenue} color="#d97706" />
        <StatCard label="Expenses" value={stats.expense} color="#dc2626" />
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
          <h2 style={{marginBottom: '20px', fontSize: '20px', fontWeight: '600'}}>Add New Master Account</h2>
          <form onSubmit={handleSubmit}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Account Number *</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  required
                  placeholder="e.g., 1000"
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Account Name *</label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  required
                  placeholder="e.g., Cash and Cash Equivalents"
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Account Type *</label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({...formData, account_type: e.target.value})}
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                >
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="e.g., Current Assets"
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{padding: '12px 30px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
            >
              Create Account
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <div style={{display: 'flex', gap: '15px', alignItems: 'end'}}>
          <div style={{flex: 1}}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account number or name..."
              style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Filter by Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: '180px'}}
            >
              <option value="all">All Types ({accounts.length})</option>
              <option value="asset">Assets ({stats.asset})</option>
              <option value="liability">Liabilities ({stats.liability})</option>
              <option value="equity">Equity ({stats.equity})</option>
              <option value="revenue">Revenue ({stats.revenue})</option>
              <option value="expense">Expenses ({stats.expense})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      {filteredAccounts.length > 0 ? (
        <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{fontSize: '18px', fontWeight: '600', marginBottom: '15px'}}>
            Accounts ({filteredAccounts.length})
          </h2>

          <div style={{display: 'grid', gap: '10px'}}>
            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                style={{
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '6px',
                  borderLeft: `4px solid ${getAccountTypeColor(account.account_type)}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{flex: 1}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px'}}>
                    <span style={{fontSize: '15px', fontWeight: '700', color: '#1f2937'}}>
                      {account.account_number}
                    </span>
                    <span style={{fontSize: '16px', fontWeight: '600'}}>
                      {account.account_name}
                    </span>
                  </div>
                  <div style={{fontSize: '13px', color: '#6b7280'}}>
                    {account.category || 'No category'}
                  </div>
                </div>

                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <span
                    style={{
                      padding: '4px 12px',
                      backgroundColor: getAccountTypeColor(account.account_type) + '20',
                      color: getAccountTypeColor(account.account_type),
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      border: `1px solid ${getAccountTypeColor(account.account_type)}40`
                    }}
                  >
                    {account.account_type}
                  </span>

                  {account.is_active ? (
                    <span style={{padding: '4px 12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '12px', fontSize: '12px', fontWeight: '600'}}>
                      ACTIVE
                    </span>
                  ) : (
                    <span style={{padding: '4px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontSize: '12px', fontWeight: '600'}}>
                      INACTIVE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{backgroundColor: 'white', padding: '60px 30px', borderRadius: '8px', textAlign: 'center'}}>
          <div style={{fontSize: '64px', marginBottom: '20px'}}>🔍</div>
          <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>No Accounts Found</h3>
          <p style={{fontSize: '15px', color: '#6b7280'}}>
            {searchTerm || filterType !== 'all' ? 'Try adjusting your filters' : 'Add your first master account to get started'}
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `3px solid ${color}`}}>
      <div style={{fontSize: '12px', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600'}}>{label}</div>
      <div style={{fontSize: '28px', fontWeight: '700', color}}>{value}</div>
    </div>
  );
}

export default MasterAccounts;
