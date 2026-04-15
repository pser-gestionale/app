import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AccessLog } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('pser_current_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('pser_current_user', JSON.stringify(userData));
    const storedLog = localStorage.getItem('pser_access_log');
    const log: AccessLog[] = storedLog ? JSON.parse(storedLog) : [];
    log.unshift({
      user: userData.username,
      role: userData.role,
      nome: userData.nome,
      ts: new Date().toLocaleString('it-IT')
    });
    localStorage.setItem('pser_access_log', JSON.stringify(log.slice(0, 50)));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pser_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
