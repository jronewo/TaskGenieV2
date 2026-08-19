import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "./authApi";
import { setAccessToken, setUnauthorizedHandler } from "../services/apiClient";
import { AuthResponseDto, AuthSession, AuthUser } from "./types";

// The refresh token is long-lived, so the session lives in localStorage and survives a browser
// restart; the short-lived access token is exchanged for a fresh one on boot. Rotation with
// server-side reuse detection is what makes persisting it safe (see PROD-0101).
const STORAGE_KEY = "taskgenie.auth.session";
const MAX_TIMEOUT_MS = 2 ** 31 - 1; // setTimeout delay is a signed 32-bit int.
const REFRESH_SKEW_MS = 60_000; // renew a minute early instead of waiting for a 401.

function toSession(dto: AuthResponseDto): AuthSession {
  const user: AuthUser = {
    userId: dto.userId,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    avatar: dto.avatar,
    isFirstLogin: dto.isFirstLogin,
    isOrgOwner: dto.isOrgOwner,
  };
  return {
    user,
    accessToken: dto.accessToken,
    expiresAtUtc: dto.expiresAtUtc,
    refreshToken: dto.refreshToken,
    refreshTokenExpiresAtUtc: dto.refreshTokenExpiresAtUtc,
  };
}

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.refreshToken || !session?.refreshTokenExpiresAtUtc) return null;
    // Only the refresh token's lifetime decides whether a session is recoverable.
    if (new Date(session.refreshTokenExpiresAtUtc).getTime() <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  /** Current bearer token, for transports that cannot use the shared api client (SignalR). */
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Mirrors `session` for callbacks that must not close over stale state.
  const sessionRef = useRef<AuthSession | null>(null);
  // Guarantees concurrent 401s/expiries trigger exactly one refresh; everyone else awaits it.
  const refreshInFlight = useRef<Promise<AuthSession | null> | null>(null);

  const applySession = useCallback((next: AuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
    setAccessToken(next?.accessToken ?? null);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthSession | null> => {
    const current = sessionRef.current;
    if (!current?.refreshToken) return null;
    if (refreshInFlight.current) return refreshInFlight.current;

    refreshInFlight.current = (async () => {
      try {
        const next = toSession(await authApi.refresh(current.refreshToken));
        applySession(next);
        return next;
      } catch {
        // Expired, or reuse detection revoked the family — the session is unrecoverable.
        applySession(null);
        return null;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  }, [applySession]);

  // Boot: restore the stored session, exchange the refresh token for a fresh access token, then
  // confirm identity via /auth/me so a server-side role change is reflected after reload.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const restored = readStoredSession();
      if (!restored) {
        localStorage.removeItem(STORAGE_KEY);
        if (!cancelled) setIsReady(true);
        return;
      }

      applySession(restored);
      const refreshed = await refreshSession();

      if (refreshed && !cancelled) {
        try {
          const me = await authApi.me();
          if (!cancelled) {
            applySession({
              ...refreshed,
              user: {
                ...refreshed.user,
                name: me.name,
                email: me.email,
                role: me.role,
                avatar: me.avatar,
                isOrgOwner: me.isOrgOwner,
              },
            });
          }
        } catch {
          if (!cancelled) applySession(null);
        }
      }

      if (!cancelled) setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [applySession, refreshSession]);

  // A 401 on an authenticated call means the access token lapsed between renewals — attempt one
  // refresh rather than bouncing the user straight to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void refreshSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [refreshSession]);

  // Proactively renew shortly before the access token expires.
  useEffect(() => {
    if (!session) return;
    const msUntilRenew = new Date(session.expiresAtUtc).getTime() - Date.now() - REFRESH_SKEW_MS;
    const delay = Math.min(Math.max(msUntilRenew, 0), MAX_TIMEOUT_MS);
    const timer = window.setTimeout(() => void refreshSession(), delay);
    return () => window.clearTimeout(timer);
  }, [session, refreshSession]);

  const login = async (email: string, password: string) => {
    const next = toSession(await authApi.login(email, password));
    applySession(next);
    return next.user;
  };

  const register = async (name: string, email: string, password: string) => {
    const next = toSession(await authApi.register(name, email, password));
    applySession(next);
    return next.user;
  };

  const loginWithGoogle = async (idToken: string) => {
    const next = toSession(await authApi.loginWithGoogle(idToken));
    applySession(next);
    return next.user;
  };

  const logout = async () => {
    const current = sessionRef.current;
    try {
      if (current) await authApi.logout(current.refreshToken);
    } catch {
      // Best-effort server-side revocation; the local session is cleared regardless.
    } finally {
      applySession(null);
    }
  };

  /** Re-reads /auth/me — call after anything that can change role or organization ownership. */
  const refreshUser = useCallback(async () => {
    if (!sessionRef.current) return;
    try {
      const me = await authApi.me();
      const current = sessionRef.current;
      if (!current) return;
      applySession({
        ...current,
        user: {
          ...current.user,
          name: me.name,
          email: me.email,
          role: me.role,
          avatar: me.avatar,
          isOrgOwner: me.isOrgOwner,
        },
      });
    } catch {
      // Non-fatal; the next authenticated call surfaces the real problem.
    }
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      // Exposed for the SignalR handshake, which cannot go through apiClient's interceptor.
      accessToken: session?.accessToken ?? null,
      isAuthenticated: !!session,
      isReady,
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [session, isReady, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
