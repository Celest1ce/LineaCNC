import React, { createContext, useState, useEffect } from 'react';
import { User } from '../types';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string, preferredLanguage?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string>('');

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      const data = await response.json();
      setCsrfToken(data.csrfToken);
    } catch (error) {
      logger.error('Failed to fetch CSRF token', error);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else {
        // 401 est normal si l'utilisateur n'est pas connecté, pas besoin de logger
        setUser(null);
      }
    } catch (error) {
      // Ne logger que les vraies erreurs (network errors, etc.)
      // Pas les 401 qui sont normales
      if (error instanceof Error && !error.message.includes('401')) {
        logger.error('Auth check failed', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    await fetchCsrfToken();

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.data.user);
  };

  const register = async (email: string, password: string, displayName?: string, preferredLanguage?: string) => {
    await fetchCsrfToken();

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, displayName, preferredLanguage })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.data.user);
  };

  const logout = async () => {
    await fetchCsrfToken();

    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'CSRF-Token': csrfToken
      },
      credentials: 'include'
    });

    if (response.ok) {
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchCsrfToken();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
