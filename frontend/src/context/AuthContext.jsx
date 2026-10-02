import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('libraflow_token');
      if (token) {
        try {
          const res = await api.getProfile();
          if (res.success && res.data) {
            setUser(res.data);
          } else {
            localStorage.removeItem('libraflow_token');
          }
        } catch (err) {
          console.error('Session restore failed:', err.message);
          localStorage.removeItem('libraflow_token');
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (identifier, password) => {
    const res = await api.login({ identifier, password });
    if (res.success && res.data) {
      localStorage.setItem('libraflow_token', res.data.accessToken);
      setUser(res.data.user);
      return res.data.user;
    }
  };

  const logout = () => {
    localStorage.removeItem('libraflow_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
