import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Mirrors the backend's zod rule (schemas/authSchemas.js) so the user sees
// a matching error here instead of submitting and getting rejected by the
// server with a rule they weren't told about.
function passwordError(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter.';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number.';
  return null;
}

export default function Signup() {
  const { signup, loginWithGoogle, firebaseEnabled } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    const pwErr = passwordError(form.password);
    if (pwErr) { setError(pwErr); return; }
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      toast.success('Account created! Welcome 🎉');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Sign up failed. Try again.');
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Account ready! Welcome 🎉');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google sign-in failed.');
    }
    setGoogleLoading(false);
  }

  const f = (k) => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">NexusAI</div>
        <h2 className="auth-title">Create account</h2>
        <p className="auth-sub">Start reading smarter today</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="label">Full name</label>
            <input className="input" placeholder="Full name"
              value={form.name} onChange={f('name')} required autoFocus />
          </div>
          <div className="auth-field">
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@email.com"
              value={form.email} onChange={f('email')} required />
          </div>
          <div className="auth-field">
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="8+ chars, upper, lower, number"
              value={form.password} onChange={f('password')} required />
          </div>
          <div className="auth-field">
            <label className="label">Confirm password</label>
            <input className="input" type="password" placeholder="••••••••"
              value={form.confirm} onChange={f('confirm')} required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            type="submit" disabled={loading}>
            {loading ? <div className="spinner" /> : 'Create account'}
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
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
