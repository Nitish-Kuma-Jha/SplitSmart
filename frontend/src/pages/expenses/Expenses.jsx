import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function ExpenseModal({ groupId, groups, onClose, onSaved, editExpense }) {
  const [form, setForm] = useState(editExpense ? {
    groupId: editExpense.group, title: editExpense.title, description: editExpense.description || '',
    amount: editExpense.amount, currency: editExpense.currency, date: new Date(editExpense.date).toISOString().split('T')[0],
    paidBy: editExpense.paidBy?.memberName, splitType: editExpense.splitType, category: editExpense.category || 'General', notes: editExpense.notes || ''
  } : {
    groupId: groupId || '', title: '', description: '', amount: '', currency: 'INR',
    date: new Date().toISOString().split('T')[0], paidBy: '', splitType: 'equal', category: 'General', notes: ''
  });
  const [splits, setSplits] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.groupId) {
      API.get(`/groups/${form.groupId}`).then(r => {
        const members = r.data.group?.members || [];
        setGroupMembers(members);
        setSplits(members.map(m => ({ memberName: m.name, amount: '', percentage: '', shares: '1', include: true })));
      });
    }
  }, [form.groupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.groupId || !form.title || !form.amount || !form.paidBy) {
      toast.error('Fill in all required fields'); return;
    }
    setLoading(true);
    try {
      const activeSplits = splits.filter(s => s.include).map(s => ({
        memberName: s.memberName, amount: parseFloat(s.amount) || 0,
        percentage: parseFloat(s.percentage) || 0, shares: parseInt(s.shares) || 1
      }));
      const payload = { ...form, splits: activeSplits, paidBy: { memberName: form.paidBy } };
      const r = editExpense
        ? await API.put(`/expenses/${editExpense._id}`, payload)
        : await API.post('/expenses', payload);
      toast.success(editExpense ? 'Expense updated!' : 'Expense added!');
      onSaved(r.data.expense);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const totalSplit = splits.filter(s => s.include).reduce((sum, s) => {
    if (form.splitType === 'percentage') return sum + (parseFloat(s.percentage) || 0);
    if (form.splitType === 'unequal') return sum + (parseFloat(s.amount) || 0);
    return sum;
  }, 0);

  const totalAmount = parseFloat(form.amount) || 0;
  const splitError = form.splitType === 'percentage' && Math.abs(totalSplit - 100) > 0.5
    ? `Percentages sum to ${totalSplit.toFixed(1)}%, need 100%`
    : form.splitType === 'unequal' && totalAmount > 0 && Math.abs(totalSplit - totalAmount) > 0.5
    ? `Split amounts sum to ₹${totalSplit.toFixed(2)}, need ₹${totalAmount.toFixed(2)}`
    : null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-title">{editExpense ? 'Edit Expense' : 'Add Expense'}</div>
        <div className="modal-subtitle">Fill in the expense details and how to split</div>
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Group *</label>
              <select className="form-select" value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}>
                <option value="">Select group</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. Grocery Run" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD (×84 = INR)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Paid By *</label>
              <select className="form-select" value={form.paidBy} onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}>
                <option value="">Select payer</option>
                {groupMembers.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['General','Food','Grocery','Electricity','Rent','Travel','Fuel','Medicine','Entertainment','Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Split Type</label>
              <select className="form-select" value={form.splitType} onChange={e => setForm(f => ({ ...f, splitType: e.target.value }))}>
                <option value="equal">Equal Split</option>
                <option value="unequal">Exact Amounts</option>
                <option value="percentage">By Percentage</option>
                <option value="share">By Shares</option>
              </select>
            </div>
          </div>

          {groupMembers.length > 0 && form.splitType !== 'equal' && (
            <div style={{ marginBottom: 20 }}>
              <div className="section-title">Split Details</div>
              {splitError && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{splitError}</div>}
              {splits.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <input type="checkbox" checked={s.include} onChange={e => setSplits(sp => sp.map((x, j) => j === i ? { ...x, include: e.target.checked } : x))} />
                  <span style={{ width: 80, fontSize: 14, fontWeight: 600 }}>{s.memberName}</span>
                  {form.splitType === 'unequal' && <input className="form-input" type="number" step="0.01" placeholder="Amount" value={s.amount} onChange={e => setSplits(sp => sp.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} style={{ flex: 1 }} />}
                  {form.splitType === 'percentage' && <input className="form-input" type="number" step="0.1" placeholder="%" value={s.percentage} onChange={e => setSplits(sp => sp.map((x, j) => j === i ? { ...x, percentage: e.target.value } : x))} style={{ flex: 1 }} />}
                  {form.splitType === 'share' && <input className="form-input" type="number" placeholder="Shares" value={s.shares} onChange={e => setSplits(sp => sp.map((x, j) => j === i ? { ...x, shares: e.target.value } : x))} style={{ flex: 1 }} />}
                </div>
              ))}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!splitError}>
              {loading ? <><span className="loading-spinner" /> Saving…</> : editExpense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [searchParams] = useSearchParams();
  const groupFilter = searchParams.get('group');
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [filter, setFilter] = useState({ groupId: groupFilter || '', search: '' });

  useEffect(() => {
    Promise.all([
      API.get(`/expenses${filter.groupId ? `?groupId=${filter.groupId}` : ''}`),
      API.get('/groups')
    ]).then(([ex, gr]) => {
      setExpenses(ex.data.expenses || []);
      setGroups(gr.data.groups || []);
    }).finally(() => setLoading(false));
  }, [filter.groupId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await API.delete(`/expenses/${id}`, { data: { reason: 'Deleted by user' } });
      setExpenses(e => e.filter(x => x._id !== id));
      toast.success('Expense deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = expenses.filter(e =>
    !filter.search || e.title.toLowerCase().includes(filter.search.toLowerCase()) || e.paidBy?.memberName?.toLowerCase().includes(filter.search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Expenses</h1>
            <p className="page-subtitle">All shared expenses across your groups</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditExp(null); setShowModal(true); }}>+ Add Expense</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input className="form-input" placeholder="🔍 Search expenses…" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} style={{ flex: 1, maxWidth: 320 }} />
        <select className="form-select" value={filter.groupId} onChange={e => setFilter(f => ({ ...f, groupId: e.target.value }))} style={{ width: 200 }}>
          <option value="">All Groups</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="loading-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💸</div>
          <div className="empty-title">No expenses found</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>Add First Expense</button>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Description</th><th>Date</th><th>Paid By</th><th>Amount</th><th>Split</th><th>Participants</th><th>Flags</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.title}</div>
                      {e.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.notes.slice(0, 40)}</div>}
                      {e.importedFrom && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>📥 {e.importedFrom}</div>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ fontWeight: 500 }}>{e.paidBy?.memberName}</td>
                    <td>
                      <div className={e.currency === 'USD' ? 'amount-usd' : 'amount-inr'}>
                        {e.currency === 'USD' ? '$' : '₹'}{e.amount.toLocaleString('en-IN')}
                      </div>
                      {e.currency === 'USD' && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>≈₹{(e.amount * 84).toLocaleString('en-IN')}</div>}
                    </td>
                    <td><span className="tag">{e.splitType}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {e.splits?.slice(0, 3).map(s => s.memberName).join(', ')}{e.splits?.length > 3 ? ` +${e.splits.length - 3}` : ''}
                    </td>
                    <td>
                      {e.isRefund && <span className="badge badge-info">refund</span>}
                      {e.anomalyFlags?.slice(0, 1).map(f => <span key={f} className="badge badge-warning" style={{ fontSize: 9 }}>{f.replace('_', ' ').toLowerCase()}</span>)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditExp(e); setShowModal(true); }}>✏️</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(e._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{filtered.length} expenses</span>
            <span className="amount-inr">Total: ₹{filtered.reduce((s, e) => s + (e.currency === 'USD' ? e.amount * 84 : e.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      )}

      {showModal && (
        <ExpenseModal
          groupId={filter.groupId}
          groups={groups}
          editExpense={editExp}
          onClose={() => { setShowModal(false); setEditExp(null); }}
          onSaved={exp => {
            setExpenses(es => editExp ? es.map(e => e._id === exp._id ? exp : e) : [exp, ...es]);
            setShowModal(false); setEditExp(null);
          }}
        />
      )}
    </div>
  );
}
