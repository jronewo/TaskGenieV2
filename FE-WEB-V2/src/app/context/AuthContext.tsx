import React, { createContext, useContext, useState } from "react";
import { authApi } from "../services/authApi";
import { getStoredAuth, setStoredAuth, StoredAuth } from "../services/apiClient";

export interface CurrentUser {
  userId: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(stored: StoredAuth): CurrentUser {
  return { userId: stored.userId, name: stored.name, email: stored.email, role: stored.role };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const stored = getStoredAuth();
    return stored ? toUser(stored) : null;
  });

  const login: AuthContextValue["login"] = async (email, password) => {
    const response = await authApi.login(email, password);
    setStoredAuth(response);
    setUser(toUser(response));
  };

  const register: AuthContextValue["register"] = async (name, email, password) => {
    const response = await authApi.register(name, email, password);
    setStoredAuth(response);
    setUser(toUser(response));
  };

  const logout: AuthContextValue["logout"] = async () => {
    try {
      await authApi.logout();
    } catch {
      // Token may already be expired/invalid — clear local state regardless.
    }
    setStoredAuth(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
