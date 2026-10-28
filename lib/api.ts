import type { ApiError } from "@/lib/types";

const API_BASE = '/api/backend';

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function isForbiddenError(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 403;
}

const TOKEN_KEY = "stock_access_token";
const REFRESH_KEY = "stock_refresh_token";

// Remove credentials left by earlier app versions. Sessions now use HttpOnly cookies.
export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
function parseErrorMessage(data: ApiError): string {
  return Array.isArray(data.message) ? data.message.join(', ') : data.message ?? 'Request failed';
}

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  /** Send Idempotency-Key (UUID) for safe retries on create/return POSTs. */
  idempotent?: boolean;
};

export async function api<T>(
  path: string,
  init: ApiRequestInit = {}
): Promise<T> {
  const {
    body,
    auth: _auth = true,
    idempotent = ['POST', 'PATCH', 'DELETE'].includes(init.method ?? 'GET') && !path.startsWith('/auth/') && !(body instanceof FormData),
    headers: initHeaders,
    ...rest
  } = init;
  const headers = new Headers(initHeaders);

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let retryStorageKey: string | undefined;
  if (idempotent && !headers.has('Idempotency-Key')) {
    const fingerprint = JSON.stringify({ path, method: init.method, body });
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
    retryStorageKey = 'inventory_retry_' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const key = sessionStorage.getItem(retryStorageKey) ?? crypto.randomUUID();
    sessionStorage.setItem(retryStorageKey, key);
    headers.set('Idempotency-Key', key);
  }
  void _auth; // Authentication is provided by the same-origin session proxy.

  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API path must be relative');
  clearTokens();
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest, headers, credentials: 'same-origin',
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (retryStorageKey && (res.ok || (res.status < 500 && res.status !== 409))) sessionStorage.removeItem(retryStorageKey);
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as ApiError;
      message = parseErrorMessage(data);
    } catch {
      /* ignore */
    }
    throw new ApiRequestError(message || "Request failed", res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
