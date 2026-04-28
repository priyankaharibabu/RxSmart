import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrescription } from '../context/PrescriptionContext.jsx';

function Badge({ children, type = 'default' }) {
  const colors = {
    success: { bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'var(--accent-glow)' },
    danger: { bg: 'var(--danger-dim)', color: 'var(--danger)', border: 'rgba(255,92,92,0.3)' },
    warning: { bg: 'var(--warning-dim)', color: 'var(--warning)', border: 'rgba(255,170,0,0.3)' },
    info: { bg: 'var(--info-dim)', color: 'var(--info)', border: 'rgba(77,159,255,0.3)' },
    default: { bg: 'var(--bg-glass)', color: 'var(--text-muted)', border: 'var(--border)' },
  };
  const c = colors[type];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      letterSpacing: '0.04em', textTransform: 'uppercase'
    }}>{children}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '24px',
      ...style
    }}>{children}</div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
      color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
      marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)'
    }}>{children}</div>
  );
}

export default function ResultPage() {
  const navigate = useNavigate();
  const { lastResult } = usePrescription();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  if (!lastResult) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◎</div>
        <p style={{ color: 'var(--text-muted)' }}>No result found. Process a prescription first.</p>
        <button onClick={() => navigate('/patient')} style={{
          marginTop: 20, padding: '12px 24px',
          background: 'var(--accent)', color: '#000',
          border: 'none', borderRadius: 'var(--radius)',
          fontWeight: 700, cursor: 'pointer'
        }}>Go to Patient Portal</button>
      </div>
    );
  }

  const { prescriptionId, results } = lastResult;
  const { prescription, validation, inventory, bill, queue, notification } = results;

  const riskColor = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger' };

  const handleDownloadPDF = async () => {
    const tokenNumber = bill?.tokenNumber;
    if (!tokenNumber) {
      setPdfError('No token number found. Cannot generate bill.');
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    try {
      const response = await fetch(
        `http://localhost:5001/api/billing/download/${tokenNumber}`
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RxSmart-Bill-${tokenNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError('PDF download failed: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', animation: 'fadeUp 0.5s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Processing Complete
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-0.02em' }}>
            Prescription Results
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{prescriptionId}</p>
        </div>
        <button onClick={() => navigate('/patient')} style={{
          padding: '10px 20px', background: 'var(--bg-glass)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer'
        }}>← New Prescription</button>
      </div>

      {/* Token Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.05))',
        border: '1px solid var(--accent-glow)',
        borderRadius: 'var(--radius-xl)', padding: '24px 32px',
        marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32,
        animation: 'fadeUp 0.4s 0.1s ease both'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Token Number</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56, color: 'var(--accent)', lineHeight: 1 }}>
            #{bill?.tokenNumber}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8 }}>
            Your medicines are being packed!
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              ['Position', `#${queue?.position} in queue`],
              ['Est. Wait', `~${queue?.estimatedWaitMinutes} mins`],
              ['Total Bill', `₹${bill?.pricing?.grandTotal}`],
              ['Payment', 'Pending'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
        <Badge type="success">READY</Badge>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        
        {/* Patient & Doctor Info */}
        <Card style={{ animation: 'fadeUp 0.4s 0.15s ease both' }}>
          <SectionTitle>Patient & Doctor</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Patient', prescription?.patientName || 'N/A'],
              ['Age', prescription?.patientAge || 'N/A'],
              ['Doctor', prescription?.doctorName || 'N/A'],
              ['Clinic', prescription?.clinicName || 'N/A'],
              ['Date', prescription?.date || 'N/A'],
              ['Diagnosis', prescription?.diagnosis || 'N/A'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Validation */}
        <Card style={{ animation: 'fadeUp 0.4s 0.2s ease both' }}>
          <SectionTitle>Safety Validation</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Badge type={riskColor[validation?.overallRisk] || 'default'}>
              {validation?.overallRisk || 'N/A'} RISK
            </Badge>
            <Badge type={validation?.safe ? 'success' : 'danger'}>
              {validation?.safe ? 'SAFE' : 'UNSAFE'}
            </Badge>
          </div>
          {validation?.validations?.map((v, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13
            }}>
              <span style={{ color: 'var(--text-muted)' }}>{v.medicine}</span>
              <Badge type={v.status === 'SAFE' ? 'success' : v.status === 'WARNING' ? 'warning' : 'danger'}>
                {v.status}
              </Badge>
            </div>
          ))}
          {validation?.interactions?.length > 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--warning-dim)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                {validation.interactions.length} interaction(s) detected
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Medicine Bill Table */}
      <Card style={{ marginBottom: 20, animation: 'fadeUp 0.4s 0.25s ease both' }}>
        <SectionTitle>Medicine Bill — {bill?.pharmacy?.name}</SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Medicine', 'Brand', 'Dosage', 'Qty', 'Unit Price', 'Total', 'Status'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px',
                    color: 'var(--text-dim)', fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bill?.lineItems?.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 12px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '12px 12px', color: 'var(--text-muted)' }}>{item.brand}</td>
                  <td style={{ padding: '12px 12px', color: 'var(--text-muted)' }}>{item.dosage}</td>
                  <td style={{ padding: '12px 12px' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 12px' }}>₹{item.pricePerUnit}</td>
                  <td style={{ padding: '12px 12px', fontWeight: 600 }}>₹{item.totalPrice}</td>
                  <td style={{ padding: '12px 12px' }}>
                    <Badge type={item.available ? 'success' : 'danger'}>
                      {item.inventoryStatus}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals + Download Button */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          
          {/* PDF Download Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 28px',
                background: pdfLoading
                  ? 'var(--bg-glass)'
                  : 'linear-gradient(135deg, var(--accent), #00b894)',
                color: pdfLoading ? 'var(--text-muted)' : '#000',
                border: pdfLoading ? '1px solid var(--border)' : 'none',
                borderRadius: 'var(--radius)',
                fontSize: 14, fontWeight: 700,
                cursor: pdfLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: pdfLoading ? 'none' : '0 4px 20px rgba(0,212,170,0.35)',
                letterSpacing: '0.02em',
              }}
            >
              {pdfLoading ? (
                <>
                  <span style={{
                    width: 14, height: 14, border: '2px solid var(--text-muted)',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite'
                  }} />
                  Generating PDF…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download PDF Bill
                </>
              )}
            </button>

            {pdfError && (
              <div style={{
                fontSize: 12, color: 'var(--danger)',
                background: 'var(--danger-dim)',
                border: '1px solid rgba(255,92,92,0.3)',
                borderRadius: 6, padding: '6px 12px',
                maxWidth: 300
              }}>
                ⚠ {pdfError}
              </div>
            )}
          </div>

          {/* Totals */}
          <div style={{ minWidth: 280 }}>
            {[
              ['Subtotal', `₹${bill?.pricing?.subtotal}`],
              [`GST (${bill?.pricing?.gstRate}%)`, `₹${bill?.pricing?.gstAmount}`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span>{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              <span>Grand Total</span>
              <span style={{ color: 'var(--accent)' }}>₹{bill?.pricing?.grandTotal}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Status */}
      {notification && (
        <Card style={{ animation: 'fadeUp 0.4s 0.3s ease both' }}>
          <SectionTitle>Notification Sent</SectionTitle>
          <div style={{
            padding: '14px 16px', background: 'var(--accent-dim)',
            borderRadius: 10, fontSize: 13, color: 'var(--accent)',
            lineHeight: 1.7
          }}>
            {queue?.message || 'Notification sent successfully'}
          </div>
        </Card>
      )}

      {/* Spinner keyframe — injected inline for self-containment */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
