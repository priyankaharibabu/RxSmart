import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Mail, Lock, Pill, ArrowLeft } from 'lucide-react';
import '../styles/Auth.css';

export default function PatientLogin() {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password, 'patient');
      navigate('/patient/portal');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background"></div>
      <div className="auth-container">
        <div className="auth-card">
          {/* RxSmart Logo */}
          <div className="auth-logo">
            <Pill size={48} strokeWidth={1.5} className="logo-icon" />
            <h1 className="logo-text">RxSmart</h1>
            <p className="logo-tagline">Smart Prescription Management</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-header">
              <h2>Patient Login</h2>
              <p>Access your prescription portal</p>
            </div>

            {/* Error Display */}
            {(error || authError) && (
              <div className="error-card">
                <span>{error || authError}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="input-wrapper">
                <Mail size={18} strokeWidth={1.5} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="patient@example.com"
                  className="auth-input"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock size={18} strokeWidth={1.5} className="input-icon" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  className="auth-input"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="btn-spinner" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/patient/signup" className="auth-link">
                Sign up
              </Link>
            </p>
            <Link to="/" className="back-link">
              <ArrowLeft size={16} strokeWidth={1.5} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
