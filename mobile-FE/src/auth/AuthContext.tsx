import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { setAccessToken, setRefreshToken, setTokenRefreshedHandler, setUnauthorizedHandler } from '../api/client';
import { clearSession, readSession, StoredSession, StoredUser, writeSession } from '../api/session';

interface AuthState {
  user: StoredUser | null;
  /** Needed by the SignalR connection, which authenticates with the same bearer token. */
  accessToken: string | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads /auth/me after a profile change so every screen shows the new name and avatar. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = (): AuthState => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
};

function toSession(dto: any): StoredSession {
  return {
    user: {
      userId: dto.userId,
      name: dto.name ?? null,
      email: dto.email ?? null,
      role: dto.role ?? 'NORMAL_USER',
      avatar: dto.avatar ?? null,
      isOrgOwner: !!dto.isOrgOwner,
    },
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
    expiresAtUtc: dto.expiresAtUtc,
  };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isReady, setReady] = useState(false);

  const signOut = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    setToken(null);
    setUser(null);
    await clearSession();
  }, []);

  // A token the server no longer accepts, even after a silent refresh attempt, must end the
  // session — otherwise the app is left showing the same 401 error on every screen forever.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // A 401 that the client silently recovered from by rotating the refresh token still needs its
  // new token pair written to disk — otherwise the very next app launch presents the old,
  // already-rotated refresh token and gets treated as reuse.
  useEffect(() => {
    setTokenRefreshedHandler((newAccessToken, newRefreshToken, expiresAtUtc) => {
      setToken(newAccessToken);
      void readSession().then((stored) => {
        if (!stored) return;
        void writeSession({ ...stored, accessToken: newAccessToken, refreshToken: newRefreshToken, expiresAtUtc });
      });
    });
    return () => setTokenRefreshedHandler(null);
  }, []);

  useEffect(() => {
    void (async () => {
      const stored = await readSession();
      if (stored) {
        setAccessToken(stored.accessToken);
        setRefreshToken(stored.refreshToken);
        setToken(stored.accessToken);
        setUser(stored.user);
        // The stored copy goes stale (name, avatar, role); /auth/me is the authority.
        try {
          const me = await authApi.me();
          setUser((current) =>
            current ? { ...current, name: me.name, avatar: me.avatar ?? null, role: me.role } : current
          );
        } catch {
          // An offline launch keeps the stored identity; a genuinely bad token trips the 401 handler.
        }
      }
      setReady(true);
    })();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser((current) =>
        current ? { ...current, name: me.name, avatar: me.avatar ?? null, role: me.role } : current
      );
      const stored = await readSession();
      if (stored) {
        await writeSession({
          ...stored,
          user: { ...stored.user, name: me.name, avatar: me.avatar ?? null, role: me.role },
        });
      }
    } catch {
      // A failed refresh leaves the previous identity in place rather than blanking the profile.
    }
  }, []);

  const establish = async (dto: any) => {
    const session = toSession(dto);
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setToken(session.accessToken);
    setUser(session.user);
    await writeSession(session);
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      isReady,
      signIn: async (email, password) => establish(await authApi.login(email, password)),
      signUp: async (name, email, password) => establish(await authApi.register(name, email, password)),
      signInWithGoogle: async (idToken) => establish(await authApi.google(idToken)),
      signOut,
      refreshUser,
    }),
    [user, accessToken, isReady, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
