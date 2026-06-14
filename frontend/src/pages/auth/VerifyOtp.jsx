import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function VerifyOtp() {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const inputs = useRef([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(d => d) && next.join('').length === 6) {
      handleVerify(next.join(''));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      handleVerify(text);
    }
  };

  const handleVerify = async (code) => {
    setLoading(true);
    setError('');
    try {
      await verifyOtp(email, code);
      toast.success('Email verified! Welcome to SplitSmart 🎉');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const data = await resendOtp(email);
      toast.success('New OTP sent!');
      if (data.devOtp) toast(`Dev OTP: ${data.devOtp}`, { icon: '🔑', duration: 10000 });
      setCountdown(60);
      setError('');
    } catch {
      toast.error('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>✉️</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Verify your email</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Enter the 6-digit code sent to<br />
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
          </p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }} onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 52, height: 60,
                  textAlign: 'center',
                  fontSize: 24, fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-secondary)',
                  border: `2px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  caretColor: 'var(--accent)'
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => handleVerify(otp.join(''))}
            disabled={loading || otp.join('').length < 6}
          >
            {loading ? <><span className="loading-spinner" /> Verifying…</> : 'Verify OTP →'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            {countdown > 0 ? (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Resend in {countdown}s</span>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={handleResend} disabled={resending}>
                {resending ? 'Sending…' : '↩ Resend OTP'}
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
