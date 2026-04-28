import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, User, Calendar, Clock, CheckCircle, AlertCircle, LogOut, History, X } from 'lucide-react';
import '../styles/PatientPortal.css';

export default function PatientPortal() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState('upload');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState(null);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [status, setStatus] = useState('pending');
  const [resultData, setResultData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [servedBannerVisible, setServedBannerVisible] = useState(false);
  const historyStatusRef = useRef({});
  const fileRef = useRef(null);
  const navigate = useNavigate();

  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5001', []);

  function normalizeStatus(statusValue) {
    return String(statusValue || '').toLowerCase() === 'served' ? 'served' : 'pending';
  }

  useEffect(() => {
    if (!submitted || !prescriptionId || status !== 'pending') {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${apiBase}/api/prescription/patient-history`, {
          params: { email: user?.email }
        });
        const records = res.data?.history || [];
        const match = records.find((item) => String(item.id) === String(prescriptionId));

        if (match && normalizeStatus(match.status) === 'served') {
          setStatus('served');
          setResultData({
            prescription: { 
              medicines: Array.isArray(match.medicines) ? match.medicines : [],
              doctorName: match.doctorName || 'Not specified'
            },
            bill: match.bill || {}
          });
        }
      } catch (pollErr) {
        console.error('Polling error:', pollErr);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [apiBase, prescriptionId, status, submitted, user?.email]);

  useEffect(() => {
    if (!user?.email) {
      return undefined;
    }

    const email = String(user.email || '').trim().toLowerCase();
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const response = await axios.get(`${apiBase}/api/prescription/patient-history`, {
          params: { email }
        });
        const records = response.data?.history || [];
        const nextStatusMap = {};
        let showBanner = false;

        records.forEach((record) => {
          const recordStatus = normalizeStatus(record.status);
          nextStatusMap[record.id] = recordStatus;
          const previousStatus = historyStatusRef.current[record.id];
          if (previousStatus === 'pending' && recordStatus === 'served') {
            showBanner = true;
          }
        });

        setHistory(records);
        historyStatusRef.current = nextStatusMap;
        if (showBanner) {
          setServedBannerVisible(true);
        }
        setHistoryError(null);
      } catch (err) {
        console.error('Patient history polling error:', err);
        setHistoryError('Failed to load your bill history.');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 8000);
    return () => clearInterval(interval);
  }, [apiBase, user?.email]);

  function handleFile(selectedFile) {
    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => setPreview(event.target?.result || null);
    reader.readAsDataURL(selectedFile);
  }

  async function handleSubmit() {
    setError(null);

    if (mode === 'upload' && !file) {
      setError('Please upload an image or switch to text mode.');
      return;
    }

    if (mode === 'text' && !text.trim()) {
      setError('Please type your prescription text before submitting.');
      return;
    }

    setLoading(true);

    try {
      let response;
      if (mode === 'upload') {
        const formData = new FormData();
        formData.append('prescription', file);
        formData.append('patientEmail', user?.email || '');
        response = await axios.post(`${apiBase}/api/prescription/process`, formData);
      } else {
        response = await axios.post(`${apiBase}/api/prescription/process-text`, {
          rawText: text,
          patientEmail: user?.email || ''
        });
      }

      setPrescriptionId(response.data?.prescriptionId);
      setTokenNumber(response.data?.tokenNumber || null);
      setStatus('pending');
      setResultData(null);
      setSubmitted(true);
    } catch (submitErr) {
      setError(submitErr.response?.data?.error || submitErr.message || 'Failed to submit prescription.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="patient-portal">
      {/* Header Bar */}
      <div className="portal-header">
        <div className="header-left">
          <div className="logo-section">
            <h1 className="logo-text">RxSmart</h1>
            <span className="portal-subtitle">Patient Portal</span>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <User size={18} strokeWidth={1.5} />
            <span>{user?.name || 'Patient'}</span>
          </div>
          <button className="header-btn" onClick={() => navigate('/patient/history')}>
            <History size={18} strokeWidth={1.5} />
            <span>View History</span>
          </button>
          <button className="header-btn logout-btn" onClick={logout}>
            <LogOut size={18} strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Separator Line */}
      <div className="header-separator"></div>

      {/* Main Content Container */}
      <div className="main-container">
        {/* Success Banner */}
        {servedBannerVisible && (
          <div className="success-banner">
            <div className="banner-content">
              <CheckCircle size={24} strokeWidth={1.5} className="banner-icon" />
              <div className="banner-text">Your medicines are ready! Please come and collect them.</div>
            </div>
            <button className="banner-close" onClick={() => setServedBannerVisible(false)}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {!submitted ? (
          <>
            {/* Welcome Card */}
            <div className="welcome-card">
              <div className="welcome-content">
                <div className="welcome-info">
                  <h2 className="welcome-title">Good day, {user?.name || 'Patient'}</h2>
                  <div className="welcome-date">
                    <Calendar size={18} strokeWidth={1.5} />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Card */}
            <div className="submission-card">
              {/* Tab Bar */}
              <div className="tab-bar">
                <button
                  className={`tab-btn ${mode === 'upload' ? 'active' : ''}`}
                  onClick={() => setMode('upload')}
                >
                  <Upload size={18} strokeWidth={1.5} />
                  <span>Upload Image</span>
                </button>
                <button
                  className={`tab-btn ${mode === 'text' ? 'active' : ''}`}
                  onClick={() => setMode('text')}
                >
                  <FileText size={18} strokeWidth={1.5} />
                  <span>Type Text</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {mode === 'upload' ? (
                  <div className="upload-section">
                    <div
                      className="upload-area"
                      onDrop={(event) => {
                        event.preventDefault();
                        handleFile(event.dataTransfer.files?.[0]);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onClick={() => fileRef.current?.click()}
                    >
                      {preview ? (
                        <div className="preview-container">
                          <img src={preview} alt="Prescription preview" className="preview-image" />
                          <div className="preview-overlay">
                            <button className="change-btn" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                              <Upload size={16} strokeWidth={1.5} />
                              Change Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <div className="upload-icon">
                            <Upload size={48} strokeWidth={1.5} />
                          </div>
                          <p className="upload-text">Drop prescription image here</p>
                          <p className="upload-subtext">or click to browse files</p>
                        </div>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(event) => handleFile(event.target.files?.[0])}
                        className="hidden-input"
                      />
                    </div>
                    {file && (
                      <div className="file-info">
                        <FileText size={16} strokeWidth={1.5} />
                        <span>{file.name}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-section">
                    <div className="text-input-wrapper">
                      <textarea
                        className="text-input"
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Type or paste prescription details here..."
                        rows={8}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="error-message">
                  <AlertCircle size={18} strokeWidth={1.5} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} strokeWidth={1.5} />
                    <span>Submit Prescription</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Status Card */
          <div className={`status-card ${status === 'pending' ? 'pending' : 'served'}`}>
            <div className="status-header">
              <div className="status-icon">
                {status === 'pending' ? (
                  <Clock size={48} strokeWidth={1.5} />
                ) : (
                  <CheckCircle size={48} strokeWidth={1.5} />
                )}
              </div>
              <div className="status-title">
                <h2>
                  {status === 'pending' 
                    ? 'Processing your prescription' 
                    : 'Your medicines are ready! Please collect from pharmacy'}
                </h2>
                <div className="token-display">
                  <span className="token-label">Token Number</span>
                  <span className="token-number">#{tokenNumber || '-'}</span>
                </div>
              </div>
            </div>

            {status === 'served' && resultData && (
              <div className="bill-details">
                {/* Doctor Info */}
                <div className="bill-section">
                  <h3>Doctor Information</h3>
                  <div className="info-row">
                    <span>Doctor Name</span>
                    <span>{resultData?.prescription?.doctorName || 'Not specified'}</span>
                  </div>
                </div>

                {/* Medicines Table */}
                <div className="bill-section">
                  <h3>Medicines Details</h3>
                  <div className="medicines-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Medicine Name</th>
                          <th>Dosage</th>
                          <th>Quantity</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(resultData?.prescription?.medicines || []).map((medicine, index) => (
                          <tr key={`${medicine?.name || 'medicine'}-${index}`}>
                            <td>{medicine?.name || 'Medicine'}</td>
                            <td>{medicine?.dosage || '-'}</td>
                            <td>{medicine?.quantity || 1}</td>
                            <td>₹{Number(medicine?.totalPrice || medicine?.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="bill-section">
                  <div className="total-row">
                    <span>Total Amount</span>
                    <span>₹{Number(resultData?.bill?.totalAmount || resultData?.bill?.pricing?.grandTotal || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Download Bill Button */}
                <div className="bill-section">
                  <button className="download-bill-btn" onClick={() => {
                    // Create bill content for download
                    const billContent = `
RxSmart Pharmacy Bill
=====================

Token Number: #${tokenNumber}
Patient: ${user?.name || 'Patient'}
Doctor: ${resultData?.prescription?.doctorName || 'Not specified'}
Date: ${new Date().toLocaleDateString()}

Medicines:
${(resultData?.prescription?.medicines || []).map((medicine, index) => 
  `${index + 1}. ${medicine?.name || 'Medicine'} - ${medicine?.dosage || '-'} - Qty: ${medicine?.quantity || 1} - ₹${Number(medicine?.totalPrice || medicine?.total || 0).toFixed(2)}`
).join('\n')}

Total Amount: ₹${Number(resultData?.bill?.totalAmount || resultData?.bill?.pricing?.grandTotal || 0).toFixed(2)}

Thank you for choosing RxSmart Pharmacy!
                    `.trim();

                    const blob = new Blob([billContent], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `RxSmart_Bill_${tokenNumber}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }}>
                    <FileText size={18} strokeWidth={1.5} />
                    <span>Download Bill</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button className="new-prescription-btn" onClick={() => {
              setSubmitted(false);
              setFile(null);
              setPreview(null);
              setText('');
              setPrescriptionId(null);
              setTokenNumber(null);
              setStatus('pending');
              setResultData(null);
            }}>
              <Upload size={18} strokeWidth={1.5} />
              <span>Submit Another Prescription</span>
            </button>
          </div>
        )}

        {/* History Section */}
        <div className="history-section">
          <div className="history-header">
            <History size={24} strokeWidth={1.5} />
            <h2>Prescription History</h2>
          </div>
          
          {historyLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading your prescription history...</p>
            </div>
          ) : historyError ? (
            <div className="error-message">
              <AlertCircle size={18} strokeWidth={1.5} />
              <span>{historyError}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} strokeWidth={1.5} className="empty-icon" />
              <h3>No prescriptions yet</h3>
              <p>You haven't submitted any prescriptions yet</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((record) => (
                <div key={record.id} className="history-item">
                  <div className="history-item-header">
                    <div className="history-info">
                      <div className="history-date">
                        <Calendar size={16} strokeWidth={1.5} />
                        <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className={`status-badge status-${normalizeStatus(record.status)}`}>
                        {normalizeStatus(record.status)}
                      </span>
                    </div>
                    <div className="history-token">Token #{record.tokenNumber || '-'}</div>
                  </div>
                  
                  <div className="history-item-content">
                    <div className="history-details">
                      <div className="detail-item">
                        <span>Medicines</span>
                        <span>{Array.isArray(record.medicines) ? record.medicines.length : 0}</span>
                      </div>
                      <div className="detail-item">
                        <span>Amount</span>
                        <span>₹{Number(record.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {Array.isArray(record.medicines) && record.medicines.length > 0 && (
                      <div className="medicines-preview">
                        {record.medicines.slice(0, 3).map((medicine, index) => (
                          <span key={index} className="medicine-tag">
                            {medicine?.name || medicine?.medicine || 'Medicine'}
                          </span>
                        ))}
                        {record.medicines.length > 3 && (
                          <span className="medicine-more">+{record.medicines.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
