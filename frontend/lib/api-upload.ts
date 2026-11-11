// File uploads for the Admin. `api-client.ts` sends JSON only, so multipart
// requests live here, with the same CSRF token and response envelope.
import { ApiError, apiGet, parseEnvelope } from "./api-client";

const csrfPattern = /^[A-Za-z0-9_-]{43}$/;
// Several photos over a slow connection take longer than an ordinary request.
const UPLOAD_TIMEOUT_MS = 120_000;

/** POST `form` to `path` as `multipart/form-data` and return the envelope's `data`. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  if (!path.startsWith("/api/v1/")) throw new Error(`API paths must start with /api/v1/: ${path}`);
  const { csrfToken } = await apiGet<{ csrfToken?: unknown }>("/api/v1/auth/csrf");
  if (typeof csrfToken !== "string" || !csrfPattern.test(csrfToken)) {
    throw new ApiError(502, "INVALID_RESPONSE", "Phiên gửi biểu mẫu chưa hợp lệ. Vui lòng tải lại trang.");
  }

  let response: Response;
  try {
    // No Content-Type header: the browser adds the multipart boundary itself.
    response = await fetch(path, {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: form,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Không thể tải ảnh lên. Kiểm tra kết nối rồi thử lại.");
  }
  const body: unknown = await response.json().catch(() => null);
  return parseEnvelope<T>(response.status, body);
}
