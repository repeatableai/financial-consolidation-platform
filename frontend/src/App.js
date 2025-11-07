import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import SetupWizard from './components/Setup/SetupWizard';
import ParentSelection from './components/ParentSelector/ParentSelection';
import Dashboard from './components/ParentDashboard/ParentDashboard';
import Companies from './components/Companies/Companies';
import Mappings from './components/Mappings/Mappings';
import MasterAccounts from './components/MasterAccounts/MasterAccounts';
import CompanyFinancials from './components/CompanyFinancials/CompanyFinancials';
import CompanyComparison from './components/CompanyComparison/CompanyComparison';
import Transactions from './components/Transactions/Transactions';
import ParentSettings from './components/ParentSettings/ParentSettings';
import Consolidation from './components/Consolidation/Consolidation';
import Reports from './components/Reports/Reports';
import Layout from './components/Layout/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ParentProvider } from './context/ParentContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <ParentProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/setup" element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
            <Route path="/select-company" element={<ProtectedRoute><ParentSelection /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="companies" element={<Companies />} />
            <Route path="company-financials" element={<CompanyFinancials />} />
            <Route path="company-comparison" element={<CompanyComparison />} />            <Route path="master-accounts" element={<MasterAccounts />} />
            <Route path="parent-settings" element={<ParentSettings />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="mappings" element={<Mappings />} />
            <Route path="consolidation" element={<Consolidation />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          </Routes>
        </Router>
      </ParentProvider>
    </AuthProvider>
  );
}

export default App;
