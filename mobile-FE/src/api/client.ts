import { API_BASE_URL, API_TIMEOUT_MS } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Field-level messages from FluentValidation, keyed by property name. */
    readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized() {
    return this.status === 401 || this.status === 403;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let getToken: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

/**
 * Wired up once by AuthProvider so every request picks up the current token
 * without threading it through each call site.
 */
export function configureAuth(provider: TokenProvider, handler: UnauthorizedHandler) {
  getToken = provider;
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip the Authorization header — used by login/register. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);

  return params.length ? `${url}?${params.join('&')}` : url;
}

/**
 * The API returns `{ message }` for most failures and `{ errors: {...} }` for
 * validation failures — see ExceptionHandlingMiddleware.
 */
async function toApiError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  let errors: Record<string, string[]> | undefined;

  try {
    const text = await response.text();
    if (text) {
      const body = JSON.parse(text) as { message?: string; errors?: Record<string, string[]> };
      if (body.errors) {
        errors = body.errors;
        const first = Object.values(body.errors)[0];
        if (first?.length) message = first[0];
      } else if (body.message) {
        message = body.message;
      }
    }
  } catch {
    // Non-JSON body (e.g. an HTML error page) — keep the generic message.
  }

  if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

  return new ApiError(message, response.status, errors);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, anonymous = false, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!anonymous) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    const reason =
      controller.signal.aborted
        ? 'Máy chủ phản hồi quá lâu.'
        : `Không kết nối được tới máy chủ (${API_BASE_URL}).`;
    throw new ApiError(reason, 0);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (error.status === 401) onUnauthorized();
    throw error;
  }

  // 204 No Content, and 200s with an empty body, are both used by the API.
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Multipart upload — used for avatars, where the API expects an IFormFile. */
export async function apiUpload<T>(
  path: string,
  file: { uri: string; name: string; type: string },
  query?: RequestOptions['query'],
): Promise<T> {
  const form = new FormData();
  // React Native's FormData accepts this shape for file parts.
  form.append('file', file as unknown as Blob);

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { method: 'POST', headers, body: form });
  } catch {
    throw new ApiError(`Không kết nối được tới máy chủ (${API_BASE_URL}).`, 0);
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (error.status === 401) onUnauthorized();
    throw error;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
