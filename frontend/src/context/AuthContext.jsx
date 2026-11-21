import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('smart_print_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('smart_print_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleExpiredSession = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('smart-print:session-expired', handleExpiredSession);
    const verifyUser = async () => {
      const savedToken = localStorage.getItem('smart_print_token');
      if (savedToken) {
        try {
          const res = await authService.getMe();
          if (res.data.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('smart_print_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session expired or invalid token:', err.response?.data?.message || err.message);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
    return () => window.removeEventListener('smart-print:session-expired', handleExpiredSession);
  }, []);

  const login = async (email, password, role) => {
    const res = await authService.login({ email, password, role });
    if (res.data.success) {
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('smart_print_token', newToken);
      localStorage.setItem('smart_print_user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    return { success: false, message: res.data.message };
  };

  const register = async (studentData) => {
    const res = await authService.register(studentData);
    if (res.data.success) {
      return { success: true, message: res.data.message };
    }
    return { success: false, message: res.data.message };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('smart_print_token');
    localStorage.removeItem('smart_print_user');
    authService.logout();
  };

  const isStudent = user?.role === 'student';
  const isStaff = user?.role === 'staff';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
        isStudent,
        isStaff,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
