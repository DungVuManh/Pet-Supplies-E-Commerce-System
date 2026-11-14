import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ApiError, parseEnvelope, withQuery, type Query } from "./api-client";

/**
 * GET an Express API from a Server Component, forwarding only the session cookie
 * to the configured backend. Call it inside a Suspense child: it reads cookies.
 * 404 renders the nearest not-found page; 401 and an unusable session go to
 * /login; 403 goes to /forbidden. Other failures throw `ApiError`.
 */
export async function serverGet<T>(path: string, query?: Query): Promise<T> {
  if (!path.startsWith("/api/v1/")) throw new Error(`API paths must start with /api/v1/: ${path}`);
  const name = process.env.NODE_ENV === "production" ? "__Host-petly-session" : "petly-session";
  const session = (await cookies()).get(name);
  if (!session) redirect("/login");

  const origin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001";
  let response: Response;
  try {
    response = await fetch(origin + withQuery(path, query), {
      headers: { Cookie: `${name}=${encodeURIComponent(session.value)}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ. Vui lòng thử lại.");
  }
  const body: unknown = await response.json().catch(() => null);
  try {
    return parseEnvelope<T>(response.status, body);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) notFound();
      if (error.status === 401 || error.code === "PROFILE_INCOMPLETE" || error.code === "ACCOUNT_LOCKED") redirect("/login");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  }
}
