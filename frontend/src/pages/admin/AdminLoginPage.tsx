import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../lib/adminApi';
import { useAdminStore } from '../../lib/adminStore';
import './admin.css';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const setAdminAuth = useAdminStore((s) => s.setAdminAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(username, password);
      setAdminAuth(data.access_token, data.admin);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      if (msg === 'Admin privileges required') {
        setError('This account does not have admin privileges.');
      } else if (msg === 'Incorrect username or password') {
        setError('Invalid username or password.');
      } else {
        setError(msg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-root">
      {/* Background decoration */}
      <div className="admin-login-bg">
        <div className="admin-login-orb admin-login-orb-1" />
        <div className="admin-login-orb admin-login-orb-2" />
        <div className="admin-login-grid" />
      </div>

      <div className="admin-login-card">
        {/* Logo / branding */}
        <div className="admin-login-brand">
          <div className="admin-login-shield">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 className="admin-login-title">TradeLens Admin</h1>
            <p className="admin-login-subtitle">Secure administrative access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form" id="admin-login-form">
          {error && (
            <div className="admin-login-error" role="alert" id="admin-login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="admin-login-field">
            <label htmlFor="admin-username" className="admin-login-label">Username</label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="admin-login-input"
              placeholder="Enter admin username"
            />
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-password" className="admin-login-label">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-login-input"
              placeholder="••••••••"
            />
          </div>

          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading}
            className="admin-login-btn"
          >
            {loading ? (
              <>
                <span className="admin-login-spinner" />
                Authenticating…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Sign In to Admin Panel
              </>
            )}
          </button>
        </form>

        <p className="admin-login-footer">
          Not an admin?{' '}
          <a href="/login" className="admin-login-link">Go to user login</a>
        </p>
      </div>
    </div>
  );
}
