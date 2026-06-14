import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Balances() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [balances, setBalances] = useState(null);
  const [breakdown, setBreakdown] = useState({});
  const [expandedMember, setExpandedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    API.get('/groups').then(r => {
      const gs = r.data.groups || [];
      setGroups(gs);
      if (gs.length > 0) setSelectedGroup(gs[0]._id);
    }).finally(() => setGroupsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    setLoading(true);
    API.get(`/groups/${selectedGroup}/balances`).then(r => {
      setBalances(r.data);
      setBreakdown(r.data.expenseBreakdown || {});
    }).catch(() => toast.error('Failed to load balances'))
    .finally(() => setLoading(false));
  }, [selectedGroup]);

  if (groupsLoading) return <div style={{ textAlign: 'center', padding: 80 }}><span className="loading-spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Balances</h1>
            <p className="page-subtitle">Who owes whom, simplified — click a member for full breakdown</p>
          </div>
          <select className="form-select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={{ width: 220 }}>
            <option value="">Select group</option>
            {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedGroup ? (
        <div className="empty-state"><div className="empty-icon">⚖️</div><div className="empty-title">Select a group to view balances</div></div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="loading-spinner" /></div>
      ) : balances ? (
        <div>
          {/* Simplified debts — hero section */}
          <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(99,102,241,0.3)', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 24 }}>⚡</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Simplified Settlements</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Minimum transactions to settle all debts</div>
              </div>
            </div>
            {balances.simplifiedDebts?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--success)' }}>✅ All balances are settled!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {balances.simplifiedDebts?.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `hsl(${(d.from||'X').charCodeAt(0)*53}deg 60% 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 14 }}>{(d.from||'X')[0].toUpperCase()}</div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{d.from}</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 2, flex: 1, background: 'var(--border)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 700, color: 'var(--accent-light)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          ₹{d.amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{d.to}</div>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `hsl(${(d.to||'X').charCodeAt(0)*53}deg 60% 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 14 }}>{(d.to||'X')[0].toUpperCase()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Individual balances */}
          <div className="section-title">Individual Balances — Click to see breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
            {balances.balances?.map(b => {
              const net = Math.round(b.balance * 100) / 100;
              const isOwed = net > 0;
              const isOwes = net < 0;
              const memberKey = b.name.toLowerCase().trim();
              const memberBreakdown = breakdown[memberKey] || [];
              const isExpanded = expandedMember === b.name;

              return (
                <div key={b.name} style={{ cursor: 'pointer' }}>
                  <div className="card"
                    style={{ borderColor: isExpanded ? 'var(--accent)' : isOwed ? 'rgba(34,197,94,0.25)' : isOwes ? 'rgba(239,68,68,0.25)' : 'var(--border)', transition: 'all 0.2s' }}
                    onClick={() => setExpandedMember(isExpanded ? null : b.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: `hsl(${(b.name||'X').charCodeAt(0)*53}deg 60% 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'white' }}>{(b.name||'X')[0].toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: isOwed ? 'var(--success)' : isOwes ? 'var(--error)' : 'var(--text-muted)' }}>
                          {isOwed ? '← Gets back' : isOwes ? '→ Owes' : '✓ Settled'}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: isOwed ? 'var(--success)' : isOwes ? 'var(--error)' : 'var(--text-secondary)', marginBottom: 12 }}>
                      {isOwed ? '+' : isOwes ? '-' : ''}₹{Math.abs(net).toLocaleString('en-IN')}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Paid </span><span style={{ color: 'var(--success)', fontWeight: 600 }}>₹{Math.round(b.paid).toLocaleString('en-IN')}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Share </span><span style={{ color: 'var(--error)', fontWeight: 600 }}>₹{Math.round(b.owed).toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>

                  {/* Expense breakdown drawer */}
                  {isExpanded && memberBreakdown.length > 0 && (
                    <div className="card" style={{ marginTop: 4, borderColor: 'var(--accent)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', borderTop: 'none', background: 'var(--bg-hover)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
                        {b.name}'s expense breakdown ({memberBreakdown.length} items)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                        {memberBreakdown.map((exp, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{exp.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                            </div>
                            <span className="amount-inr" style={{ fontSize: 13 }}>₹{exp.amount.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 700, fontSize: 14 }}>
                        <span>Total Share</span>
                        <span className="amount-inr">₹{memberBreakdown.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
