import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8', '#a78bfa', '#34d399', '#fb923c'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--accent-light)', fontWeight: 600 }}>₹{Number(p.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
      ))}
    </div>
  );
};

export default function Reports() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    API.get('/groups').then(r => {
      const gs = r.data.groups || [];
      setGroups(gs);
      if (gs.length) setSelectedGroup(gs[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    setLoading(true);
    API.get(`/reports/group/${selectedGroup}`).then(r => setReport(r.data))
      .finally(() => setLoading(false));
  }, [selectedGroup]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">Expense analytics and insights</p>
          </div>
          <select className="form-select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={{ width: 220 }}>
            {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="loading-spinner" /></div>
      ) : !report ? (
        <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">Select a group</div></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value amount-inr" style={{ fontSize: 22 }}>₹{report.summary.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div className="stat-sub">{report.summary.expenseCount} transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Settlements</div>
              <div className="stat-value" style={{ fontSize: 22, color: 'var(--success)' }}>₹{report.summary.totalSettlements.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div className="stat-sub">{report.summary.settlementCount} payments</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg per Expense</div>
              <div className="stat-value" style={{ fontSize: 22, color: 'var(--info)' }}>
                ₹{report.summary.expenseCount > 0 ? Math.round(report.summary.totalExpenses / report.summary.expenseCount).toLocaleString('en-IN') : 0}
              </div>
              <div className="stat-sub">Average transaction</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Categories</div>
              <div className="stat-value" style={{ fontSize: 22, color: 'var(--warning)' }}>{report.categories.length}</div>
              <div className="stat-sub">Expense types</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {['overview', 'monthly', 'categories'].map(t => (
              <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'overview' ? '📈 Overview' : t === 'monthly' ? '📅 Monthly' : '🏷 Categories'}
              </div>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid-2" style={{ gap: 20 }}>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 16 }}>Monthly Spending Trend</div>
                {report.monthly.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 0' }}><div className="empty-icon">📈</div><div className="empty-title">No data yet</div></div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={report.monthly.map(m => ({ name: m.month.slice(5), total: Math.round(m.total) }))}>
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={60} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 16 }}>Spending by Category</div>
                {report.categories.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 0' }}><div className="empty-icon">🏷</div><div className="empty-title">No data yet</div></div>
                ) : (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={report.categories} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                          {report.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {report.categories.slice(0, 6).map((c, i) => (
                        <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category}</span>
                          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>₹{Math.round(c.total).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'monthly' && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 20 }}>Monthly Breakdown</div>
              {report.monthly.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">No monthly data</div></div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={report.monthly.map(m => ({ name: m.month, total: Math.round(m.total), count: m.count }))}>
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={70} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="table-wrap" style={{ marginTop: 20 }}>
                    <table className="table">
                      <thead><tr><th>Month</th><th>Total</th><th>Transactions</th><th>Avg per Transaction</th></tr></thead>
                      <tbody>
                        {report.monthly.map(m => (
                          <tr key={m.month}>
                            <td style={{ fontWeight: 600 }}>{m.month}</td>
                            <td className="amount-inr">₹{Math.round(m.total).toLocaleString('en-IN')}</td>
                            <td>{m.count}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>₹{m.count ? Math.round(m.total / m.count).toLocaleString('en-IN') : 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'categories' && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 20 }}>Category Breakdown</div>
              {report.categories.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🏷</div><div className="empty-title">No categories found</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {report.categories.sort((a, b) => b.total - a.total).map((c, i) => {
                    const max = report.categories[0].total;
                    const pct = Math.round((c.total / max) * 100);
                    return (
                      <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 120, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{c.category}</div>
                        <div style={{ flex: 1, height: 28, background: 'var(--bg-secondary)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 6, transition: 'width 0.5s', opacity: 0.85 }} />
                        </div>
                        <div style={{ width: 110, textAlign: 'right', flexShrink: 0 }}>
                          <span className="amount-inr" style={{ fontSize: 13 }}>₹{Math.round(c.total).toLocaleString('en-IN')}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({c.count})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
