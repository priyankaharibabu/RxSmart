import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5001', []);

  const supabase = useMemo(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return null;
    }

    return createClient(url, anonKey);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        } else {
          localStorage.removeItem('token');
        }
      } catch (authErr) {
        console.error('Failed to restore auth:', authErr);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [apiBase]);

  const signup = async (name, email, phone, password, role = 'patient') => {
    try {
      setError(null);
      const response = await fetch(`${apiBase}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, role }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Signup failed');
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      if (supabase && data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }

      setUser(data.user || null);
      return data;
    } catch (signupErr) {
      setError(signupErr.message);
      throw signupErr;
    }
  };

  const login = async (email, password, role) => {
    try {
      setError(null);
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      if (role && data.user?.role !== role) {
        throw new Error(`This account is not authorized as ${role}.`);
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      if (supabase && data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }

      setUser(data.user);
      return data;
    } catch (loginErr) {
      setError(loginErr.message);
      throw loginErr;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
      });
      localStorage.removeItem('token');
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      window.location.href = '/';
    } catch (logoutErr) {
      console.error('Logout error:', logoutErr);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
