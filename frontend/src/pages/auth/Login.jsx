import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) { setError('Invalid email format'); return; }
    if (!form.password) { setError('Password is required'); return; }

    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      if (err.response?.data?.needsVerification) {
        navigate(`/verify?email=${encodeURIComponent(form.email)}`);
        toast('OTP sent to your email', { icon: '📧' });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      {/* Brand panel */}
      <div style={{ background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', borderRight: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white' }}>₹</div>
          <span style={{ fontSize: 22, fontWeight: 800 }}>Split<span style={{ color: 'var(--accent-light)' }}>Smart</span></span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2, marginBottom: 20 }}>
          Track every expense.<br />
          <span style={{ color: 'var(--accent-light)' }}>Settle instantly.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, maxWidth: 380 }}>
          Import messy CSVs, detect anomalies, handle multi-currency, and get simplified debt settlements — all in one place.
        </p>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['No more spreadsheet arguments', 'Anomaly detection built-in', 'Membership-aware splits'].map(f => (
            <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
              <span style={{ color: 'var(--success)' }}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', background: 'var(--bg-primary)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Sign in</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 14 }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--accent-light)' }}>Create one</Link>
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="current-password" />
            </div>
            <div style={{ textAlign: 'right', marginTop: -12, marginBottom: 20 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Forgot password?</Link>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><span className="loading-spinner" /> Signing in…</> : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
