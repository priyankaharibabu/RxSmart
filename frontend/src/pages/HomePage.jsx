import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, FileText, Upload, Eye, Package, User, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'pharmacist' ? '/pharmacist/dashboard' : '/patient/portal');
    }
  }, [user, navigate]);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">RxSmart</h1>
          <p className="hero-tagline">Smart Prescription Management for Modern Pharmacies</p>
          <div className="hero-buttons">
            <button 
              className="hero-btn hero-btn-patient"
              onClick={() => navigate('/patient/login')}
            >
              <User size={20} strokeWidth={1.5} />
              <span>I am a Patient</span>
            </button>
            <button 
              className="hero-btn hero-btn-pharmacist"
              onClick={() => navigate('/pharmacist/login')}
            >
              <Building2 size={20} strokeWidth={1.5} />
              <span>I am a Pharmacist</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <h2 className="section-title">Why Choose RxSmart?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <Shield size={32} strokeWidth={1.5} className="feature-icon" />
              <h3 className="feature-title">Secure & Private</h3>
              <p className="feature-description">Your data is protected with enterprise-grade security at all times</p>
            </div>
            <div className="feature-card">
              <Clock size={32} strokeWidth={1.5} className="feature-icon" />
              <h3 className="feature-title">Instant Processing</h3>
              <p className="feature-description">Get real-time updates and faster prescription processing</p>
            </div>
            <div className="feature-card">
              <FileText size={32} strokeWidth={1.5} className="feature-icon" />
              <h3 className="feature-title">Digital Records</h3>
              <p className="feature-description">Paperless billing and organized prescription history</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <Upload size={24} strokeWidth={1.5} className="step-icon" />
              <h3 className="step-title">Submit Prescription</h3>
              <p className="step-description">Upload image or type your prescription details</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <Eye size={24} strokeWidth={1.5} className="step-icon" />
              <h3 className="step-title">Pharmacist Reviews</h3>
              <p className="step-description">Expert verification by licensed pharmacists</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <Package size={24} strokeWidth={1.5} className="step-icon" />
              <h3 className="step-title">Collect Medicines</h3>
              <p className="step-description">Receive notification and collect your medicines</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <h3 className="footer-logo">RxSmart</h3>
          <p className="footer-tagline">Smart Prescription Management for Modern Pharmacies</p>
        </div>
      </footer>
    </div>
  );
}
