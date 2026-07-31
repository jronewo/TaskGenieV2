import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authApi, configureAuth, type AuthResponse } from '../api';
import * as storage from '../utils/secureStorage';

const SESSION_KEY = 'taskgenie.session';

export interface Session {
  userId: number;
  name: string | null;
  email: string | null;
  role: string;
  accessToken: string;
  expiresAtUtc: string;
}

interface AuthContextValue {
  session: Session | null;
  /** True until the persisted session has been read from secure storage. */
  isRestoring: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(response: AuthResponse): Session {
  return {
    userId: response.userId,
    name: response.name,
    email: response.email,
    role: response.role,
    accessToken: response.accessToken,
    expiresAtUtc: response.expiresAtUtc,
  };
}

function isExpired(session: Session): boolean {
  const expiry = new Date(session.expiresAtUtc).getTime();
  return Number.isNaN(expiry) || expiry <= Date.now();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // The API client reads the token synchronously on every request, so keep a
  // ref alongside state to avoid a stale closure between renders.
  const tokenRef = useRef<string | null>(null);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setSession(null);
    void storage.removeItem(SESSION_KEY);
  }, []);

  const applySession = useCallback(async (next: Session) => {
    tokenRef.current = next.accessToken;
    setSession(next);
    await storage.setItem(SESSION_KEY, JSON.stringify(next));
  }, []);

  // Register the token provider before anything can issue a request.
  useEffect(() => {
    configureAuth(() => tokenRef.current, clearSession);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const raw = await storage.getItem(SESSION_KEY);
      if (cancelled) return;

      if (raw) {
        try {
          const stored = JSON.parse(raw) as Session;
          // The API issues short-lived tokens with no refresh endpoint, so an
          // expired session means the user has to sign in again.
          if (stored.accessToken && !isExpired(stored)) {
            tokenRef.current = stored.accessToken;
            setSession(stored);
          } else {
            await storage.removeItem(SESSION_KEY);
          }
        } catch {
          await storage.removeItem(SESSION_KEY);
        }
      }

      if (!cancelled) setIsRestoring(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await applySession(toSession(await authApi.login(email.trim(), password)));
    },
    [applySession],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await applySession(toSession(await authApi.register(name.trim(), email.trim(), password)));
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    try {
      // Best-effort: revokes the token's jti server-side.
      if (tokenRef.current) await authApi.logout();
    } catch {
      // Signing out locally matters more than the server acknowledging it.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isRestoring,
      isAuthenticated: session !== null,
      signIn,
      signUp,
      signOut,
    }),
    [session, isRestoring, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}

/** Convenience for screens that only render behind the auth gate. */
export function useCurrentUser(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('useCurrentUser called outside an authenticated screen');
  return session;
}
