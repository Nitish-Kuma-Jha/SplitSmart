import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function AddMemberModal({ groupId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', joinDate: new Date().toISOString().split('T')[0], isExternal: true });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setLoading(true);
    try {
      const r = await API.post(`/groups/${groupId}/members`, form);
      toast.success('Member added!');
      onAdded(r.data.group);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add Member</div>
        <div className="modal-subtitle">Set their join date for accurate expense splitting</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="e.g. Sam" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="optional" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Join Date *</label>
            <input className="form-input" type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
            <div className="form-hint">Only expenses after this date affect this member's balance</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding…' : 'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SetLeaveModal({ groupId, member, onClose, onUpdated }) {
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await API.put(`/groups/${groupId}/members/${member._id}/leave`, { leaveDate });
      toast.success('Leave date set!');
      onUpdated(r.data.group);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Set Leave Date — {member.name}</div>
        <div className="modal-subtitle">Expenses after this date won't affect their balance</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Leave Date</label>
            <input className="form-input" type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>{loading ? 'Saving…' : 'Set Leave Date'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({ balances: [], simplifiedDebts: [] });
  const [tab, setTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [leaveModal, setLeaveModal] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [gr, ex, bal] = await Promise.all([
          API.get(`/groups/${id}`),
          API.get(`/expenses?groupId=${id}`),
          API.get(`/groups/${id}/balances`)
        ]);
        setGroup(gr.data.group);
        setExpenses(ex.data.expenses || []);
        setBalances(bal.data);
      } catch { toast.error('Failed to load group'); }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><span className="loading-spinner" /></div>;
  if (!group) return <div className="empty-state"><div className="empty-icon">❌</div><div className="empty-title">Group not found</div></div>;

  const activeMembers = group.members?.filter(m => !m.leaveDate) || [];
  const formerMembers = group.members?.filter(m => m.leaveDate) || [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link to="/groups" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>← Groups</Link>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: `hsl(${group.name.charCodeAt(0) * 37}deg 65% 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: 'white' }}>{group.name[0].toUpperCase()}</div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{group.name}</h1>
              <p className="page-subtitle">{group.description || 'No description'} · {group.currency}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to={`/import`} className="btn btn-outline btn-sm">📥 Import CSV</Link>
            <Link to={`/expenses?group=${id}`} className="btn btn-primary btn-sm">+ Add Expense</Link>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Members</div><div className="stat-value">{group.members?.length}</div><div className="stat-sub">{activeMembers.length} active</div></div>
        <div className="stat-card"><div className="stat-label">Expenses</div><div className="stat-value">{expenses.length}</div><div className="stat-sub">Total transactions</div></div>
        <div className="stat-card"><div className="stat-label">Total Spent</div><div className="stat-value amount-inr" style={{ fontSize: 20 }}>₹{expenses.reduce((s, e) => s + (e.currency === 'USD' ? e.amount * 84 : e.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div><div className="stat-sub">All time</div></div>
        <div className="stat-card"><div className="stat-label">Settlements</div><div className="stat-value">{balances.simplifiedDebts?.length}</div><div className="stat-sub">Needed to settle</div></div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['members', 'expenses', 'balances', 'settlements'].map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'members' ? `👥 Members (${group.members?.length})` :
             t === 'expenses' ? `💸 Expenses (${expenses.length})` :
             t === 'balances' ? '⚖️ Balances' : '🤝 Simplified Debts'}
          </div>
        ))}
      </div>

      {/* Members Tab */}
      {tab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title">Active Members ({activeMembers.length})</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>+ Add Member</button>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {activeMembers.map(m => (
                    <tr key={m._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: `hsl(${(m.name || 'X').charCodeAt(0) * 53}deg 60% 40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{(m.name || 'X')[0].toUpperCase()}</div>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                          {m.role === 'admin' && <span className="badge badge-accent">Admin</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{m.email || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(m.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td><span className="badge badge-success">Active</span></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => setLeaveModal(m)} style={{ color: 'var(--error)' }}>Set Leave Date</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {formerMembers.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 24 }}>Former Members ({formerMembers.length})</div>
              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Name</th><th>Joined</th><th>Left</th><th>Status</th></tr></thead>
                    <tbody>
                      {formerMembers.map(m => (
                        <tr key={m._id}>
                          <td style={{ fontWeight: 600 }}>{m.name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(m.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--error)' }}>{new Date(m.leaveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                          <td><span className="badge badge-neutral">Left</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title">{expenses.length} expenses</div>
            <Link to={`/expenses?group=${id}`} className="btn btn-primary btn-sm">+ Add Expense</Link>
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <div className="empty-title">No expenses yet</div>
              <Link to="/import" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Import from CSV</Link>
            </div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Description</th><th>Date</th><th>Paid By</th><th>Amount</th><th>Split</th><th>Flags</th></tr></thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{e.title}</div>
                          {e.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.notes.slice(0, 50)}</div>}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td>{e.paidBy?.memberName}</td>
                        <td>
                          <span className={e.currency === 'USD' ? 'amount-usd' : 'amount-inr'}>
                            {e.currency === 'USD' ? '$' : '₹'}{e.amount.toLocaleString('en-IN')}
                          </span>
                          {e.currency === 'USD' && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>≈₹{(e.amount * 84).toLocaleString('en-IN')}</div>}
                        </td>
                        <td><span className="tag">{e.splitType}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {e.isRefund && <span className="badge badge-info">refund</span>}
                            {e.anomalyFlags?.map(f => <span key={f} className="badge badge-warning" style={{ fontSize: 9 }}>{f.toLowerCase().replace('_', ' ')}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Balances Tab */}
      {tab === 'balances' && (
        <div>
          <div className="section-title" style={{ marginBottom: 16 }}>Individual Balances</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
            {balances.balances?.map(b => {
              const net = Math.round(b.balance * 100) / 100;
              const isOwed = net > 0;
              const isOwes = net < 0;
              return (
                <div key={b.name} className="card" style={{ borderColor: isOwed ? 'rgba(34,197,94,0.3)' : isOwes ? 'rgba(239,68,68,0.3)' : 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `hsl(${(b.name || 'X').charCodeAt(0) * 53}deg 60% 40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'white' }}>{(b.name || 'X')[0].toUpperCase()}</div>
                    <div style={{ fontWeight: 700 }}>{b.name}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Net Balance</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: isOwed ? 'var(--success)' : isOwes ? 'var(--error)' : 'var(--text-secondary)' }}>
                      {isOwed ? '+' : ''}{net < 0 ? '-' : ''}₹{Math.abs(net).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isOwed ? '← is owed' : isOwes ? '→ owes' : '✓ settled'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Paid</div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>₹{Math.round(b.paid).toLocaleString('en-IN')}</div></div>
                    <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Owed</div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--error)' }}>₹{Math.round(b.owed).toLocaleString('en-IN')}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Simplified Debts Tab */}
      {tab === 'settlements' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Simplified Debts — Who pays whom</div>
            <div className="alert alert-info">These are the minimum transactions needed to settle all balances in this group.</div>
          </div>
          {balances.simplifiedDebts?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <div className="empty-title">All settled!</div>
              <p style={{ fontSize: 14 }}>No outstanding debts in this group</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {balances.simplifiedDebts?.map((d, i) => (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, borderLeft: '3px solid var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `hsl(${(d.from || 'X').charCodeAt(0) * 53}deg 60% 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white' }}>{(d.from || 'X')[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{d.from}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>pays</div>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 20, margin: '0 8px' }}>→</div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `hsl(${(d.to || 'X').charCodeAt(0) * 53}deg 60% 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white' }}>{(d.to || 'X')[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{d.to}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>receives</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>₹{d.amount.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddMember && <AddMemberModal groupId={id} onClose={() => setShowAddMember(false)} onAdded={g => { setGroup(g); setShowAddMember(false); }} />}
      {leaveModal && <SetLeaveModal groupId={id} member={leaveModal} onClose={() => setLeaveModal(null)} onUpdated={g => { setGroup(g); setLeaveModal(null); }} />}
    </div>
  );
}
