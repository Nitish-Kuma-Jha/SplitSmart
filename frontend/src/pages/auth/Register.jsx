import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) e.password = 'Must include uppercase, lowercase, and a number';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await register(form.name, form.email, form.password);
      toast.success('Account created! Check your email for OTP.');
      if (data.devOtp) toast(`Dev OTP: ${data.devOtp}`, { icon: '🔑', duration: 10000 });
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const strength = () => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strengthColor = ['var(--border)', 'var(--error)', 'var(--warning)', 'var(--info)', 'var(--success)'];
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const s = strength();

  return (
    <div className="auth-wrap">
      <div style={{ background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', borderRight: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white' }}>₹</div>
          <span style={{ fontSize: 22, fontWeight: 800 }}>Split<span style={{ color: 'var(--accent-light)' }}>Smart</span></span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 20 }}>Join your flatmates.<br /><span style={{ color: 'var(--accent-light)' }}>Stop arguing about money.</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>Create a free account and start managing shared expenses intelligently.</p>
        <div style={{ marginTop: 40, padding: '20px', background: 'rgba(99,102,241,0.08)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>✉️ OTP verification required</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>We'll send a 6-digit code to verify your email address before you can log in.</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', background: 'var(--bg-primary)', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Create account</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 14 }}>
            Already have one? <Link to="/login" style={{ color: 'var(--accent-light)' }}>Sign in</Link>
          </p>

          {errors.general && <div className="alert alert-error">{errors.general}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Aisha Kumar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="aisha@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 8 chars, uppercase + number" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              {form.password && (
                <div style={{ display: 'flex', gap: 4, marginTop: 8, alignItems: 'center' }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= s ? strengthColor[s] : 'var(--border)', transition: 'background 0.2s' }} />
                  ))}
                  <span style={{ fontSize: 11, color: strengthColor[s], marginLeft: 6 }}>{strengthLabel[s]}</span>
                </div>
              )}
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
              {errors.confirm && <div className="form-error">{errors.confirm}</div>}
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><span className="loading-spinner" /> Creating…</> : 'Create Account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
