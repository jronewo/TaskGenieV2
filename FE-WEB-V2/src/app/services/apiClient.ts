const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5258/api").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Called by AuthProvider once, so the client can attach the current Bearer token to every request. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Called by AuthProvider so the client can force a logout when the server rejects an authenticated request. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function parseErrorBody(response: Response): Promise<{ message: string; details?: unknown }> {
  const fallback = `Request failed (${response.status}).`;
  const text = await response.text().catch(() => "");
  if (!text) return { message: fallback };

  try {
    const body = JSON.parse(text);
    if (typeof body?.message === "string" && body.message) return { message: body.message, details: body };
    if (body?.errors) return { message: "Validation failed.", details: body.errors };
    return { message: fallback, details: body };
  } catch {
    return { message: fallback };
  }
}

interface RequestOptions extends RequestInit {
  /** Set to false for calls made before authentication (register/login/google) so a 401 there is treated
   *  as an invalid-credentials response instead of triggering a global session logout. */
  authenticated?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authenticated = true, headers, ...init } = options;
  const requestHeaders: Record<string, string> = {
    // FormData must set its own multipart boundary, so the JSON header is only for JSON bodies.
    ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(headers as Record<string, string> | undefined),
  };

  const attachToken = authenticated && accessToken;
  if (attachToken) requestHeaders.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: requestHeaders });

  if (!response.ok) {
    if (response.status === 401 && attachToken) onUnauthorized?.();
    const { message, details } = await parseErrorBody(response);
    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
