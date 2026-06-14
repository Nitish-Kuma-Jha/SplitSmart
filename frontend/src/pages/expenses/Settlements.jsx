import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function SettlementModal({ groups, onClose, onSaved }) {
  const [form, setForm] = useState({ groupId: '', paidBy: '', receivedBy: '', amount: '', currency: 'INR', date: new Date().toISOString().split('T')[0], notes: '' });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.groupId) {
      API.get(`/groups/${form.groupId}`).then(r => setMembers(r.data.group?.members || []));
    }
  }, [form.groupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.groupId || !form.paidBy || !form.receivedBy || !form.amount) { toast.error('All fields required'); return; }
    if (form.paidBy === form.receivedBy) { toast.error('Payer and receiver must be different'); return; }
    setLoading(true);
    try {
      const r = await API.post('/settlements', { ...form, paidBy: { memberName: form.paidBy }, receivedBy: { memberName: form.receivedBy } });
      toast.success('Settlement recorded!');
      onSaved(r.data.settlement);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Record Settlement</div>
        <div className="modal-subtitle">Record a direct payment between members</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Group *</label>
            <select className="form-select" value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}>
              <option value="">Select group</option>
              {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Paid By (Payer) *</label>
              <select className="form-select" value={form.paidBy} onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}>
                <option value="">Who paid?</option>
                {members.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Received By *</label>
              <select className="form-select" value={form.receivedBy} onChange={e => setForm(f => ({ ...f, receivedBy: e.target.value }))}>
                <option value="">Who received?</option>
                {members.filter(m => m.name !== form.paidBy).map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          {form.paidBy && form.receivedBy && form.amount && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              <strong>{form.paidBy}</strong> paid <strong>{form.currency === 'USD' ? '$' : '₹'}{form.amount}</strong> to <strong>{form.receivedBy}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={loading}>{loading ? 'Saving…' : '✓ Record Settlement'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Settlements() {
  const [settlements, setSettlements] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    Promise.all([API.get('/settlements'), API.get('/groups')]).then(([s, g]) => {
      setSettlements(s.data.settlements || []);
      setGroups(g.data.groups || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this settlement?')) return;
    try {
      await API.delete(`/settlements/${id}`);
      setSettlements(s => s.filter(x => x._id !== id));
      toast.success('Settlement deleted');
    } catch { toast.error('Failed'); }
  };

  const filtered = settlements.filter(s =>
    !filter || s.paidBy?.memberName?.toLowerCase().includes(filter.toLowerCase()) || s.receivedBy?.memberName?.toLowerCase().includes(filter.toLowerCase())
  );

  const total = filtered.reduce((s, st) => s + st.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Settlements</h1>
            <p className="page-subtitle">Direct payments between members</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Record Settlement</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input className="form-input" placeholder="🔍 Search by name…" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 280 }} />
        <div className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: '10px 20px', flex: 1 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} settlements</span>
          <span className="amount-inr">₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="loading-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤝</div>
          <div className="empty-title">No settlements yet</div>
          <p style={{ fontSize: 14, marginBottom: 16 }}>Record when someone pays back a debt</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Record Settlement</button>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Payer</th><th>→</th><th>Receiver</th><th>Amount</th><th>Date</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: `hsl(${(s.paidBy?.memberName || 'X').charCodeAt(0) * 53}deg 60% 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>{(s.paidBy?.memberName || 'X')[0].toUpperCase()}</div>
                        <span style={{ fontWeight: 600 }}>{s.paidBy?.memberName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', textAlign: 'center' }}>→</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: `hsl(${(s.receivedBy?.memberName || 'X').charCodeAt(0) * 53}deg 60% 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>{(s.receivedBy?.memberName || 'X')[0].toUpperCase()}</div>
                        <span style={{ fontWeight: 600 }}>{s.receivedBy?.memberName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={s.currency === 'USD' ? 'amount-usd' : 'amount-inr'}>
                        {s.currency === 'USD' ? '$' : '₹'}{s.amount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.notes || '—'}</td>
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(s._id)}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <SettlementModal groups={groups} onClose={() => setShowModal(false)} onSaved={s => { setSettlements(ss => [s, ...ss]); setShowModal(false); }} />}
    </div>
  );
}
