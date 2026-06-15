import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fetchMe, logoutRequest } from '../services/auth.service.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const hasSyncedRef = useRef(false);

  const isAuthCallback = window.location.pathname === "/auth/callback";

  useEffect(() => {
    let isMounted = true;

    if (isAuthCallback) {
      setInitializing(false);
      return;
    }

    fetchMe()
      .then(async (data) => {
        if (!isMounted) return;
        setUser(data.user);

        if (!hasSyncedRef.current) {
          hasSyncedRef.current = true;
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setInitializing(false);
      });

    return () => {
      isMounted = false;
    };
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
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};