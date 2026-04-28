import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function QueueDisplay() {
  const [queueStatus, setQueueStatus] = useState({ queue: [], currentlyServing: 0, totalWaiting: 0 });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await axios.get('/api/queue/status');
        setQueueStatus(res.data.data || { queue: [], currentlyServing: 0, totalWaiting: 0 });
      } catch {}
      setLoading(false);
    }
    fetch();
    const interval = setInterval(() => {
      fetch();
      setTick(t => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function serveNext() {
    await axios.post('/api/queue/serve-next');
    const res = await axios.get('/api/queue/status');
    setQueueStatus(res.data.data);
  }

  async function markServed() {
    await axios.post('/api/queue/mark-served');
    const res = await axios.get('/api/queue/status');
    setQueueStatus(res.data.data);
  }

  const waiting = queueStatus.queue?.filter(q => q.status === 'WAITING') || [];
  const served = queueStatus.queue?.filter(q => q.status === 'SERVING') || [];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', animation: 'fadeUp 0.5s ease both' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Live Queue
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-0.02em' }}>
          Token Display Board
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Refreshes every 5 seconds
        </p>
      </div>

      {/* Now Serving Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,212,170,0.2), rgba(0,212,170,0.05))',
        border: '2px solid var(--accent)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        textAlign: 'center',
        marginBottom: 28,
        animation: 'pulse-ring 3s ease infinite'
      }}>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Now Serving
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 80,
          color: 'var(--accent)', lineHeight: 1
        }}>
          {queueStatus.currentlyServing ? `#${queueStatus.currentlyServing}` : '—'}
        </div>
        <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 14 }}>
          {queueStatus.totalWaiting} patient(s) waiting
        </div>
        
        {/* Action Buttons */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
          {queueStatus.currentlyServing ? (
            <button onClick={markServed} style={{
              padding: '12px 32px',
              background: 'var(--success)', color: '#000',
              border: 'none', borderRadius: 'var(--radius)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer'
            }}>
              ✓ OK - Served
            </button>
          ) : null}
          
          <button onClick={serveNext} style={{
            padding: '12px 24px',
            background: 'var(--accent)', color: '#000',
            border: 'none', borderRadius: 'var(--radius)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>
            → Serve Next Patient
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Waiting Queue</div>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading queue...</div>
        ) : waiting.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>✓</div>
            <div style={{ color: 'var(--text-muted)' }}>Queue is empty — all patients served!</div>
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {waiting.map((entry, i) => (
              <div key={entry.tokenNumber} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px',
                background: i === 0 ? 'var(--accent-dim)' : 'var(--bg-glass)',
                border: `1px solid ${i === 0 ? 'var(--accent-glow)' : 'var(--border)'}`,
                borderRadius: 12
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: i === 0 ? 'var(--accent)' : 'var(--bg-card)',
                  border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16,
                  color: i === 0 ? '#000' : 'var(--text-muted)', flexShrink: 0
                }}>
                  {entry.tokenNumber}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{entry.patientName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Position #{i + 1} · Est. {entry.estimatedWait || (i + 1) * 3} min wait
                  </div>
                </div>
                {i === 0 && (
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: 'var(--accent)', color: '#000', letterSpacing: '0.06em'
                  }}>NEXT</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
