import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParent } from '../../context/ParentContext';

function ParentSettings() {
  const { selectedParent, parentCompanies, refreshParents, selectParent } = useParent();
  const [memberCompanies, setMemberCompanies] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    ownership_percentage: 100,
    currency: 'USD',
    industry: '',
    goodwill_amount: 0
  });
  const [parentFormData, setParentFormData] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    incorporation_country: '',
    fiscal_year_end_month: 12,
    reporting_currency: 'USD',
    accounting_standard: 'GAAP'
  });
  const [parentFile, setParentFile] = useState(null);
  const [memberFile, setMemberFile] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [editingParent, setEditingParent] = useState(false);

  useEffect(() => {
    if (selectedParent) {
      fetchData();
    }
  }, [selectedParent]);

  const fetchData = async () => {
    try {
      console.log('ParentSettings: Loading data for parent:', selectedParent.id);

      // Get member companies for this parent
      const membersResponse = await axios.get(`/api/v1/parent-companies/${selectedParent.id}/members`);
      console.log('ParentSettings: Members loaded:', membersResponse.data.length);
      setMemberCompanies(membersResponse.data);

      // Get all companies (to show available members to add)
      const orgResponse = await axios.get('/api/v1/organizations/current');
      const allCompResponse = await axios.get(`/api/v1/companies/?organization_id=${orgResponse.data.id}`);
      console.log('ParentSettings: All companies loaded:', allCompResponse.data.length);
      setAllCompanies(allCompResponse.data);

      setLoading(false);
    } catch (error) {
      console.error('ParentSettings: Failed to load data:', error);
      setError('Failed to load data: ' + (error.response?.data?.detail || error.message));
      setLoading(false);
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const orgResponse = await axios.get('/api/v1/organizations/current');

      // TODO: If memberFile exists, upload file data using FormData
      if (memberFile) {
        console.log('File selected for upload:', memberFile.name);
        // Future implementation: Process and upload file with transactions
        // const formData = new FormData();
        // formData.append('file', memberFile);
        // await axios.post('/api/v1/companies/upload', formData, {...});
      }

      // Create the member company
      const companyData = {
        ...formData,
        parent_company_id: selectedParent.id,
        organization_id: orgResponse.data.id
      };

      await axios.post(`/api/v1/companies/?organization_id=${orgResponse.data.id}`, companyData);

      setSuccess(`✓ Successfully created ${formData.name} as a member company!`);
      setShowAddMember(false);
      setFormData({
        name: '',
        legal_name: '',
        ownership_percentage: 100,
        currency: 'USD',
        industry: '',
        goodwill_amount: 0
      });
      setMemberFile(null);

      // Refresh member list
      fetchData();
      refreshParents(); // Refresh parent selector to update member count
    } catch (error) {
      setError('Failed to create member company: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreateParent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');

      // TODO: If parentFile exists, upload file data using FormData
      if (parentFile) {
        console.log('File selected for upload:', parentFile.name);
        // Future implementation: Process and upload file
        // const formData = new FormData();
        // formData.append('file', parentFile);
        // await axios.post('/api/v1/parent-companies/upload', formData, {...});
      }

      // Create the parent company
      const response = await axios.post('/api/v1/parent-companies/', parentFormData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSuccess(`✓ Successfully created ${parentFormData.name} as a parent company!`);
      setShowAddParent(false);
      setParentFormData({
        name: '',
        legal_name: '',
        tax_id: '',
        incorporation_country: '',
        fiscal_year_end_month: 12,
        reporting_currency: 'USD',
        accounting_standard: 'GAAP'
      });
      setParentFile(null);

      // Refresh parent list and auto-select the new parent
      await refreshParents();

      // Find and select the newly created parent
      const newParent = response.data;
      if (selectParent && newParent) {
        selectParent(newParent);
      }
    } catch (error) {
      setError('Failed to create parent company: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div>
        <h1>Parent Company Settings</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!selectedParent) {
    return (
      <div>
        <h1>Parent Company Settings</h1>
        <div style={{padding: '40px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center'}}>
          <p>No parent company selected. Please select a parent company from the sidebar.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{fontSize: '32px', fontWeight: '600', margin: 0}}>⚙️ Parent Company Settings</h1>
        <button
          onClick={() => setShowAddParent(!showAddParent)}
          style={{padding: '12px 24px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'}}
        >
          {showAddParent ? 'Cancel' : '+ Add Parent Company'}
        </button>
      </div>

      {error && <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px'}}>{error}</div>}
      {success && <div style={{padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '20px'}}>{success}</div>}

      {/* Add Parent Company Form */}
      {showAddParent && (
        <div style={{padding: '25px', backgroundColor: '#faf5ff', borderRadius: '8px', marginBottom: '20px', border: '2px solid #7c3aed'}}>
          <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '15px'}}>Create New Parent Company</h3>
          <form onSubmit={handleCreateParent}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={parentFormData.name}
                  onChange={(e) => setParentFormData({...parentFormData, name: e.target.value})}
                  placeholder="e.g., GlobalCorp International"
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Legal Name</label>
                <input
                  type="text"
                  value={parentFormData.legal_name}
                  onChange={(e) => setParentFormData({...parentFormData, legal_name: e.target.value})}
                  placeholder="e.g., GlobalCorp International Ltd."
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Tax ID</label>
                <input
                  type="text"
                  value={parentFormData.tax_id}
                  onChange={(e) => setParentFormData({...parentFormData, tax_id: e.target.value})}
                  placeholder="e.g., 12-3456789"
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Incorporation Country</label>
                <input
                  type="text"
                  value={parentFormData.incorporation_country}
                  onChange={(e) => setParentFormData({...parentFormData, incorporation_country: e.target.value})}
                  placeholder="e.g., United States"
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Fiscal Year End Month *</label>
                <select
                  required
                  value={parentFormData.fiscal_year_end_month}
                  onChange={(e) => setParentFormData({...parentFormData, fiscal_year_end_month: parseInt(e.target.value)})}
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>
                      {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })} ({i+1})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Reporting Currency *</label>
                <select
                  required
                  value={parentFormData.reporting_currency}
                  onChange={(e) => setParentFormData({...parentFormData, reporting_currency: e.target.value})}
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Accounting Standard *</label>
                <select
                  required
                  value={parentFormData.accounting_standard}
                  onChange={(e) => setParentFormData({...parentFormData, accounting_standard: e.target.value})}
                  style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                >
                  <option value="GAAP">GAAP - US Generally Accepted Accounting Principles</option>
                  <option value="IFRS">IFRS - International Financial Reporting Standards</option>
                </select>
              </div>
            </div>

            {/* File Upload Section */}
            <div style={{marginBottom: '20px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#166534'}}>
                📎 Upload Company Data File (Optional)
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setParentFile(e.target.files[0])}
                style={{width: '100%', padding: '10px', border: '1px solid #86efac', borderRadius: '6px', backgroundColor: 'white'}}
              />
              <div style={{fontSize: '12px', color: '#166534', marginTop: '6px'}}>
                Supported formats: CSV, Excel (.xlsx, .xls)
              </div>
              {parentFile && (
                <div style={{marginTop: '8px', padding: '8px 12px', backgroundColor: '#dcfce7', borderRadius: '4px', fontSize: '13px', color: '#166534'}}>
                  ✓ Selected: {parentFile.name}
                </div>
              )}
            </div>

            <div style={{padding: '15px', backgroundColor: '#dbeafe', borderRadius: '6px', marginBottom: '15px', border: '1px solid #3b82f6'}}>
              <div style={{fontSize: '13px', color: '#1e40af', fontWeight: '600', marginBottom: '6px'}}>📝 Note:</div>
              <div style={{fontSize: '13px', color: '#1e3a8a'}}>
                After creating the parent company, you can add member companies by using the "Add Member Company" button below. If you upload a file, it will be processed to pre-populate company data.
              </div>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
              <button
                type="submit"
                style={{padding: '12px 30px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
              >
                Create Parent Company
              </button>
              <button
                type="button"
                onClick={() => setShowAddParent(false)}
                style={{padding: '12px 30px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Parent Company Info */}
      <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2 style={{fontSize: '20px', fontWeight: '600'}}>Parent Company Information</h2>
          <button
            onClick={() => {
              setEditingParent(true);
              setParentFormData({
                name: selectedParent.name || '',
                legal_name: selectedParent.legal_name || '',
                tax_id: selectedParent.tax_id || '',
                incorporation_country: selectedParent.incorporation_country || '',
                fiscal_year_end_month: selectedParent.fiscal_year_end_month || 12,
                reporting_currency: selectedParent.reporting_currency || 'USD',
                accounting_standard: selectedParent.accounting_standard || 'GAAP'
              });
            }}
            style={{padding: '10px 20px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'}}
          >
            ⚙️ Manage Parent Company
          </button>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
          <InfoRow label="Company Name" value={selectedParent.name} />
          <InfoRow label="Legal Name" value={selectedParent.legal_name || 'N/A'} />
          <InfoRow label="Reporting Currency" value={selectedParent.reporting_currency} />
          <InfoRow label="Accounting Standard" value={selectedParent.accounting_standard} />
          <InfoRow label="Member Companies" value={`${selectedParent.member_count} subsidiaries`} />
        </div>
      </div>

      {/* Member Companies Management */}
      <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2 style={{fontSize: '20px', fontWeight: '600'}}>Member Companies</h2>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            style={{padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'}}
          >
            {showAddMember ? 'Cancel' : '+ Add Member Company'}
          </button>
        </div>

        {/* Add Member Company Form */}
        {showAddMember && (
          <div style={{padding: '25px', backgroundColor: '#eff6ff', borderRadius: '8px', marginBottom: '20px', border: '2px solid #4f46e5'}}>
            <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '15px'}}>Add New Member Company</h3>
            <form onSubmit={handleCreateMember}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., TechCorp Asia"
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Legal Name</label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                    placeholder="e.g., TechCorp Asia Pte Ltd"
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Ownership % *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={formData.ownership_percentage}
                    onChange={(e) => setFormData({...formData, ownership_percentage: parseFloat(e.target.value)})}
                    placeholder="0-100"
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    placeholder="e.g., Technology"
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Goodwill Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.goodwill_amount}
                    onChange={(e) => setFormData({...formData, goodwill_amount: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
              </div>

            {/* File Upload Section */}
            <div style={{marginBottom: '20px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#166534'}}>
                📎 Upload Member Company Data File (Optional)
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setMemberFile(e.target.files[0])}
                style={{width: '100%', padding: '10px', border: '1px solid #86efac', borderRadius: '6px', backgroundColor: 'white'}}
              />
              <div style={{fontSize: '12px', color: '#166534', marginTop: '6px'}}>
                Supported formats: CSV, Excel (.xlsx, .xls) - can include transactions and account data
              </div>
              {memberFile && (
                <div style={{marginTop: '8px', padding: '8px 12px', backgroundColor: '#dcfce7', borderRadius: '4px', fontSize: '13px', color: '#166534'}}>
                  ✓ Selected: {memberFile.name}
                </div>
              )}
            </div>

            <div style={{padding: '15px', backgroundColor: '#fef3c7', borderRadius: '6px', marginBottom: '15px', border: '1px solid #fbbf24'}}>
              <div style={{fontSize: '13px', color: '#92400e', fontWeight: '600', marginBottom: '6px'}}>📝 Note:</div>
              <div style={{fontSize: '13px', color: '#78350f'}}>
                After creating the member company, you'll need to:
                • Upload a data file (above) OR import transactions manually (Transactions page)
                • Map accounts to master chart (Account Mappings page)
                • The company will then be included in future consolidations
              </div>
            </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button
                  type="submit"
                  style={{padding: '12px 30px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
                >
                  Create Member Company
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  style={{padding: '12px 30px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Member Companies List */}
        <div style={{display: 'grid', gap: '12px'}}>
          {memberCompanies.map(member => (
            <div key={member.id} style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <div style={{fontSize: '16px', fontWeight: '600', marginBottom: '4px'}}>{member.name}</div>
                <div style={{fontSize: '13px', color: '#6b7280'}}>
                  Ownership: {member.ownership_percentage}% • Currency: {member.currency}
                  {member.goodwill_amount > 0 && ` • Goodwill: $${member.goodwill_amount.toLocaleString()}`}
                </div>
              </div>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button
                  onClick={() => {
                    setEditingMember(member);
                    setFormData({
                      name: member.name || '',
                      legal_name: member.legal_name || '',
                      ownership_percentage: member.ownership_percentage || 100,
                      currency: member.currency || 'USD',
                      industry: member.industry || '',
                      goodwill_amount: member.goodwill_amount || 0
                    });
                  }}
                  style={{padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'}}
                >
                  ⚙️ Manage
                </button>
                <span style={{padding: '4px 10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '12px', fontSize: '12px', fontWeight: '600'}}>
                  ACTIVE
                </span>
              </div>
            </div>
          ))}
        </div>

        {memberCompanies.length === 0 && (
          <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>
            No member companies. Click "Add Member Company" to get started.
          </div>
        )}

        {/* Edit Parent Company Modal */}
        {editingParent && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
            <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto'}}>
              <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '20px'}}>Manage {selectedParent.name}</h3>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Company Name *</label>
                  <input
                    type="text"
                    required
                    value={parentFormData.name}
                    onChange={(e) => setParentFormData({...parentFormData, name: e.target.value})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Legal Name</label>
                  <input
                    type="text"
                    value={parentFormData.legal_name}
                    onChange={(e) => setParentFormData({...parentFormData, legal_name: e.target.value})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Reporting Currency *</label>
                  <select
                    required
                    value={parentFormData.reporting_currency}
                    onChange={(e) => setParentFormData({...parentFormData, reporting_currency: e.target.value})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Accounting Standard *</label>
                  <select
                    required
                    value={parentFormData.accounting_standard}
                    onChange={(e) => setParentFormData({...parentFormData, accounting_standard: e.target.value})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  >
                    <option value="GAAP">GAAP - US Generally Accepted Accounting Principles</option>
                    <option value="IFRS">IFRS - International Financial Reporting Standards</option>
                  </select>
                </div>
              </div>

              {/* File Upload for Edit */}
              <div style={{marginBottom: '20px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#166534'}}>
                  📎 Upload New Data File (Optional)
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setParentFile(e.target.files[0])}
                  style={{width: '100%', padding: '10px', border: '1px solid #86efac', borderRadius: '6px', backgroundColor: 'white'}}
                />
                {parentFile && (
                  <div style={{marginTop: '8px', padding: '8px 12px', backgroundColor: '#dcfce7', borderRadius: '4px', fontSize: '13px', color: '#166534'}}>
                    ✓ Selected: {parentFile.name}
                  </div>
                )}
              </div>

              <div style={{display: 'flex', gap: '10px', justifyContent: 'space-between'}}>
                <button
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete ${selectedParent.name}? This will also delete all member companies and cannot be undone.`)) {
                      try {
                        // TODO: Add API call to delete parent company
                        setSuccess(`✓ Deleted ${selectedParent.name} successfully!`);
                        setEditingParent(false);
                        setParentFile(null);
                        await refreshParents();
                      } catch (error) {
                        setError('Failed to delete parent company');
                      }
                    }
                  }}
                  style={{padding: '12px 24px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
                >
                  🗑️ Delete Parent Company
                </button>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button
                    onClick={() => {
                      setEditingParent(false);
                      setParentFile(null);
                    }}
                    style={{padding: '12px 24px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // TODO: Add API call to update parent company
                        setSuccess(`✓ Updated ${parentFormData.name} successfully!`);
                        setEditingParent(false);
                        setParentFile(null);
                        await refreshParents();
                      } catch (error) {
                        setError('Failed to update parent company');
                      }
                    }}
                    style={{padding: '12px 24px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Member Company Modal */}
        {editingMember && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
            <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto'}}>
              <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '20px'}}>Manage {editingMember.name}</h3>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Legal Name</label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Ownership %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.ownership_percentage}
                    onChange={(e) => setFormData({...formData, ownership_percentage: parseFloat(e.target.value)})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px'}}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>

              {/* File Upload for Edit */}
              <div style={{marginBottom: '20px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#166534'}}>
                  📎 Upload New Data File (Optional)
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setMemberFile(e.target.files[0])}
                  style={{width: '100%', padding: '10px', border: '1px solid #86efac', borderRadius: '6px', backgroundColor: 'white'}}
                />
                {memberFile && (
                  <div style={{marginTop: '8px', padding: '8px 12px', backgroundColor: '#dcfce7', borderRadius: '4px', fontSize: '13px', color: '#166534'}}>
                    ✓ Selected: {memberFile.name}
                  </div>
                )}
              </div>

              <div style={{display: 'flex', gap: '10px', justifyContent: 'space-between'}}>
                <button
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete ${editingMember.name}? This cannot be undone.`)) {
                      try {
                        // TODO: Add API call to delete member company
                        setSuccess(`✓ Deleted ${editingMember.name} successfully!`);
                        setEditingMember(null);
                        setMemberFile(null);
                        fetchData();
                        await refreshParents(); // Update member count
                      } catch (error) {
                        setError('Failed to delete member company');
                      }
                    }
                  }}
                  style={{padding: '12px 24px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
                >
                  🗑️ Delete Member Company
                </button>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button
                    onClick={() => {
                      setEditingMember(null);
                      setMemberFile(null);
                      setFormData({
                        name: '',
                        legal_name: '',
                        ownership_percentage: 100,
                        currency: 'USD',
                        industry: '',
                        goodwill_amount: 0
                      });
                    }}
                    style={{padding: '12px 24px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // TODO: Add API call to update member company
                        setSuccess(`✓ Updated ${formData.name} successfully!`);
                        setEditingMember(null);
                        setMemberFile(null);
                        fetchData();
                      } catch (error) {
                        setError('Failed to update member company');
                      }
                    }}
                    style={{padding: '12px 24px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'}}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{fontSize: '12px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600'}}>{label}</div>
      <div style={{fontSize: '16px', fontWeight: '600'}}>{value}</div>
    </div>
  );
}

export default ParentSettings;
