const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5258/api").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", 401);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      (payload && (payload.message ?? payload.error ?? payload.title)) ??
      `Yêu cầu thất bại (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function toBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: toBody(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: toBody(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
