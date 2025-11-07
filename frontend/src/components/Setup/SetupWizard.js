import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function SetupWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Parent Company Data
  const [parentData, setParentData] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    incorporation_country: 'USA',
    fiscal_year_end_month: 12,
    reporting_currency: 'USD',
    accounting_standard: 'GAAP'
  });

  // Member Company Data
  const [memberData, setMemberData] = useState({
    name: '',
    legal_name: '',
    entity_type: 'subsidiary',
    industry: '',
    currency: 'USD',
    ownership_percentage: 100,
    company_type: 'member',
    consolidation_method: 'full'
  });

  const [createdParentId, setCreatedParentId] = useState(null);

  const handleParentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/v1/parent-companies/', parentData);
      setCreatedParentId(response.data.id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create parent company');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get organization ID
      const orgResponse = await axios.get('/api/v1/organizations/current');
      const organizationId = orgResponse.data.id;

      // Create company with parent_company_id
      const companyPayload = {
        ...memberData,
        parent_company_id: createdParentId
      };

      await axios.post(`/api/v1/companies/?organization_id=${organizationId}`, companyPayload);
      
      // Setup complete! Navigate to parent selection or dashboard
      navigate('/select-company');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create member company');
    } finally {
      setLoading(false);
    }
  };

  const skipMemberCreation = () => {
    navigate('/select-company');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{textAlign: 'center', marginBottom: '10px', color: '#4f46e5'}}>
          Welcome to Constellation Consolidator! 🎉
        </h1>
        
        <p style={{textAlign: 'center', color: '#666', marginBottom: '30px'}}>
          Let's set up your first consolidation structure
        </p>

        {/* Progress indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '40px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '50px',
            right: '50px',
            height: '2px',
            backgroundColor: step === 2 ? '#4f46e5' : '#e5e7eb',
            zIndex: 0
          }} />
          
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1}}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#4f46e5',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>1</div>
            <span style={{fontSize: '14px', color: '#666'}}>Parent Company</span>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1}}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: step === 2 ? '#4f46e5' : '#e5e7eb',
              color: step === 2 ? 'white' : '#999',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>2</div>
            <span style={{fontSize: '14px', color: '#666'}}>Member Company</span>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>{error}</div>
        )}

        {step === 1 && (
          <form onSubmit={handleParentSubmit}>
            <h2 style={{marginBottom: '20px', fontSize: '20px'}}>Create Parent Company</h2>
            
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                Company Name *
              </label>
              <input
                type="text"
                value={parentData.name}
                onChange={(e) => setParentData({...parentData, name: e.target.value})}
                required
                placeholder="e.g., TechCorp Holdings"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                Legal Name
              </label>
              <input
                type="text"
                value={parentData.legal_name}
                onChange={(e) => setParentData({...parentData, legal_name: e.target.value})}
                placeholder="e.g., TechCorp Holdings, Inc."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                  Reporting Currency
                </label>
                <select
                  value={parentData.reporting_currency}
                  onChange={(e) => setParentData({...parentData, reporting_currency: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                  Accounting Standard
                </label>
                <select
                  value={parentData.accounting_standard}
                  onChange={(e) => setParentData({...parentData, accounting_standard: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="GAAP">US GAAP</option>
                  <option value="IFRS">IFRS</option>
                </select>
              </div>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                Fiscal Year End Month
              </label>
              <select
                value={parentData.fiscal_year_end_month}
                onChange={(e) => setParentData({...parentData, fiscal_year_end_month: parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '10px'
              }}
            >
              {loading ? 'Creating...' : 'Continue →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleMemberSubmit}>
            <h2 style={{marginBottom: '20px', fontSize: '20px'}}>Create First Member Company (Optional)</h2>
            
            <p style={{fontSize: '14px', color: '#666', marginBottom: '20px'}}>
              Add your first subsidiary or member company. You can add more companies later.
            </p>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                Company Name *
              </label>
              <input
                type="text"
                value={memberData.name}
                onChange={(e) => setMemberData({...memberData, name: e.target.value})}
                required
                placeholder="e.g., TechCorp USA"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                Legal Name
              </label>
              <input
                type="text"
                value={memberData.legal_name}
                onChange={(e) => setMemberData({...memberData, legal_name: e.target.value})}
                placeholder="e.g., TechCorp USA, LLC"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                  Industry
                </label>
                <input
                  type="text"
                  value={memberData.industry}
                  onChange={(e) => setMemberData({...memberData, industry: e.target.value})}
                  placeholder="e.g., Technology"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                  Currency
                </label>
                <select
                  value={memberData.currency}
                  onChange={(e) => setMemberData({...memberData, currency: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px'}}>
                Ownership Percentage
              </label>
              <input
                type="number"
                value={memberData.ownership_percentage}
                onChange={(e) => setMemberData({...memberData, ownership_percentage: parseFloat(e.target.value)})}
                min="0"
                max="100"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{display: 'flex', gap: '12px', marginTop: '24px'}}>
              <button
                type="button"
                onClick={skipMemberCreation}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'white',
                  color: '#4f46e5',
                  border: '2px solid #4f46e5',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Skip for Now
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Creating...' : 'Create & Finish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SetupWizard;
