import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function passwordError(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter.';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number.';
  return null;
}

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params]  = useSearchParams();
  const token     = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    const pwErr = passwordError(password);
    if (pwErr) { setError(pwErr); return; }

    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success('Password reset — please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password. The link may have expired.');
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">NexusAI</div>
          <div className="auth-error">This reset link is missing its token. Request a new one.</div>
          <div className="auth-footer">
            <Link to="/forgot-password">Request a new reset link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">NexusAI</div>
        <h2 className="auth-title">Set a new password</h2>
        <p className="auth-sub">Choose a strong new password for your account.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="label">New password</label>
            <input className="input" type="password" placeholder="8+ chars, upper, lower, number"
              value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
          </div>
          <div className="auth-field">
            <label className="label">Confirm password</label>
            <input className="input" type="password" placeholder="••••••••"
              value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            type="submit" disabled={loading}>
            {loading ? <div className="spinner" /> : 'Reset password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
