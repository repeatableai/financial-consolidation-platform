import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Companies from './components/Companies/Companies';
import Mappings from './components/Mappings/Mappings';
import MasterAccounts from './components/MasterAccounts/MasterAccounts';
import Transactions from './components/Transactions/Transactions';
import Consolidation from './components/Consolidation/Consolidation';
import Reports from './components/Reports/Reports';
import Layout from './components/Layout/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="companies" element={<Companies />} />
            <Route path="master-accounts" element={<MasterAccounts />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="mappings" element={<Mappings />} />
            <Route path="consolidation" element={<Consolidation />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
