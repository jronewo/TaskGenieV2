import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshToken: string | null = null;
/** Called with the new token pair once a silent refresh succeeds, so the auth layer can persist it. */
let onTokenRefreshed: ((accessToken: string, refreshToken: string, expiresAtUtc: string) => void) | null = null;
/** At most one refresh in flight — the server rotates the token on use, so a second concurrent
 *  refresh with the same (now-stale) token would revoke the whole session instead of renewing it. */
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
}

/** Lets the auth layer sign the user out when refreshing doesn't save the session either. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/** Lets the auth layer persist the renewed token pair after a silent refresh. */
export function setTokenRefreshedHandler(
  handler: ((accessToken: string, refreshToken: string, expiresAtUtc: string) => void) | null
): void {
  onTokenRefreshed = handler;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.message ?? body?.error ?? body?.title ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

/**
 * Tries to trade the stored refresh token for a new access token. Concurrent 401s share one
 * in-flight attempt instead of each racing to rotate the same token — only the first would
 * succeed, and the rest would look like token reuse and tear down the whole session.
 */
async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;

        const dto = await response.json();
        accessToken = dto.accessToken;
        refreshToken = dto.refreshToken;
        onTokenRefreshed?.(dto.accessToken, dto.refreshToken, dto.expiresAtUtc);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function authHeaders(init: RequestInit): HeadersInit {
  return {
    Accept: 'application/json',
    // FormData sets its own boundary; forcing JSON here corrupts an upload.
    ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init.headers ?? {}),
  };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: authHeaders(init) });

  if (response.status === 401) {
    // The access token expires every 60 minutes; a still-valid 30-day refresh token sits right
    // there, so a silent renew-and-retry belongs here before ending the session outright.
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: authHeaders(init) });
    }

    if (response.status === 401) {
      onUnauthorized?.();
      throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
  }

  if (!response.ok) throw new ApiError(response.status, await readError(response));

  // 204 and empty bodies are normal for mutations; JSON.parse on "" would throw.
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
