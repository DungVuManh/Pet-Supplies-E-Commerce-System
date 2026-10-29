// Shared browser API client. Requests use relative `/api/v1/...` URLs, which
// next.config.ts rewrites to Express, and unwrap the `{ success, data }` envelope.

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;
type Mutation = "POST" | "PUT" | "PATCH" | "DELETE";

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;

/** A failed API call; `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  status: number;
  code: string;
  /** Per-field messages from a validation error, keyed by request field. */
  fields: Record<string, string>;
  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Appends the non-empty query values to `path`; `withQuery("/x", { q: "a", page: 2 })` → "/x?q=a&page=2". */
export function withQuery(path: string, query: Query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function stringFields(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

/** Unwraps a parsed response body, throwing `ApiError` for an error envelope or a malformed body. */
export function parseEnvelope<T>(status: number, body: unknown): T {
  if (status >= 200 && status < 300 && isRecord(body) && body.success === true && "data" in body) {
    return body.data as T;
  }
  if (isRecord(body) && body.success === false && isRecord(body.error) && typeof body.error.code === "string") {
    const message = typeof body.message === "string" ? body.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
    throw new ApiError(status, body.error.code, message, stringFields(body.error.fields));
  }
  throw new ApiError(status || 502, "INVALID_RESPONSE", "Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/api/v1/")) throw new Error(`API paths must start with /api/v1/: ${path}`);
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại.");
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Keep `null`; parseEnvelope reports a malformed response.
  }
  return parseEnvelope<T>(response.status, body);
}

async function csrfToken() {
  const data = await request<{ csrfToken?: unknown }>("/api/v1/auth/csrf");
  if (typeof data?.csrfToken !== "string" || !csrfPattern.test(data.csrfToken)) {
    throw new ApiError(502, "INVALID_RESPONSE", "Phiên gửi biểu mẫu chưa hợp lệ. Vui lòng tải lại trang.");
  }
  return data.csrfToken;
}

/** GET `path` with optional query values and return the envelope's `data`. */
export function apiGet<T>(path: string, query?: Query, options: { signal?: AbortSignal } = {}) {
  return request<T>(withQuery(path, query), { signal: options.signal });
}

/** Send a JSON mutation with a fresh CSRF token and return the envelope's `data`. */
export async function apiSend<T>(method: Mutation, path: string, body: object = {}) {
  const token = await csrfToken();
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body),
  });
}
