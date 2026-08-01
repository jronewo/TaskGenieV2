import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "./authApi";
import { setAccessToken, setUnauthorizedHandler } from "../services/apiClient";
import { AuthResponseDto, AuthSession, AuthUser } from "./types";

// KNOWN PRODUCTION BLOCKER: the backend has no persistent/rotating refresh token yet
// (PROD-0101, CLAUDE.md scope item 4 — not implemented in this phase). Until it exists:
//  - the access token lives only in sessionStorage (cleared when the tab closes), not
//    localStorage, so a stolen/leaked token doesn't outlive the browser tab;
//  - there is no silent refresh — once the token in `expiresAtUtc` expires, the user is
//    logged out client-side and must sign in again;
//  - server-side revocation (e.g. logout from another tab) is only detected on the next
//    authenticated API call that comes back 401 (see setUnauthorizedHandler below).
const STORAGE_KEY = "taskgenie.auth.session";
const MAX_TIMEOUT_MS = 2 ** 31 - 1; // setTimeout delay is a signed 32-bit int.

function toSession(dto: AuthResponseDto): AuthSession {
  const user: AuthUser = {
    userId: dto.userId,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    isFirstLogin: dto.isFirstLogin,
    isOrgOwner: dto.isOrgOwner,
  };
  return { user, accessToken: dto.accessToken, expiresAtUtc: dto.expiresAtUtc };
}

function isExpired(session: AuthSession): boolean {
  return new Date(session.expiresAtUtc).getTime() <= Date.now();
}

function readStoredSession(): AuthSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.accessToken || !session?.expiresAtUtc) return null;
    if (isExpired(session)) return null;
    return session;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  const applySession = (next: AuthSession | null) => {
    setSession(next);
    setAccessToken(next?.accessToken ?? null);
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    const restored = readStoredSession();
    if (restored) applySession(restored);
    else sessionStorage.removeItem(STORAGE_KEY);
    setIsReady(true);
  }, []);

  useEffect(() => {
    // The backend has no /auth/refresh yet, so a rejected authenticated request
    // means the session is no longer valid — clear it and return to the login screen.
    setUnauthorizedHandler(() => applySession(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    // No refresh token exists yet: proactively log out once the access token expires,
    // instead of leaving the UI showing an "authenticated" state that the API would reject.
    if (!session) return;
    const delay = Math.min(new Date(session.expiresAtUtc).getTime() - Date.now(), MAX_TIMEOUT_MS);
    if (delay <= 0) {
      applySession(null);
      return;
    }
    const timer = window.setTimeout(() => applySession(null), delay);
    return () => window.clearTimeout(timer);
  }, [session]);

  const login = async (email: string, password: string) => {
    const dto = await authApi.login(email, password);
    const next = toSession(dto);
    applySession(next);
    return next.user;
  };

  const register = async (name: string, email: string, password: string) => {
    const dto = await authApi.register(name, email, password);
    const next = toSession(dto);
    applySession(next);
    return next.user;
  };

  const loginWithGoogle = async (idToken: string) => {
    const dto = await authApi.loginWithGoogle(idToken);
    const next = toSession(dto);
    applySession(next);
    return next.user;
  };

  const logout = async () => {
    try {
      if (session) await authApi.logout();
    } catch {
      // Best-effort server-side revocation; the local session is cleared regardless.
    } finally {
      applySession(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isReady,
      login,
      register,
      loginWithGoogle,
      logout,
    }),
    [session, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
