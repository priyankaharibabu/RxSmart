import React from 'react';

const AGENTS = [
  { name: 'OCR Agent', icon: '◈', desc: 'Reading prescription image' },
  { name: 'NLP Agent', icon: '◉', desc: 'Extracting medicine data' },
  { name: 'Validation Agent', icon: '◑', desc: 'Checking drug safety' },
  { name: 'Inventory Agent', icon: '◐', desc: 'Verifying stock' },
  { name: 'Billing Agent', icon: '◇', desc: 'Generating bill' },
  { name: 'Queue Agent', icon: '◈', desc: 'Assigning token' },
  { name: 'Notification Agent', icon: '◎', desc: 'Sending alert' },
  { name: 'Audit Agent', icon: '◆', desc: 'Logging transaction' },
];

export default function AgentPipeline({ agentLog = [], isProcessing = false }) {
  function getStatus(agentName) {
    const log = agentLog.find(l => l.agent === agentName);
    if (log) return log.status;
    if (isProcessing) return 'PENDING';
    return 'IDLE';
  }

  function getColor(status) {
    if (status === 'DONE') return 'var(--accent)';
    if (status === 'FAILED') return 'var(--danger)';
    if (status === 'WARNING') return 'var(--warning)';
    return 'var(--text-dim)';
  }

  function getBg(status) {
    if (status === 'DONE') return 'var(--accent-dim)';
    if (status === 'FAILED') return 'var(--danger-dim)';
    if (status === 'WARNING') return 'var(--warning-dim)';
    return 'var(--bg-glass)';
  }

  const activeIdx = agentLog.length;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      animation: 'fadeUp 0.4s ease both'
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Agent Pipeline
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {isProcessing ? `${agentLog.length} of 8 agents completed` : agentLog.length > 0 ? 'Pipeline complete' : 'Waiting for prescription'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {AGENTS.map((agent, idx) => {
          const status = getStatus(agent.name);
          const isActive = isProcessing && idx === activeIdx;

          return (
            <div key={agent.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              background: getBg(status),
              border: `1px solid ${status !== 'IDLE' ? getColor(status) + '33' : 'var(--border)'}`,
              borderRadius: 10,
              transition: 'all 0.3s ease',
              animation: isActive ? 'fadeIn 0.3s ease' : 'none'
            }}>
              <span style={{
                fontSize: 16,
                color: getColor(status),
                display: 'inline-block',
                animation: isActive ? 'spin 1.5s linear infinite' : 'none'
              }}>{agent.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: status === 'IDLE' ? 'var(--text-dim)' : 'var(--text)' }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{agent.desc}</div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600,
                color: getColor(status),
                letterSpacing: '0.04em'
              }}>
                {isActive ? '...' : status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
