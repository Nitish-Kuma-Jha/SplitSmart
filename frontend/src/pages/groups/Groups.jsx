import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function CreateGroupModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', currency: 'INR' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Group name required'); return; }
    setLoading(true);
    try {
      const r = await API.post('/groups', form);
      toast.success('Group created!');
      onCreated(r.data.group);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Create New Group</div>
        <div className="modal-subtitle">Start tracking shared expenses together</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Group Name *</label>
            <input className="form-input" placeholder="e.g. Flatmates 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Default Currency</label>
            <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              <option value="INR">₹ INR — Indian Rupee</option>
              <option value="USD">$ USD — US Dollar</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="loading-spinner" /> Creating…</> : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    API.get('/groups').then(r => setGroups(r.data.groups || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Groups</h1>
            <p className="page-subtitle">Manage your shared expense groups</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Group</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}><span className="loading-spinner" /></div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-title">No groups yet</div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Create a group to start tracking shared expenses</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Your First Group</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {groups.map(g => (
            <Link key={g._id} to={`/groups/${g._id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `hsl(${g.name.charCodeAt(0) * 37}deg 65% 38%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 20, color: 'white', flexShrink: 0
                  }}>{g.name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.description || 'No description'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Members</div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{g.members?.length || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Currency</div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: g.currency === 'USD' ? 'var(--usd)' : 'var(--inr)' }}>{g.currency}</div>
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>View →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={g => { setGroups(gs => [...gs, g]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
