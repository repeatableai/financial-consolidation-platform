import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParent } from '../../context/ParentContext';

function Companies() {
  const { selectedParent } = useParent();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [organizationId, setOrganizationId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    entity_type: '',
    industry: '',
    currency: 'USD'
  });

  useEffect(() => {
    if (selectedParent) {
      fetchParentMembers();
    }
  }, [selectedParent]);

  const fetchParentMembers = async () => {
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

  const fetchCompanyDetails = async (companyId) => {
    try {
      const response = await axios.get(`/api/v1/companies/${companyId}/details`);
      setCompanyDetails(response.data);
      setSelectedCompanyId(companyId);
    } catch (error) {
      setError('Failed to load company details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const orgResponse = await axios.get('/api/v1/organizations/current');
      await axios.post(`/api/v1/companies/?organization_id=${orgResponse.data.id}`, {
        ...formData,
        parent_company_id: selectedParent?.id
      });
      setShowAddForm(false);
      setFormData({ name: '', legal_name: '', entity_type: '', industry: '', currency: 'USD' });
      fetchParentMembers();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create company');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div>
        <h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>Member Companies</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!selectedParent) {
    return (
      <div>
        <h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>Member Companies</h1>
        <div style={{padding: '40px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center'}}>
          <p style={{color: '#6b7280', marginBottom: '20px'}}>No parent company selected. Please select a parent company from the sidebar.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <div>
          <h1 style={{fontSize: '32px', fontWeight: '600', marginBottom: '4px'}}>Member Companies</h1>
          <p style={{fontSize: '14px', color: '#6b7280'}}>Companies under {selectedParent.name}</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setSelectedCompanyId(null); }}
          style={{padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer'}}
        >
          {showAddForm ? 'Cancel' : '+ Add Company'}
        </button>
      </div>

      {error && <div style={{padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '20px'}}>{error}</div>}

      {showAddForm && (
        <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
          <h2 style={{marginBottom: '20px', fontSize: '20px', fontWeight: '600'}}>Add New Company</h2>
          <form onSubmit={handleSubmit}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Company Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Legal Name</label>
                <input type="text" value={formData.legal_name} onChange={(e) => setFormData({...formData, legal_name: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Entity Type</label>
                <select value={formData.entity_type} onChange={(e) => setFormData({...formData, entity_type: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'}}>
                  <option value="">Select...</option>
                  <option value="Corporation">Corporation</option>
                  <option value="LLC">LLC</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Subsidiary">Subsidiary</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Industry</label>
                <input type="text" value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} placeholder="e.g., Technology" style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Currency</label>
                <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'}}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
            <button type="submit" style={{marginTop: '20px', padding: '10px 30px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer'}}>Add Company</button>
          </form>
        </div>
      )}

      {selectedCompanyId && companyDetails ? (
        <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #4f46e5'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
            <h2 style={{fontSize: '24px', fontWeight: '600'}}>{companyDetails.name}</h2>
            <button onClick={() => setSelectedCompanyId(null)} style={{padding: '8px 16px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>✕ Close</button>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb'}}>
            <InfoRow label="Legal Name" value={companyDetails.legal_name || 'N/A'} />
            <InfoRow label="Entity Type" value={companyDetails.entity_type || 'N/A'} />
            <InfoRow label="Tax ID" value={companyDetails.tax_id || 'N/A'} />
            <InfoRow label="Industry" value={companyDetails.industry || 'N/A'} />
            <InfoRow label="Currency" value={companyDetails.currency} />
            <InfoRow label="Status" value={companyDetails.is_active ? 'Active' : 'Inactive'} />
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px'}}>
            <StatBox label="Accounts" value={companyDetails.account_count} color="#4f46e5" />
            <StatBox label="Mapped" value={companyDetails.mapped_account_count} color="#059669" />
            <StatBox label="Transactions" value={companyDetails.transaction_count} color="#d97706" />
          </div>

          {companyDetails.recent_transactions?.length > 0 && (
            <>
              <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '15px'}}>Recent Transactions (Last 10)</h3>
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                      <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Date</th>
                      <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Account</th>
                      <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Description</th>
                      <th style={{padding: '10px', textAlign: 'right', fontWeight: '600'}}>Debit</th>
                      <th style={{padding: '10px', textAlign: 'right', fontWeight: '600'}}>Credit</th>
                      <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyDetails.recent_transactions.map((txn) => (
                      <tr key={txn.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td style={{padding: '10px'}}>{new Date(txn.date).toLocaleDateString()}</td>
                        <td style={{padding: '10px'}}>{txn.account_name}</td>
                        <td style={{padding: '10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{txn.description}</td>
                        <td style={{padding: '10px', textAlign: 'right', color: '#059669', fontWeight: txn.debit > 0 ? '600' : 'normal'}}>{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                        <td style={{padding: '10px', textAlign: 'right', color: '#dc2626', fontWeight: txn.credit > 0 ? '600' : 'normal'}}>{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                        <td style={{padding: '10px', color: '#6b7280'}}>{txn.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {companies.length === 0 ? (
            <div style={{backgroundColor: 'white', padding: '50px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center'}}>
              <p style={{color: '#666', marginBottom: '20px'}}>No companies yet. Add your first company.</p>
            </div>
          ) : (
            <div style={{display: 'grid', gap: '15px'}}>
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => fetchCompanyDetails(company.id)}
                  style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                    <div>
                      <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '8px'}}>{company.name}</h3>
                      {company.legal_name && <p style={{fontSize: '14px', color: '#666', marginBottom: '8px'}}>Legal: {company.legal_name}</p>}
                      <div style={{display: 'flex', gap: '15px', fontSize: '14px', color: '#666'}}>
                        {company.industry && <span>🏢 {company.industry}</span>}
                        <span>💰 {company.currency}</span>
                        {company.entity_type && <span>📋 {company.entity_type}</span>}
                      </div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '8px'}}>
                      <span style={{padding: '4px 12px', backgroundColor: company.is_active ? '#d1fae5' : '#fee', color: company.is_active ? '#065f46' : '#991b1b', borderRadius: '12px', fontSize: '12px', fontWeight: '500'}}>
                        {company.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span style={{fontSize: '12px', color: '#4f46e5', fontWeight: '600'}}>Click for details →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{fontSize: '12px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600'}}>{label}</div>
      <div style={{fontSize: '15px', fontWeight: '500'}}>{value}</div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '6px', border: `2px solid ${color}20`, borderLeft: `4px solid ${color}`}}>
      <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600'}}>{label}</div>
      <div style={{fontSize: '28px', fontWeight: '600', color}}>{value}</div>
    </div>
  );
}

export default Companies;
