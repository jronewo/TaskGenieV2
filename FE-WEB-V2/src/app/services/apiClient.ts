const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5258/api").replace(/\/$/, "");

const AUTH_STORAGE_KEY = "tmai_auth";

export interface StoredAuth {
  userId: number;
  name: string;
  email: string;
  role: string;
  accessToken: string;
  expiresAtUtc: string;
}

export function getStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth | null) {
  if (auth) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_STORAGE_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  if (!payload) return `Request failed (${response.status}).`;
  if (payload.message) return payload.message as string;
  if (payload.errors) {
    const firstField = Object.values(payload.errors as Record<string, string[]>)[0];
    if (firstField?.length) return firstField[0];
  }
  return payload.title ?? `Request failed (${response.status}).`;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = getStoredAuth();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    setStoredAuth(null);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
