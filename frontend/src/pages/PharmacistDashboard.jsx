import React, { useMemo, useState, useEffect } from 'react';
import { ClipboardList, Upload, FileText, Clock, CheckCircle, Users, DollarSign, Package, LogOut, Mail, AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';
import '../styles/PharmacistDashboard.css';

function normalizedStatus(status) {
  return String(status || '').toLowerCase() === 'served' ? 'served' : 'pending';
}

export default function PharmacistDashboard() {
  const { user, logout } = useAuth();
  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5001', []);
  const [activeTab, setActiveTab] = useState('upload');
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadMode, setUploadMode] = useState('upload');
  const [patientEmail, setPatientEmail] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pipelineFinished, setPipelineFinished] = useState(false);
  const [billResult, setBillResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [todayStats, setTodayStats] = useState({ pending: 0, served: 0, total: 0, revenue: 0 });

  useEffect(() => {
    loadPrescriptions();
    loadTodayStats();
    const interval = setInterval(() => {
      loadPrescriptions();
      loadTodayStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [apiBase]);

  async function loadTodayStats() {
    try {
      const res = await axios.get(`${apiBase}/api/prescription/today-stats`);
      const stats = res.data?.stats || {};
      setTodayStats({
        pending: Number(stats.pending || 0),
        served: Number(stats.served || 0),
        total: Number(stats.total || 0),
        revenue: Number(stats.revenue || 0)
      });
    } catch (err) {
      console.error('Error loading today stats:', err);
    }
  }

  async function loadPrescriptions() {
    try {
      const res = await axios.get(`${apiBase}/api/prescription/queue`);
      setPrescriptions(res.data.prescriptions || []);
      setError(null);
    } catch (err) {
      console.error('Error loading prescriptions:', err);
      setError('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkServed(prescriptionId) {
    try {
      await axios.patch(`${apiBase}/api/prescription/${prescriptionId}/mark-served`);
      await loadPrescriptions();
    } catch (err) {
      alert('Failed to mark as served: ' + (err.response?.data?.error || err.message));
    }
  }

  async function handlePipelineSubmit() {
    setSubmitError('');
    setPipelineFinished(false);
    setBillResult(null);

    if (!patientEmail.trim()) {
      setSubmitError('Patient email is required.');
      return;
    }

    if (uploadMode === 'upload' && !selectedFile) {
      setSubmitError('Please choose a prescription image.');
      return;
    }

    if (uploadMode === 'text' && !rawText.trim()) {
      setSubmitError('Please type/paste prescription text.');
      return;
    }

    setSubmitting(true);
    try {
      let response;
      if (uploadMode === 'upload') {
        const formData = new FormData();
        formData.append('prescription', selectedFile);
        formData.append('patientEmail', patientEmail.trim());
        response = await axios.post(`${apiBase}/api/prescription/process`, formData);
      } else {
        response = await axios.post(`${apiBase}/api/prescription/process-text`, {
          rawText,
          patientEmail: patientEmail.trim()
        });
      }

      setBillResult(response.data?.results?.bill || null);
      setPipelineFinished(true);
      await loadPrescriptions();
      setActiveTab('dashboard');
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.message || 'Pipeline failed');
    } finally {
      setSubmitting(false);
    }
  }

  const pendingPrescriptions = prescriptions.filter((item) => normalizedStatus(item.status) === 'pending');
  const servedPrescriptions = prescriptions.filter((item) => normalizedStatus(item.status) === 'served');
  const totalRevenue = servedPrescriptions.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  return (
    <div className="pharmacist-dashboard">
      {/* Header Bar */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="logo-section">
            <h1 className="logo-text">RxSmart</h1>
            <span className="dashboard-subtitle">Pharmacy Dashboard</span>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span>{user?.name || 'Pharmacist'}</span>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Separator Line */}
      <div className="header-separator"></div>

      {/* Main Content Container */}
      <div className="main-container">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} 
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={18} strokeWidth={1.5} />
            <span>Upload Prescription</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`} 
            onClick={() => setActiveTab('queue')}
          >
            <ClipboardList size={18} strokeWidth={1.5} />
            <span>Queue</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setActiveTab('dashboard')}
          >
            <TrendingUp size={18} strokeWidth={1.5} />
            <span>Dashboard</span>
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className="upload-card">
            <div className="card-header">
              <h2>Upload Prescription</h2>
              <p>Process digital prescriptions for your patients</p>
            </div>

            {/* Patient Email Input */}
            <div className="input-group">
              <label className="input-label">
                <Mail size={18} strokeWidth={1.5} />
                Patient Email
              </label>
              <input 
                className="field-input" 
                type="email" 
                value={patientEmail} 
                onChange={(e) => setPatientEmail(e.target.value)} 
                placeholder="patient@example.com" 
              />
            </div>

            {/* Mode Selection */}
            <div className="mode-selector">
              <button 
                className={`mode-btn ${uploadMode === 'upload' ? 'active' : ''}`} 
                onClick={() => setUploadMode('upload')}
              >
                <Upload size={18} strokeWidth={1.5} />
                <span>Upload Image</span>
              </button>
              <button 
                className={`mode-btn ${uploadMode === 'text' ? 'active' : ''}`} 
                onClick={() => setUploadMode('text')}
              >
                <FileText size={18} strokeWidth={1.5} />
                <span>Type Text</span>
              </button>
            </div>

            {/* Upload/Text Input */}
            {uploadMode === 'upload' ? (
              <div className="upload-area">
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                  className="file-input"
                />
                <div className="upload-content">
                  <Upload size={48} strokeWidth={1.5} className="upload-icon" />
                  <p className="upload-text">
                    {selectedFile ? selectedFile.name : 'Drop prescription image here'}
                  </p>
                  <p className="upload-subtext">or click to browse files</p>
                </div>
              </div>
            ) : (
              <div className="text-area">
                <textarea 
                  className="text-input" 
                  value={rawText} 
                  onChange={(e) => setRawText(e.target.value)} 
                  placeholder="Type or paste prescription details here..."
                  rows={8}
                />
              </div>
            )}

            {/* Error Display */}
            {submitError && (
              <div className="error-message">
                <AlertCircle size={18} strokeWidth={1.5} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button 
              className="submit-btn" 
              onClick={handlePipelineSubmit} 
              disabled={submitting}
            >
              {submitting ? (
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

            {/* Bill Result */}
            {pipelineFinished && billResult && (
              <div className="bill-result">
                <h3>Processing Complete</h3>
                <div className="bill-details">
                  <div className="bill-row">
                    <span>Token Number</span>
                    <span>#{billResult.tokenNumber || '-'}</span>
                  </div>
                  <div className="bill-row">
                    <span>Medicines</span>
                    <span>{billResult.lineItems?.length || billResult.medicines?.length || 0}</span>
                  </div>
                  <div className="bill-row total">
                    <span>Total Amount</span>
                    <span>₹{Number(billResult.pricing?.grandTotal || billResult.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="queue-card">
            <div className="card-header">
              <h2>Prescription Queue</h2>
              <div className="queue-count">
                <span className="count-badge">{pendingPrescriptions.length}</span>
                <span>Waiting</span>
              </div>
            </div>

            {pendingPrescriptions.length === 0 && servedPrescriptions.length === 0 ? (
              <div className="empty-state">
                <ClipboardList size={48} strokeWidth={1.5} className="empty-icon" />
                <h3>No prescriptions in queue</h3>
                <p>Upload a prescription to get started</p>
              </div>
            ) : (
              <>
                {/* Pending Prescriptions */}
                {pendingPrescriptions.length > 0 && (
                  <div className="prescription-section">
                    <h3 className="section-title">Waiting Patients</h3>
                    <div className="prescriptions-list">
                      {pendingPrescriptions.map((rx) => (
                        <div key={rx.id} className="prescription-item pending">
                          <div className="prescription-header">
                            <div className="token-info">
                              <span className="token-number">#{rx.tokenNumber || '-'}</span>
                              <span className="patient-name">{rx.patientName}</span>
                            </div>
                            <div className="time-info">
                              <Calendar size={14} strokeWidth={1.5} />
                              <span>{new Date(rx.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="prescription-content">
                            <div className="medicines-section">
                              <span className="medicines-label">Medicines:</span>
                              <div className="medicines-tags">
                                {(rx.medicines || []).map((med, idx) => (
                                  <span key={idx} className="medicine-tag">{med.name || 'Medicine'}</span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="amount-section">
                              <span className="amount-label">Amount:</span>
                              <span className="amount-value">₹{Number(rx.totalAmount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <div className="prescription-action">
                            <button 
                              className="serve-btn" 
                              onClick={() => handleMarkServed(rx.id)}
                            >
                              <CheckCircle size={18} strokeWidth={1.5} />
                              Mark as Served
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Served Prescriptions */}
                {servedPrescriptions.length > 0 && (
                  <div className="prescription-section">
                    <h3 className="section-title">Served Patients</h3>
                    <div className="prescriptions-list">
                      {servedPrescriptions.map((rx) => (
                        <div key={rx.id} className="prescription-item served">
                          <div className="prescription-header">
                            <div className="token-info">
                              <span className="token-number">#{rx.tokenNumber || '-'}</span>
                              <span className="patient-name">{rx.patientName}</span>
                              <span className="served-badge">Served</span>
                            </div>
                            <div className="time-info">
                              <Calendar size={14} strokeWidth={1.5} />
                              <span>{new Date(rx.servedAt || rx.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="prescription-content">
                            <div className="amount-section">
                              <span className="amount-label">Amount:</span>
                              <span className="amount-value">₹{Number(rx.totalAmount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Analytics Dashboard</h2>
              <p>Today's performance metrics</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <Clock size={24} strokeWidth={1.5} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{todayStats.pending}</div>
                  <div className="stat-label">Pending</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <CheckCircle size={24} strokeWidth={1.5} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{todayStats.served}</div>
                  <div className="stat-label">Served Today</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <Package size={24} strokeWidth={1.5} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{todayStats.total}</div>
                  <div className="stat-label">Total</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <DollarSign size={24} strokeWidth={1.5} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">₹{Math.round(todayStats.revenue)}</div>
                  <div className="stat-label">Revenue</div>
                </div>
              </div>
            </div>

            {/* Recent Prescriptions Table */}
            <div className="table-section">
              <h3>Recent Prescriptions</h3>
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading prescriptions...</p>
                </div>
              ) : error ? (
                <div className="error-message">
                  <AlertCircle size={18} strokeWidth={1.5} />
                  <span>{error}</span>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="empty-state">
                  <ClipboardList size={48} strokeWidth={1.5} className="empty-icon" />
                  <h3>No prescriptions yet</h3>
                  <p>Start by uploading a prescription to see data here</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="prescriptions-table">
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Patient</th>
                        <th>Status</th>
                        <th>Medicines</th>
                        <th>Amount</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.slice(0, 5).map((rx) => (
                        <tr key={rx.id}>
                          <td>#{rx.tokenNumber || '-'}</td>
                          <td>{rx.patientName}</td>
                          <td>
                            <span className={`status-badge status-${normalizedStatus(rx.status)}`}>
                              {normalizedStatus(rx.status)}
                            </span>
                          </td>
                          <td>{rx.medicines?.length || 0}</td>
                          <td>₹{Number(rx.totalAmount || 0).toFixed(2)}</td>
                          <td>{new Date(rx.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
