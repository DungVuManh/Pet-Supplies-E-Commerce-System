import type { Customer, RegistrationProfile } from "./types";

export class AuthApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/auth/${path}`, {
      ...options, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000),
    });
  } catch { throw new AuthApiError("NETWORK_ERROR", 0); }
  let body: unknown;
  try { body = response.status === 204 ? null : await response.json(); }
  catch { throw new AuthApiError("AUTH_UNAVAILABLE", response.status); }
  if (!response.ok) {
    const code = isRecord(body) && isRecord(body.error) && typeof body.error.code === "string"
      ? body.error.code : "AUTH_UNAVAILABLE";
    throw new AuthApiError(code, response.status);
  }
  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseCustomer(body: unknown): Customer {
  const user = isRecord(body) && body.success === true && isRecord(body.data) ? body.data.user : null;
  if (!isRecord(user) || typeof user.id !== "string" || typeof user.email !== "string"
    || typeof user.fullName !== "string" || typeof user.phone !== "string"
    || user.role !== "customer") throw new AuthApiError("INVALID_RESPONSE", 502);
  return { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role };
}

async function mutate(path: string, method: "POST" | "DELETE", payload: object) {
  const body = await request("csrf");
  const token = isRecord(body) && isRecord(body.data) ? body.data.csrfToken : null;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new AuthApiError("INVALID_RESPONSE", 502);
  }
  return request(path, { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(payload) });
}

export const authApi = {
  async me() { return parseCustomer(await request("me")); },
  async login(idToken: string, remember: boolean) {
    return parseCustomer(await mutate("session", "POST", { idToken, remember }));
  },
  async register(idToken: string, profile: RegistrationProfile, remember = false) {
    return parseCustomer(await mutate("register", "POST", { idToken, ...profile, remember }));
  },
  async logout() { await mutate("session", "DELETE", {}); },
};
