import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    companies: 0,
    masterAccounts: 0,
    mappings: 0,
    consolidationRuns: 0
  });
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get organization
      const orgResponse = await axios.get('/api/v1/organizations/current');
      const orgId = orgResponse.data.id;
      setOrganizationId(orgId);

      // Fetch all stats in parallel
      const [companiesRes, accountsRes, mappingsRes, consolidationRes] = await Promise.all([
        axios.get(`/api/v1/companies/?organization_id=${orgId}`).catch(() => ({ data: [] })),
        axios.get(`/api/v1/accounts/master?organization_id=${orgId}`).catch(() => ({ data: [] })),
        axios.get(`/api/v1/mappings/`).catch(() => ({ data: [] })),
        axios.get(`/api/v1/consolidation/runs?organization_id=${orgId}`).catch(() => ({ data: [] }))
      ]);

      setStats({
        companies: companiesRes.data.length,
        masterAccounts: accountsRes.data.length,
        mappings: mappingsRes.data.length,
        consolidationRuns: consolidationRes.data.length
      });
      setLoading(false);
    } catch (error) {
      // If no organization exists, create one automatically
      if (error.response?.status === 404) {
        try {
          await axios.post('/api/v1/organizations/', {
            name: `${user?.full_name}'s Organization`,
            description: 'Default organization',
            fiscal_year_end_month: 12,
            default_currency: 'USD'
          });
          fetchDashboardData(); // Retry after creating organization
        } catch (createError) {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div>
        <h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>Dashboard</h1>
        <div style={{display: 'flex', justifyContent: 'center', padding: '50px'}}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{marginBottom: '20px', fontSize: '32px', fontWeight: '600'}}>Dashboard</h1>
      <p style={{color: '#666', marginBottom: '30px'}}>Welcome back, {user?.full_name}!</p>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px'}}>
        <StatCard title="Total Companies" value={stats.companies} color="#4f46e5" />
        <StatCard title="Master Accounts" value={stats.masterAccounts} color="#059669" />
        <StatCard title="Account Mappings" value={stats.mappings} color="#d97706" />
        <StatCard title="Consolidation Runs" value={stats.consolidationRuns} color="#dc2626" />
      </div>

      <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'}}>
        <h2 style={{marginBottom: '15px', fontSize: '20px', fontWeight: '600'}}>Quick Actions</h2>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
          <ActionButton href="/companies" title="Add Company" description="Create new entity" color="#4f46e5" />
          <ActionButton href="/mappings" title="Map Accounts" description="Use AI mapping" color="#059669" />
          <ActionButton href="/consolidation" title="Run Consolidation" description="Generate reports" color="#d97706" />
          <ActionButton href="/reports" title="View Reports" description="See financials" color="#dc2626" />
        </div>
      </div>

      <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
        <h2 style={{marginBottom: '15px', fontSize: '20px', fontWeight: '600'}}>Getting Started</h2>
        <ul style={{listStyle: 'none', padding: 0}}>
          <StepItem completed={stats.companies > 0} text="Add companies to your organization" />
          <StepItem completed={stats.masterAccounts > 0} text="Create a master chart of accounts" />
          <StepItem completed={stats.mappings > 0} text="Map company accounts to master accounts" />
          <StepItem completed={false} text="Import transactions" />
          <StepItem completed={stats.consolidationRuns > 0} text="Run consolidation and generate reports" />
        </ul>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${color}`}}>
      <div style={{fontSize: '14px', color: '#666', marginBottom: '8px'}}>{title}</div>
      <div style={{fontSize: '32px', fontWeight: '600', color: color}}>{value}</div>
    </div>
  );
}

function ActionButton({ href, title, description, color }) {
  return (
    <a href={href} style={{textDecoration: 'none', display: 'block', padding: '20px', border: `2px solid ${color}`, borderRadius: '8px', transition: 'all 0.2s'}}
       onMouseEnter={(e) => e.currentTarget.style.backgroundColor = color}
       onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
      <div style={{fontSize: '16px', fontWeight: '600', color: color, marginBottom: '5px'}}>{title}</div>
      <div style={{fontSize: '14px', color: '#666'}}>{description}</div>
    </a>
  );
}

function StepItem({ completed, text }) {
  return (
    <li style={{padding: '12px 0', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '10px'}}>
      <span style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: completed ? '#059669' : '#e5e7eb',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {completed && '✓'}
      </span>
      <span style={{color: completed ? '#059669' : '#666'}}>{text}</span>
    </li>
  );
}

export default Dashboard;
