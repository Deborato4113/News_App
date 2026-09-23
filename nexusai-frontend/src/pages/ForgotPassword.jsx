import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true); // backend always responds the same way, whether or not the email exists
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">NexusAI</div>
        <h2 className="auth-title">Reset your password</h2>
        <p className="auth-sub">We'll email you a link to set a new one.</p>

        {error && <div className="auth-error">{error}</div>}

        {sent ? (
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
            If that email is registered, a reset link is on its way. Check your inbox (and spam folder).
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              type="submit" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Send reset link'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
