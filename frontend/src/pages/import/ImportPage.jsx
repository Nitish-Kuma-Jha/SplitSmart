import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ImportPage() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importHistory, setImportHistory] = useState([]);

  useEffect(() => {
    API.get('/groups').then(r => {
      setGroups(r.data.groups || []);
      if (r.data.groups?.length) setSelectedGroup(r.data.groups[0]._id);
    });
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      API.get(`/import/group/${selectedGroup}`).then(r => setImportHistory(r.data.jobs || [])).catch(() => {});
    }
  }, [selectedGroup]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) setFile(f);
    else toast.error('Please upload a CSV file');
  };

  const handleUpload = async () => {
    if (!file || !selectedGroup) { toast.error('Select a group and file'); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('groupId', selectedGroup);
    try {
      const r = await API.post('/import/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Analyzed! Found ${r.data.anomalies?.length || 0} anomalies`);
      navigate(`/import/${r.data.importJob._id}/review`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Import CSV</h1>
        <p className="page-subtitle">Upload your expenses_export.csv — our anomaly engine will analyze it before importing</p>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        <div>
          {/* Group select */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>1. Select Target Group</div>
            <select className="form-select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
              <option value="">Choose group</option>
              {groups.map(g => <option key={g._id} value={g._id}>{g.name} ({g.currency})</option>)}
            </select>
            <div className="form-hint">Expenses will be imported into this group</div>
          </div>

          {/* File drop */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>2. Upload CSV File</div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>{file ? '✅' : '📂'}</div>
              {file ? (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop CSV here or click to browse</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Only .csv files · Max 10MB</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          </div>

          {/* Upload button */}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleUpload}
            disabled={!file || !selectedGroup || loading}
          >
            {loading ? <><span className="loading-spinner" /> Analyzing CSV…</> : '🔍 Analyze & Review →'}
          </button>
        </div>

        <div>
          {/* Info box */}
          <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(99,102,241,0.3)' }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>What our anomaly engine detects</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['🔴', 'Duplicate rows', 'Same expense logged twice'],
                ['🟡', 'Settlement as expense', 'Payment logged as a shared expense'],
                ['🟡', 'Membership violation', 'Meera after March / Sam before April'],
                ['🟡', 'Missing currency', 'Defaulted to INR with a warning'],
                ['🟡', 'Negative amounts', 'Treated as refunds'],
                ['🔴', 'Zero amounts', 'Skipped with explanation'],
                ['🟡', 'Ambiguous dates', 'DD-MM vs MM-DD resolved to DD-MM'],
                ['⚪', 'Unknown participants', '"Priya S" normalized, Kabir excluded'],
                ['🟡', 'Percentage errors', 'Sums ≠ 100%, normalized automatically'],
                ['⚪', 'Sub-paisa precision', 'Rounded to 2 decimal places'],
                ['🟡', 'Conflicting records', 'Same dinner, different amounts'],
                ['🟡', 'Missing payer', 'Row skipped with explanation'],
              ].map(([icon, label, desc]) => (
                <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, fontSize: 14 }}>{icon}</span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{label} </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {importHistory.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Import History</div>
              {importHistory.map(j => (
                <div key={j._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{j.filename}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(j.createdAt).toLocaleDateString('en-IN')} · {j.importedRows}/{j.totalRows} rows</div>
                  </div>
                  <span className={`badge badge-${j.status === 'completed' ? 'success' : j.status === 'pending_review' ? 'warning' : 'neutral'}`}>{j.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
