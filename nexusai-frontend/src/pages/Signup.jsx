import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6)      { setError('Password must be at least 6 characters.'); return; }
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
            <input className="input" placeholder="Deborato Chaudhury"
              value={form.name} onChange={f('name')} required autoFocus />
          </div>
          <div className="auth-field">
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@email.com"
              value={form.email} onChange={f('email')} required />
          </div>
          <div className="auth-field">
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min 6 characters"
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

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
