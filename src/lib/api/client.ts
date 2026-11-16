// src/lib/api/client.ts
//
// The ONE place that knows how to talk to the backend. Every domain module
// in lib/api/* calls through this — pages must never call fetch()/axios
// directly (section 26).
//
// Auth: cookie-based session (`credentials: "include"`). We never read or
// store the session cookie ourselves — the browser handles it, and it is
// HttpOnly so JS cannot see it anyway.
//
// CSRF: app.js wires `issueCsrfCookie` + `csrfProtection`, and openapi.js
// documents the `csrf-token` cookie / `X-CSRF-Token` header pairing. That
// cookie is NOT HttpOnly (it can't be — the client has to read it to echo
// it back), so we read it here and attach it to state-changing requests.
// This is the ONLY place that touches the CSRF cookie.

// Section 40/14 of the redesign mandate: production must fail loudly and
// clearly if the API URL was never configured — silently falling back to
// localhost in a deployed build would send every request nowhere and
// surface as a confusing generic network error. Development may fall back
// to localhost for convenience.
function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:4000/api/v1';

  // Production defaults to the same-origin Next.js rewrite. This keeps
  // session cookies and CSRF same-site and avoids requiring a public
  // cross-origin backend URL in the browser bundle. next.config.js must
  // have BACKEND_URL configured for this rewrite to reach the backend.
  return '/api/v1';
}

// Resolve lazily so configuration and URL errors are surfaced as catchable
// ApiErrors when a request is made, not as import-time application crashes.
let cachedBaseUrl: string | null = null;
function getApiBaseUrl(): string {
  if (cachedBaseUrl) return cachedBaseUrl;
  cachedBaseUrl = resolveApiBaseUrl();
  return cachedBaseUrl;
}

export type ApiErrorKind = 'network' | 'auth' | 'forbidden' | 'validation' | 'not_found' | 'server' | 'unknown';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  kind: ApiErrorKind;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.kind = classify(status);
  }
}

function classify(status: number): ApiErrorKind {
  if (status === 0) return 'network';
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 422 || status === 400) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null; // Server Component context — no cookie header needed for CSRF on GET
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const value = match?.[1];
  return value ? decodeURIComponent(value) : null;
}

/** Cross-origin SPAs cannot read the API-domain csrf-token cookie via document.cookie.
 *  The API exposes X-CSRF-Token on responses; we keep the latest value in memory. */
let csrfTokenMemory: string | null = null;

function rememberCsrfFromResponse(response: Response) {
  const header = response.headers.get('X-CSRF-Token');
  if (header) csrfTokenMemory = header;
}

function getCsrfToken(): string | null {
  return csrfTokenMemory || readCookie('csrf-token');
}

export type QueryValue = string | number | boolean | undefined | null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /**
   * Typed extra headers. Only headers on the allowlist below may be set, so a
   * caller cannot override Content-Type, Accept or X-CSRF-Token (CSRF stays
   * owned by this module).
   */
  idempotencyKey?: string;
};

/**
 * Generates an Idempotency-Key. Call this at the DELIBERATE user-action
 * boundary (the moment the user commits to an action), keep the key for every
 * retry of that same action, and generate a new one only for a new action.
 * Never call it inside a mutationFn — a network retry would then silently
 * mint a new key and defeat server-side duplicate protection.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Fallback for very old browsers: 128 bits from getRandomValues.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getApiHealthUrl(): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  // Prefer /api/v1/health (same path family as other API calls). Root /health
  // remains available for load balancers; SPA should not use a probe that
  // triggers third-party Set-Cookie noise.
  if (/\/api\/v\d+$/i.test(base)) return `${base}/health`;
  try {
    return `${new URL(base).origin}/api/v1/health`;
  } catch {
    return `${base}/api/v1/health`;
  }
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const requestPath = base + normalizedPath;
  const isAbsoluteBase = /^[a-z][a-z\d+.-]*:\/\//i.test(base);

  // Browser requests using /api/v1 stay same-origin and pass through the
  // Next.js rewrite. Server-side requests use the current Vercel deployment
  // origin (or localhost during local development).
  const applicationOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (() => {
          // VERCEL_URL is server-only. Do not evaluate it in the browser bundle.
          const deploymentHost = process.env.VERCEL_URL?.replace(/^https?:\/\//, '');
          return deploymentHost ? 'https://' + deploymentHost : 'http://localhost:3000';
        })();

  const url = new URL(requestPath, applicationOrigin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }

  // Keep relative URLs relative in the browser so the request uses this
  // deployment's same-origin rewrite. Absolute API bases remain absolute.
  return isAbsoluteBase || typeof window === 'undefined'
    ? url.toString()
    : url.pathname + url.search;
}

/** Shape every controller in the backend returns (apiResponse.js). */
interface BackendEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string; details?: unknown };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, idempotencyKey } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const isMutation = method !== 'GET';
  if (isMutation) {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  let url: string;
  try {
    url = buildUrl(path, query);
  } catch (err) {
    // Missing NEXT_PUBLIC_API_BASE_URL in production — a configuration
    // problem, not a transient network blip, but still surfaced as a
    // catchable ApiError rather than an uncaught exception.
    throw new ApiError(err instanceof Error ? err.message : 'The application is not configured correctly.', 'CONFIG_ERROR', 0);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: 'include', // sends the HttpOnly session cookie — never a manual Authorization header
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    rememberCsrfFromResponse(response);
  } catch {
    throw new ApiError('Unable to connect to the server.', 'NETWORK_ERROR', 0);
  }

  let payload: BackendEnvelope<T> | undefined;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response (e.g. a proxy error page) — fall through to status-based handling below.
  }

  if (!response.ok || payload?.success === false) {
    const code = payload?.error?.code ?? `HTTP_${response.status}`;
    const message = payload?.error?.message ?? payload?.message ?? 'Something went wrong. Please try again.';
    throw new ApiError(message, code, response.status, payload?.error?.details);
  }

  return payload?.data as T;
}

/**
 * Unauthenticated request for the public M-PESA submission endpoint ONLY.
 *
 * Deliberately narrow: it never sends the session cookie (`credentials:
 * 'omit'`) and never attaches a CSRF header, because the backend mounts the
 * public route outside session/CSRF middleware. It does NOT change how
 * authenticated requests behave. The returned ApiError never carries response
 * `details`, so a request body (which holds a one-time token) can never be
 * echoed into an error object that something might log or report.
 */
export async function publicRequest<T>(path: string, body: unknown, signal?: AbortSignal): Promise<{ status: number; data: T | undefined }> {
  let url: string;
  try {
    url = buildUrl(path);
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : 'The application is not configured correctly.', 'CONFIG_ERROR', 0);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError('Unable to connect to the server.', 'NETWORK_ERROR', 0);
  }

  let payload: BackendEnvelope<T> | undefined;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body — rely on status.
  }

  if (!response.ok || payload?.success === false) {
    const code = payload?.error?.code ?? `HTTP_${response.status}`;
    throw new ApiError('The request could not be completed.', code, response.status);
  }
  return { status: response.status, data: payload?.data };
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) => apiRequest<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal, extra?: Pick<RequestOptions, 'idempotencyKey'>) =>
    apiRequest<T>(path, { method: 'POST', body, signal, ...extra }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) => apiRequest<T>(path, { method: 'PATCH', body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) => apiRequest<T>(path, { method: 'PUT', body, signal }),
};