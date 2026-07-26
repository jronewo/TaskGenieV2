import { api, clearStoredToken, setStoredToken } from "../lib/apiClient";
import type { AuthResponse, AuthUser } from "../types/api";

const AUTH_USER_KEY = "authUser";

function toAuthUser(data: AuthResponse): AuthUser {
  return {
    userId: data.userId,
    name: data.name,
    email: data.email,
    role: data.role,
    isFirstLogin: data.isFirstLogin,
    isOrgOwner: data.isOrgOwner,
    accessToken: data.accessToken,
    expiresAtUtc: data.expiresAtUtc,
  };
}

function clearAuthUser() {
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function clearSession() {
  clearStoredToken();
  clearAuthUser();
}

function saveSession(user: AuthUser, remember: boolean) {
  clearSession();
  setStoredToken(user.accessToken, remember);
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function loadStoredUser(): AuthUser | null {
  for (const storage of [sessionStorage, localStorage]) {
    const raw = storage.getItem(AUTH_USER_KEY);
    const token = storage.getItem("accessToken");
    if (!raw || !token) continue;

    try {
      const user = JSON.parse(raw) as AuthUser;
      const expiresAt = new Date(user.expiresAtUtc).getTime();
      if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) continue;
      return { ...user, accessToken: token };
    } catch {
      continue;
    }
  }

  clearSession();
  return null;
}

export async function login(
  email: string,
  password: string,
  remember = false
): Promise<AuthUser> {
  const data = await api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const user = toAuthUser(data);
  saveSession(user, remember);
  return user;
}

export async function register(
  name: string,
  email: string,
  password: string,
  remember = false
): Promise<AuthUser> {
  const data = await api<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  const user = toAuthUser(data);
  saveSession(user, remember);
  return user;
}

export async function loginWithGoogle(idToken: string, remember = true): Promise<AuthUser> {
  const data = await api<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  const user = toAuthUser(data);
  saveSession(user, remember);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await api<{ message: string }>("/auth/logout", { method: "POST" });
  } catch {
    // Server logout is best-effort; always clear local session.
  } finally {
    clearSession();
  }
}
