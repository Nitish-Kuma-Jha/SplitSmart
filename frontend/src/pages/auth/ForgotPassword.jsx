import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await API.post('/auth/forgot-password', { email });
      toast.success('OTP sent!');
      if (r.data.devOtp) toast(`Dev OTP: ${r.data.devOtp}`, { icon: '🔑', duration: 10000 });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await API.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{step === 1 ? 'Forgot Password' : 'Reset Password'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {step === 1 ? 'Enter your email to receive a reset OTP' : `Enter the OTP sent to ${email}`}
          </p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          {step === 1 ? (
            <form onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? <><span className="loading-spinner" /> Sending…</> : 'Send Reset OTP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              <div className="form-group">
                <label className="form-label">OTP Code</label>
                <input className="form-input" type="text" placeholder="6-digit code" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} style={{ fontFamily: 'var(--font-mono)', letterSpacing: 6, fontSize: 18, textAlign: 'center' }} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min 8 chars" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? <><span className="loading-spinner" /> Resetting…</> : 'Reset Password →'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
