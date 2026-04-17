import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchMe, logoutRequest } from '../services/auth.service.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setInitializing(false);
      });
  }, []);

  const refreshSession = async () => {
    try {
      const data = await fetchMe();
      setUser(data.user);
      return data.user;
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore backend errors on logout
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    initializing,
    isAuthenticated: !!user,
    refreshSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

