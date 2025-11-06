import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ParentSelector from './ParentSelector';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{display: 'flex', height: '100vh'}}>
      <nav style={{width: '250px', backgroundColor: '#1e293b', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column'}}>
        <h2 style={{marginBottom: '30px', color: '#4f46e5'}}>Constellation</h2>

        <div style={{flex: 1}}>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/companies">Member Companies</NavLink>
          <NavLink to="/company-financials">Company Financials</NavLink>          <NavLink to="/master-accounts">Master Accounts</NavLink>
          <NavLink to="/company-comparison">Company Comparison</NavLink>          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/mappings">Account Mappings</NavLink>
          <NavLink to="/consolidation">Consolidation</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/parent-settings">Parent Settings</NavLink>
        </div>

        <div style={{borderTop: '1px solid #334155', paddingTop: '20px'}}>
          <ParentSelector />
          <div style={{marginTop: '15px', marginBottom: '10px', fontSize: '14px', color: '#94a3b8'}}>{user?.full_name}</div>
          <button onClick={handleLogout} style={{width: '100%', padding: '8px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
            Logout
          </button>
        </div>
      </nav>

      <main style={{flex: 1, padding: '30px', backgroundColor: '#f5f5f5', overflowY: 'auto'}}>
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{display: 'block', padding: '12px 16px', marginBottom: '8px', borderRadius: '6px', textDecoration: 'none', color: 'white', backgroundColor: 'rgba(255,255,255,0.05)', transition: 'all 0.2s'}}
      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
    >
      {children}
    </Link>
  );
}

export default Layout;
