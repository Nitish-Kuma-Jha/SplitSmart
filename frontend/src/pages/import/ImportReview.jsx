import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SEVERITY_COLOR = { error: 'var(--error)', warning: 'var(--warning)', info: 'var(--info)' };
const SEVERITY_BG = { error: 'var(--error-bg)', warning: 'var(--warning-bg)', info: 'var(--info-bg)' };
const SEVERITY_BADGE = { error: 'badge-error', warning: 'badge-warning', info: 'badge-info' };

const TYPE_LABELS = {
  DUPLICATE: 'Duplicate Row',
  SETTLEMENT_AS_EXPENSE: 'Settlement as Expense',
  MISSING_PAYER: 'Missing Payer',
  INVALID_DATE: 'Invalid Date',
  MISSING_CURRENCY: 'Missing Currency',
  MEMBERSHIP_VIOLATION: 'Membership Violation',
  UNKNOWN_PARTICIPANT: 'Unknown Participant',
  ZERO_AMOUNT: 'Zero Amount',
  NEGATIVE_AMOUNT: 'Negative Amount (Refund)',
  CONFLICTING_RECORD: 'Conflicting Record',
  PERCENTAGE_ERROR: 'Percentage Error',
  SPLIT_MISMATCH: 'Split Mismatch',
  AMBIGUOUS_DATE: 'Ambiguous Date',
  PRECISION_ISSUE: 'Precision Issue',
  FUTURE_DATE: 'Future Date',
};

const AUTO_ACTION_LABEL = {
  skip: '⏭ Skip this row',
  convert_settlement: '🔄 Convert to Settlement',
  import_as_refund: '↩ Import as Refund',
  use_row: '✅ Import as-is',
  use_dmy: '📅 Use DD-MM-YYYY',
  default_inr: '₹ Default to INR',
  normalize_name: '✏️ Normalize name',
  exclude_member: '🚫 Exclude from split',
  normalize_percentages: '📊 Normalize to 100%',
  round_amount: '🔢 Round to 2 decimals',
};

export default function ImportReview() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [report, setReport] = useState('');
  const [filter, setFilter] = useState('all');
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  useEffect(() => {
    API.get(`/import/${jobId}`).then(r => {
      setJob(r.data.importJob);
      setAnomalies(r.data.importJob.anomalies || []);
    }).catch(() => toast.error('Failed to load import job'))
    .finally(() => setLoading(false));
  }, [jobId]);

  const updateAnomaly = async (anomalyId, status, resolution) => {
    try {
      const r = await API.put(`/import/${jobId}/anomalies/${anomalyId}`, { status, resolution });
      setAnomalies(prev => prev.map(a => a._id === anomalyId ? r.data.anomaly : a));
    } catch { toast.error('Failed to update'); }
  };

  const approveAll = async () => {
    setApproveAllLoading(true);
    const pending = anomalies.filter(a => a.status === 'pending');
    for (const a of pending) {
      await updateAnomaly(a._id, 'approved', `Auto-approved: ${AUTO_ACTION_LABEL[a.autoAction] || 'Apply suggested fix'}`);
    }
    setApproveAllLoading(false);
    toast.success('All anomalies approved!');
  };

  const executeImport = async () => {
    const pending = anomalies.filter(a => a.status === 'pending');
    if (pending.length > 0) {
      if (!window.confirm(`${pending.length} anomalies are still pending. They will be auto-approved and their suggested action applied. Continue?`)) return;
      await approveAll();
    }
    setExecuting(true);
    try {
      const r = await API.post(`/import/${jobId}/execute`);
      setReport(r.data.summary.report);
      toast.success(`Import complete! ${r.data.summary.importedRows} rows imported.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally { setExecuting(false); }
  };

  const filtered = anomalies.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'approved') return a.status === 'approved';
    if (filter === 'rejected') return a.status === 'rejected';
    return a.severity === filter;
  });

  const counts = {
    total: anomalies.length,
    pending: anomalies.filter(a => a.status === 'pending').length,
    approved: anomalies.filter(a => a.status === 'approved').length,
    rejected: anomalies.filter(a => a.status === 'rejected').length,
    error: anomalies.filter(a => a.severity === 'error').length,
    warning: anomalies.filter(a => a.severity === 'warning').length,
    info: anomalies.filter(a => a.severity === 'info').length,
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-secondary)' }}>
      <span className="loading-spinner" style={{ width: 32, height: 32 }} /> Analyzing CSV anomalies…
    </div>
  );

  if (report) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">✅ Import Complete</h1>
        <p className="page-subtitle">Your CSV has been imported. Full report below.</p>
      </div>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Rows</div><div className="stat-value">{job?.totalRows}</div></div>
        <div className="stat-card"><div className="stat-label">Imported</div><div className="stat-value" style={{ color: 'var(--success)' }}>{job?.importedRows || 0}</div></div>
        <div className="stat-card"><div className="stat-label">Skipped</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{job?.skippedRows || 0}</div></div>
        <div className="stat-card"><div className="stat-label">Anomalies</div><div className="stat-value">{counts.total}</div></div>
      </div>
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Import Report</div>
        <pre className="code-block">{report}</pre>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => navigate('/expenses')}>View Expenses →</button>
        <button className="btn btn-outline" onClick={() => navigate('/balances')}>View Balances →</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Review Anomalies</h1>
            <p className="page-subtitle">
              📁 {job?.filename} · {job?.totalRows} rows · Review each issue before importing
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={approveAll} disabled={approveAllLoading || counts.pending === 0}>
              {approveAllLoading ? <><span className="loading-spinner" /> Approving…</> : `✅ Approve All (${counts.pending})`}
            </button>
            <button
              className="btn btn-primary"
              onClick={executeImport}
              disabled={executing}
              style={{ background: counts.pending > 0 ? 'var(--warning)' : 'var(--success)', color: '#000' }}
            >
              {executing ? <><span className="loading-spinner" /> Importing…</> : `🚀 Execute Import`}
            </button>
          </div>
        </div>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="alert alert-info" style={{ margin: 0, flex: 1 }}>
          ⚠️ Nothing is imported until you click <strong>Execute Import</strong>. You must approve or reject each anomaly first (or use Approve All).
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Total', val: counts.total, color: 'var(--text-primary)', filter: 'all' },
          { label: 'Pending', val: counts.pending, color: 'var(--warning)', filter: 'pending' },
          { label: 'Approved', val: counts.approved, color: 'var(--success)', filter: 'approved' },
          { label: 'Rejected', val: counts.rejected, color: 'var(--error)', filter: 'rejected' },
          { label: 'Errors', val: counts.error, color: 'var(--error)', filter: 'error' },
          { label: 'Warnings', val: counts.warning, color: 'var(--warning)', filter: 'warning' },
          { label: 'Info', val: counts.info, color: 'var(--info)', filter: 'info' },
        ].map(s => (
          <div key={s.label}
            onClick={() => setFilter(s.filter)}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius)',
              background: filter === s.filter ? 'var(--bg-hover)' : 'var(--bg-card)',
              border: `1px solid ${filter === s.filter ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer', textAlign: 'center', minWidth: 80
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.val}</div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Anomaly list */}
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">No anomalies in this filter</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((a, i) => (
            <div key={a._id} className="card" style={{
              borderLeft: `4px solid ${SEVERITY_COLOR[a.severity]}`,
              opacity: a.status === 'rejected' ? 0.5 : 1
            }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Row number */}
                <div style={{
                  minWidth: 52, height: 52, borderRadius: 12,
                  background: SEVERITY_BG[a.severity],
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: 10, color: SEVERITY_COLOR[a.severity], fontWeight: 700 }}>ROW</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: SEVERITY_COLOR[a.severity], fontFamily: 'var(--font-mono)' }}>{a.rowIndex}</div>
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    <span className={`badge ${SEVERITY_BADGE[a.severity]}`}>{a.severity.toUpperCase()}</span>
                    <span className="badge badge-neutral">{TYPE_LABELS[a.type] || a.type}</span>
                    {a.status !== 'pending' && (
                      <span className={`badge ${a.status === 'approved' ? 'badge-success' : 'badge-error'}`}>
                        {a.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.5 }}>
                    {a.description}
                  </div>

                  {a.suggestion && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 8, marginBottom: 8 }}>
                      💡 <strong>Suggested action:</strong> {a.suggestion}
                    </div>
                  )}

                  {a.autoAction && (
                    <div style={{ fontSize: 12, color: 'var(--accent-light)', marginBottom: 8 }}>
                      🤖 Auto action: <strong>{AUTO_ACTION_LABEL[a.autoAction] || a.autoAction}</strong>
                    </div>
                  )}

                  {/* Raw row data */}
                  {a.rowData && (
                    <details style={{ marginBottom: 8 }}>
                      <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>View raw row data</summary>
                      <div style={{ marginTop: 8, padding: '10px', background: 'var(--bg-primary)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', overflow: 'auto' }}>
                        {Object.entries(a.rowData).map(([k, v]) => (
                          <div key={k}><span style={{ color: 'var(--accent-light)' }}>{k}</span>: {String(v)}</div>
                        ))}
                      </div>
                    </details>
                  )}

                  {a.resolution && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Resolution: {a.resolution}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {a.status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => updateAnomaly(a._id, 'approved', `Approved: ${AUTO_ACTION_LABEL[a.autoAction] || 'Apply suggested fix'}`)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => updateAnomaly(a._id, 'rejected', 'Rejected by user')}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
                {a.status !== 'pending' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => updateAnomaly(a._id, 'pending', '')}
                    style={{ flexShrink: 0 }}
                  >
                    ↩ Reset
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom execute */}
      <div style={{ marginTop: 24, padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700 }}>Ready to import?</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {counts.pending > 0 ? `${counts.pending} anomalies pending — they'll be auto-approved on execute` : `All ${counts.total} anomalies reviewed ✓`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate('/import')}>← Back</button>
          <button className="btn btn-primary" onClick={executeImport} disabled={executing}>
            {executing ? <><span className="loading-spinner" /> Importing…</> : `🚀 Execute Import (${job?.totalRows} rows)`}
          </button>
        </div>
      </div>
    </div>
  );
}
