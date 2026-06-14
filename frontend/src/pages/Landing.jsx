import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: 'white' }}>₹</div>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Split<span style={{ color: 'var(--accent-light)' }}>Smart</span></span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn btn-outline btn-sm">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '100px 48px 80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 100, padding: '4px 14px', marginBottom: 24, fontSize: 13, color: 'var(--accent-light)' }}>
          <span className="pulse-dot" />
          Shared Expense Management, Reimagined
        </div>
        <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-2px' }}>
          Split bills.<br />
          <span style={{ color: 'var(--accent-light)' }}>Track every rupee.</span><br />
          Settle simply.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 40px' }}>
          SplitSmart handles messy CSV imports, currency conversions, membership changes, and anomaly detection — so you never argue about money again.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-primary btn-lg">Start for Free →</Link>
          <Link to="/login" className="btn btn-outline btn-lg">Sign In</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Features</div>
          <h2 style={{ fontSize: 32, fontWeight: 700 }}>Everything your flatmates need</h2>
        </div>
        <div className="grid-3" style={{ gap: 20 }}>
          {[
            { icon: '📥', title: 'Smart CSV Import', desc: 'Upload messy spreadsheets. Our anomaly engine detects 12+ data issues and asks you before changing anything.' },
            { icon: '⚖️', title: 'Debt Simplification', desc: "Instead of A→B and A→C, get one clean: A pays ₹2,000 to B. Aisha gets her single number." },
            { icon: '🔍', title: 'Full Traceability', desc: "Click any balance and see exactly which expenses compose it. Rohan gets his breakdown." },
            { icon: '💱', title: 'Multi-Currency', desc: 'USD and INR supported. 1 USD = ₹84. No more treating dollars as rupees like your spreadsheet did.' },
            { icon: '🗓️', title: 'Membership Tracking', desc: "Members join and leave. Sam won't pay for March electricity. Meera is excluded after March 31." },
            { icon: '✅', title: 'Approval Workflow', desc: 'Nothing gets deleted silently. Every anomaly waits for your approval before any action is taken.' },
          ].map(f => (
            <div key={f.title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 32 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '60px 48px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div className="section-title" style={{ marginBottom: 8 }}>How It Works</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 40 }}>Three steps to clean finances</h2>
          <div className="grid-3" style={{ gap: 20, textAlign: 'left' }}>
            {[
              { n: '01', title: 'Upload CSV', desc: 'Upload your messy expenses_export.csv as-is. No manual editing required.' },
              { n: '02', title: 'Review Anomalies', desc: 'Our engine flags duplicates, settlements, currency issues, and membership violations.' },
              { n: '03', title: 'Get Clean Balances', desc: 'Approve actions, import data, and get simplified debt settlements instantly.' },
            ].map(s => (
              <div key={s.n} className="card">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-light)', marginBottom: 8 }}>{s.n}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <div>© 2026 SplitSmart · Built for the Spreetail Assignment</div>
        <div>Track · Split · Settle</div>
      </footer>
    </div>
  );
}
