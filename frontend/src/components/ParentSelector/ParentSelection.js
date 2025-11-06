import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useParent } from '../../context/ParentContext';

function ParentSelection() {
  const [parentCompanies, setParentCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { selectParent } = useParent();
  const navigate = useNavigate();

  useEffect(() => {
    fetchParentCompanies();
  }, []);

  const fetchParentCompanies = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('/api/v1/parent-companies/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setParentCompanies(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load parent companies:', error);
      setError('Failed to load parent companies');
      setLoading(false);
    }
  };

  const handleSelectParent = (parent) => {
    selectParent(parent);
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5'}}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', padding: '20px'}}>
      <div style={{maxWidth: '800px', width: '100%', padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)'}}>
        <h1 style={{textAlign: 'center', marginBottom: '10px', color: '#4f46e5', fontSize: '32px', fontWeight: '700'}}>
          Welcome to Constellation
        </h1>
        <h2 style={{textAlign: 'center', marginBottom: '40px', color: '#6b7280', fontSize: '20px', fontWeight: '400'}}>
          What company do you want to work on today?
        </h2>

        {error && (
          <div style={{padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px', textAlign: 'center'}}>
            {error}
          </div>
        )}

        {parentCompanies.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px'}}>
            <p style={{color: '#6b7280', marginBottom: '20px'}}>No parent companies found. Please contact your administrator.</p>
            <button
              onClick={() => navigate('/parent-settings')}
              style={{padding: '12px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'}}
            >
              Create Parent Company
            </button>
          </div>
        ) : (
          <div style={{display: 'grid', gap: '16px'}}>
            {parentCompanies.map((parent) => (
              <button
                key={parent.id}
                onClick={() => handleSelectParent(parent)}
                style={{
                  padding: '24px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4f46e5';
                  e.currentTarget.style.backgroundColor = '#f5f3ff';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{flex: 1}}>
                  <div style={{fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px'}}>
                    {parent.name}
                  </div>
                  <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '8px'}}>
                    {parent.legal_name || 'No legal name specified'}
                  </div>
                  <div style={{display: 'flex', gap: '16px', fontSize: '13px', color: '#9ca3af'}}>
                    <span>📊 {parent.member_count} member {parent.member_count === 1 ? 'company' : 'companies'}</span>
                    <span>💰 {parent.reporting_currency}</span>
                    <span>📋 {parent.accounting_standard}</span>
                  </div>
                </div>
                <div style={{fontSize: '24px', color: '#4f46e5'}}>
                  →
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{marginTop: '30px', textAlign: 'center', fontSize: '14px', color: '#9ca3af'}}>
          Need to add or manage parent companies? Visit <span style={{color: '#4f46e5', fontWeight: '600'}}>Parent Settings</span> after selecting a company.
        </div>
      </div>
    </div>
  );
}

export default ParentSelection;
