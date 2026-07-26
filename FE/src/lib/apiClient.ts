import type { ApiErrorBody } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function getStoredToken(): string | null {
  return sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken");
}

export function setStoredToken(token: string, remember: boolean) {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("accessToken", token);
}

export function clearStoredToken() {
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("accessToken");
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    const message =
      body.message ??
      (body.errors
        ? Object.values(body.errors).flat().join(". ")
        : `Request failed (${res.status})`);
    if (res.status === 401 && !path.startsWith("/auth/")) {
      unauthorizedHandler?.();
    }
    throw new ApiError(res.status, message, body.errors);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
