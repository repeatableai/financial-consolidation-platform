import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/select-company');
    } else {
      setError(result.error);
    }
  };

  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5'}}>
      <div style={{maxWidth: '400px', width: '100%', padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
        <h1 style={{textAlign: 'center', marginBottom: '30px', color: '#4f46e5'}}>Constellation Consolidator</h1>
        <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Login</h2>

        {error && <div style={{padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '20px'}}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'}}
            />
          </div>

          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'}}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{width: '100%', padding: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1}}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{textAlign: 'center', marginTop: '20px', color: '#666'}}>
          Don't have an account? <Link to="/register" style={{color: '#4f46e5', textDecoration: 'none'}}>Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
