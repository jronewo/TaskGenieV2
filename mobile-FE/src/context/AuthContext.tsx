import React, { createContext, useContext, useState } from 'react';

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  initials: string;
  role: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<CurrentUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(part => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  // Mock auth — no backend call yet. Any non-empty email/password succeeds.
  const login: AuthContextValue['login'] = async (email, password) => {
    if (!email.trim() || !password.trim()) {
      throw new Error('Vui lòng nhập đầy đủ email và mật khẩu.');
    }
    const name = email.split('@')[0].replace(/[._]/g, ' ');
    setUser({
      id: 1,
      name: name.replace(/\b\w/g, c => c.toUpperCase()) || 'Sarah Chen',
      email,
      initials: initialsFromName(name) || 'SC',
      role: 'Senior Engineer · Project Phoenix',
    });
  };

  const register: AuthContextValue['register'] = async (name, email, password) => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      throw new Error('Vui lòng nhập đầy đủ thông tin.');
    }
    setUser({
      id: 1,
      name,
      email,
      initials: initialsFromName(name) || 'U',
      role: 'Team Member',
    });
  };

  const loginWithGoogle: AuthContextValue['loginWithGoogle'] = async () => {
    setUser({
      id: 1,
      name: 'Sarah Chen',
      email: 'sarah@company.com',
      initials: 'SC',
      role: 'Senior Engineer · Project Phoenix',
    });
  };

  const logout = () => setUser(null);

  const updateUser: AuthContextValue['updateUser'] = (patch) => {
    setUser(prev => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
