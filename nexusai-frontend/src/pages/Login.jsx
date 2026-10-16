import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import AuthShell from '../components/AuthShell';

export default function Login() {
  const { login, loginWithGoogle, firebaseEnabled } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Try again.');
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google sign-in failed.');
    }
    setGoogleLoading(false);
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <div className="auth-logo">NexusAI</div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-sub">Sign in to your account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus />
          </div>
          <div className="auth-field">
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--text2)' }}>Forgot password?</Link>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            type="submit" disabled={loading}>
            {loading ? <div className="spinner" /> : 'Sign in'}
          </button>
        </form>

        {firebaseEnabled && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '1.1rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <button type="button" className="btn btn-ghost" onClick={handleGoogle} disabled={googleLoading}
              style={{ width: '100%', justifyContent: 'center' }}>
              {googleLoading ? <div className="spinner" /> : 'Continue with Google'}
            </button>
          </>
        )}

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </AuthShell>
  );
}
