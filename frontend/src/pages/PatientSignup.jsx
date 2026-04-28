import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { UserPlus, User, Mail, Lock, Phone, Pill, ArrowLeft } from 'lucide-react';
import '../styles/Auth.css';

export default function PatientSignup() {
  const navigate = useNavigate();
  const { signup, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await signup(formData.name, formData.email, formData.phone, formData.password, 'patient');
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

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-header">
              <h2>Patient Sign Up</h2>
              <p>Create your account</p>
            </div>

            {/* Error Display */}
            {(error || authError) && (
              <div className="error-card">
                <span>{error || authError}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div className="input-wrapper">
                <User size={18} strokeWidth={1.5} className="input-icon" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="auth-input"
                />
              </div>
            </div>

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

            {/* Phone Input */}
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <div className="input-wrapper">
                <Phone size={18} strokeWidth={1.5} className="input-icon" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+91 98765 43210"
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
                  placeholder="Create a password"
                  className="auth-input"
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} strokeWidth={1.5} className="input-icon" />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  className="auth-input"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="btn-spinner" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Sign Up</span>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/patient/login" className="auth-link">
                Login
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
