import { useState, useEffect, useRef } from 'react';
import { API } from '../../context/AuthContext';

const SUGGESTIONS = [
  'Show all expenses involving Sam',
  'Expenses in March',
  'Largest expenses',
  'All USD expenses',
  'Show settlements',
  'Why do I owe money?',
];

export default function AiAssistant() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "👋 Hi! I'm the SplitSmart AI Assistant. Ask me anything about your expenses — like *\"Show all expenses involving Sam\"*, *\"Why do I owe ₹2300?\"*, or *\"Expenses in March\"*.",
    time: new Date()
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [explainMember, setExplainMember] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    API.get('/groups').then(r => {
      const gs = r.data.groups || [];
      setGroups(gs);
      if (gs.length) setSelectedGroup(gs[0]._id);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || !selectedGroup) return;
    const userMsg = { role: 'user', content: text, time: new Date() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const r = await API.post('/ai/ask', { question: text, groupId: selectedGroup });
      const results = r.data.results || [];
      let content = r.data.answer;
      if (results.length > 0) {
        content += '\n\nFound expenses:';
      }
      setMessages(m => [...m, {
        role: 'assistant',
        content,
        results: results.slice(0, 10),
        time: new Date()
      }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '❌ Failed to process your question. Please try again.', time: new Date() }]);
    } finally { setLoading(false); }
  };

  const explainBalance = async () => {
    if (!explainMember || !selectedGroup) return;
    setExplainLoading(true);
    try {
      const r = await API.post('/ai/explain-balance', { memberName: explainMember, groupId: selectedGroup });
      const exp = r.data.explanation;
      const content = `📊 **Balance Explanation for ${exp.memberName}**\n\n${exp.summary}\n\n• Total paid by ${exp.memberName}: ₹${exp.totalPaid.toLocaleString('en-IN')}\n• Total share owed: ₹${exp.totalOwed.toLocaleString('en-IN')}\n• Settlements: ₹${exp.settledAmount.toLocaleString('en-IN')}\n• **Net balance: ₹${Math.abs(exp.netBalance).toLocaleString('en-IN')} ${exp.netBalance < 0 ? '(owes)' : '(is owed)'}**`;
      setMessages(m => [...m, {
        role: 'user',
        content: `Explain ${exp.memberName}'s balance`,
        time: new Date()
      }, {
        role: 'assistant',
        content,
        results: exp.breakdown.slice(0, 10),
        time: new Date()
      }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '❌ Failed to explain balance.', time: new Date() }]);
    } finally { setExplainLoading(false); }
  };

  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', gap: 16 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">🤖 AI Assistant</h1>
            <p className="page-subtitle">Ask anything about your expenses in plain English</p>
          </div>
          <select className="form-select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={{ width: 200 }}>
            {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}>
                {m.role === 'assistant' && (
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🤖</div>
                )}
                <div style={{ maxWidth: '75%' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
                    border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    color: m.role === 'user' ? 'white' : 'var(--text-primary)',
                    fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap'
                  }}>
                    {m.content}
                  </div>
                  {m.results && m.results.length > 0 && (
                    <div style={{ marginTop: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      {m.results.map((e, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: j < m.results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title || e.description}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} {e.paidBy?.memberName ? `· ${e.paidBy.memberName}` : ''}
                            </div>
                          </div>
                          <span className={e.currency === 'USD' ? 'amount-usd' : 'amount-inr'} style={{ fontSize: 13 }}>
                            {e.currency === 'USD' ? '$' : '₹'}{e.amount?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>{fmt(m.time)}</div>
                </div>
                {m.role === 'user' && (
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.4s infinite', animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <input
              className="form-input"
              placeholder="Ask about expenses… (e.g. 'Show Sam's expenses', 'March spending')"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              disabled={loading || !selectedGroup}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => sendMessage(input)} disabled={loading || !input.trim() || !selectedGroup}>
              {loading ? <span className="loading-spinner" /> : '↑'}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Suggestions */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>💡 Try asking</div>
            {SUGGESTIONS.map(s => (
              <div key={s}
                onClick={() => sendMessage(s)}
                style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 6, border: '1px solid var(--border)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                "{s}"
              </div>
            ))}
          </div>

          {/* Balance explainer */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>⚖️ Explain Balance</div>
            <input className="form-input" placeholder="Member name (e.g. Rohan)" value={explainMember} onChange={e => setExplainMember(e.target.value)} style={{ marginBottom: 10 }} />
            <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={explainBalance} disabled={explainLoading || !explainMember || !selectedGroup}>
              {explainLoading ? <><span className="loading-spinner" /> Loading…</> : 'Explain →'}
            </button>
            <div className="form-hint">Shows exactly which expenses make up their balance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
