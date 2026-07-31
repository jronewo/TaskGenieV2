import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setAccessToken, setUnauthorizedHandler } from "../api/client";
import { AuthResponse } from "../../features/auth/types";

export interface AuthUser {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  isFirstLogin: boolean;
  isOrgOwner: boolean;
}

interface StoredAuth {
  user: AuthUser;
  accessToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loginWithResponse: (response: AuthResponse) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
}

const STORAGE_KEY = "taskgenie.auth";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setUser(stored.user);
      setAccessToken(stored.accessToken);
    }
    setIsInitializing(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const loginWithResponse = useCallback((response: AuthResponse) => {
    const nextUser: AuthUser = {
      userId: response.userId,
      name: response.name,
      email: response.email,
      role: response.role,
      isFirstLogin: response.isFirstLogin,
      isOrgOwner: response.isOrgOwner,
    };
    setUser(nextUser);
    setAccessToken(response.accessToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, accessToken: response.accessToken }));
  }, []);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      const stored = readStoredAuth();
      if (stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, user: next }));
      }
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isInitializing, loginWithResponse, updateUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
