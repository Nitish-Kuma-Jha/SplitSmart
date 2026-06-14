import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({ totalExpenses: 0, outstanding: 0, groups: 0, anomalies: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const gr = await API.get('/groups');
        setGroups(gr.data.groups || []);
        setStats(s => ({ ...s, groups: gr.data.groups?.length || 0 }));

        // Load expenses from all groups
        let totalExp = 0, totalAnomalies = 0;
        const allExpenses = [];
        for (const g of (gr.data.groups || []).slice(0, 3)) {
          try {
            const ex = await API.get(`/expenses?groupId=${g._id}`);
            const exps = ex.data.expenses || [];
            totalExp += exps.reduce((s, e) => s + (e.currency === 'USD' ? e.amount * 84 : e.amount), 0);
            allExpenses.push(...exps.slice(0, 3));
          } catch {}
        }
        setStats(s => ({ ...s, totalExpenses: Math.round(totalExp), anomalies: totalAnomalies }));
        setRecent(allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-secondary)' }}>
      <span className="loading-spinner" /> Loading dashboard…
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Here's your expense overview</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/import" className="btn btn-outline btn-sm">📥 Import CSV</Link>
            <Link to="/groups" className="btn btn-primary btn-sm">+ New Group</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Groups', value: stats.groups, icon: '👥', sub: 'Active groups', color: 'var(--accent)' },
          { label: 'Total Expenses', value: `₹${stats.totalExpenses.toLocaleString('en-IN')}`, icon: '💸', sub: 'Across all groups', color: 'var(--inr)' },
          { label: 'Pending Import', value: '—', icon: '📥', sub: 'Click to import CSV', color: 'var(--warning)' },
          { label: 'AI Insights', value: '✨', icon: '🤖', sub: 'Ask anything', color: 'var(--accent-light)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{s.label}</div>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
            </div>
            <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        {/* Groups */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Your Groups</h3>
            <Link to="/groups" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {groups.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-icon">👥</div>
              <div className="empty-title">No groups yet</div>
              <Link to="/groups" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Create Group</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {groups.map(g => (
                <Link key={g._id} to={`/groups/${g._id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 'var(--radius)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  textDecoration: 'none', transition: 'border-color 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `hsl(${g.name.charCodeAt(0) * 37}deg 60% 40%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 15, color: 'white', flexShrink: 0
                  }}>{g.name[0].toUpperCase()}</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.members?.length} members · {g.currency}</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>›</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Recent Expenses</h3>
            <Link to="/expenses" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-icon">💸</div>
              <div className="empty-title">No expenses yet</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Import CSV or add expenses manually</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recent.map(e => (
                <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · paid by {e.paidBy?.memberName}
                    </div>
                  </div>
                  <span className={`amount-${e.currency === 'USD' ? 'usd' : 'inr'}`} style={{ fontSize: 14 }}>
                    {e.currency === 'USD' ? '$' : '₹'}{e.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { to: '/import', icon: '📥', label: 'Import CSV', desc: 'Upload expenses_export.csv' },
            { to: '/groups', icon: '👥', label: 'Manage Groups', desc: 'Members & memberships' },
            { to: '/balances', icon: '⚖️', label: 'View Balances', desc: 'Simplified debt overview' },
            { to: '/ai', icon: '🤖', label: 'AI Assistant', desc: 'Ask about your expenses' },
            { to: '/reports', icon: '📊', label: 'Reports', desc: 'Monthly & category breakdown' },
          ].map(a => (
            <Link key={a.to} to={a.to} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', textDecoration: 'none',
              flex: '1 1 180px', minWidth: 160,
              transition: 'all 0.15s'
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
            >
              <div style={{ fontSize: 24 }}>{a.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
