import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { PrescriptionProvider } from './context/PrescriptionContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import PatientLogin from './pages/PatientLogin.jsx';
import PatientSignup from './pages/PatientSignup.jsx';
import PharmacistLogin from './pages/PharmacistLogin.jsx';
import PatientPortal from './pages/PatientPortal.jsx';
import PatientHistory from './pages/PatientHistory.jsx';
import PharmacistDashboard from './pages/PharmacistDashboard.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PrescriptionProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/patient/signup" element={<PatientSignup />} />
            <Route path="/pharmacist/login" element={<PharmacistLogin />} />
            <Route
              path="/patient/portal"
              element={(
                <ProtectedRoute requiredRole="patient">
                  <PatientPortal />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/patient/history"
              element={(
                <ProtectedRoute requiredRole="patient">
                  <PatientHistory />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/pharmacist/dashboard"
              element={(
                <ProtectedRoute requiredRole="pharmacist">
                  <PharmacistDashboard />
                </ProtectedRoute>
              )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PrescriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
