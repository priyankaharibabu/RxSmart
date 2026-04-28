import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/PatientHistory.css';

export default function PatientHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5001', []);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchHistory() {
      try {
        if (!user?.email) return;
        const res = await axios.get(`${apiBase}/api/prescription/history`, {
          params: { email: user.email }
        });
        setHistory(res.data?.history || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [apiBase, user?.email]);

  return (
    <div className="patient-history">
      <div className="history-header">
        <div>
          <h1>Prescription & Bill History</h1>
          <p>{user?.email}</p>
        </div>
        <button className="history-back" onClick={() => navigate('/patient/portal')}>Back to Portal</button>
      </div>

      {loading ? (
        <div className="history-card">Loading history...</div>
      ) : error ? (
        <div className="history-card error">{error}</div>
      ) : history.length === 0 ? (
        <div className="history-card">No prescriptions found yet.</div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-card">
              <div className="history-row">
                <span>Token</span>
                <strong>#{item.tokenNumber || '-'}</strong>
              </div>
              <div className="history-row">
                <span>Status</span>
                <strong className={`status-${item.status}`}>{item.status}</strong>
              </div>
              <div className="history-row">
                <span>Medicines</span>
                <strong>{item.medicines?.length || 0}</strong>
              </div>
              <div className="history-row total">
                <span>Total Bill</span>
                <strong>₹{Number(item.totalAmount || 0).toFixed(2)}</strong>
              </div>
              <div className="history-time">{new Date(item.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
