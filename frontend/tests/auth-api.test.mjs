import assert from "node:assert/strict";
import { test } from "node:test";
import { authApi, AuthApiError, fetchDashboardUser, parseAuthUser } from "../features/auth/api.ts";
import { authErrorMessage } from "../features/auth/errors.ts";

const user = { id: "customer-1", email: "customer@example.com", fullName: "Khách hàng", phone: "0912345678", role: "customer" };
const envelope = { success: true, data: { user } };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("session exchange includes CSRF and cookies, but never a password or client-controlled role", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("csrf") ? json({ success: true, data: { csrfToken: "x".repeat(43) } }) : json(envelope);
  });
  assert.deepEqual(await authApi.login("test-id-token", true), user);
  assert.deepEqual(calls.map((call) => call.url), ["/api/v1/auth/csrf", "/api/v1/auth/session"]);
  const options = calls[1].options;
  assert.equal(options.credentials, "same-origin");
  assert.equal(options.cache, "no-store");
  assert.equal(options.headers["X-CSRF-Token"], "x".repeat(43));
  assert.deepEqual(JSON.parse(options.body), { idToken: "test-id-token", remember: true });
});

test("response boundary rejects unknown roles and malformed profiles", () => {
  for (const body of [null, {}, { success: true, data: { user: { ...user, role: "manager" } } },
    { success: true, data: { user: { ...user, role: null } } },
    { success: true, data: { user: { ...user, phone: 123 } } }]) {
    assert.throws(() => parseAuthUser(body), (error) => error.code === "INVALID_RESPONSE");
  }
  assert.deepEqual(parseAuthUser({ success: true, data: { user: { ...user, private: "omit" } } }), user);
});

for (const role of ["customer", "staff", "admin"]) {
  test(`${role} login and session responses use the same public profile contract`, async (t) => {
    const profile = { ...user, role };
    t.mock.method(globalThis, "fetch", async (url) => url.endsWith("csrf")
      ? json({ success: true, data: { csrfToken: "x".repeat(43) } })
      : json({ success: true, data: { user: { ...profile, firebaseUid: "private" } } }));
    assert.deepEqual(await authApi.login("test-id-token", false), profile);
    assert.deepEqual(await authApi.me(), profile);
  });
}

test("dashboard fetch forwards the session only to the configured backend without caching or redirects", async (t) => {
  let call;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    call = { url, options };
    return json({ success: true, data: { user: { ...user, role: "staff" } } });
  });
  assert.equal((await fetchDashboardUser("http://127.0.0.1:3001", "petly-session=test-session", "staff")).role, "staff");
  assert.equal(call.url, "http://127.0.0.1:3001/api/v1/staff/dashboard");
  assert.deepEqual(call.options.headers, { Cookie: "petly-session=test-session" });
  assert.equal(call.options.cache, "no-store");
  assert.equal(call.options.redirect, "error");
});

test("dashboard fetch fails closed on wrong-role data and preserves authentication and service errors", async (t) => {
  const mockFetch = t.mock.method(globalThis, "fetch", async () => json(envelope));
  const read = () => fetchDashboardUser("http://127.0.0.1:3001", "petly-session=test-session", "admin");
  await assert.rejects(read(), (error) => error.code === "FORBIDDEN" && error.status === 403);
  for (const [status, code] of [[401, "UNAUTHENTICATED"], [403, "FORBIDDEN"], [409, "PROFILE_INCOMPLETE"], [503, "PROFILE_UNAVAILABLE"]]) {
    mockFetch.mock.mockImplementation(async () => json({ success: false, error: { code } }, status));
    await assert.rejects(read(), (error) => error.status === status && error.code === code);
  }
});

test("server errors preserve codes needed for profile recovery and session expiry", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json({ success: false, error: { code: "UNAUTHENTICATED" } }, 401));
  await assert.rejects(authApi.me(), (error) => error instanceof AuthApiError && error.status === 401 && error.code === "UNAUTHENTICATED");
});

test("network and non-JSON proxy failures are surfaced instead of successful authentication", async (t) => {
  const mockFetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("network details"); });
  await assert.rejects(authApi.me(), (error) => error.code === "NETWORK_ERROR");
  mockFetch.mock.mockImplementation(async () => new Response("Bad gateway", { status: 502 }));
  await assert.rejects(authApi.me(), (error) => error.code === "AUTH_UNAVAILABLE");
});

test("logout handles HTTP 204 and uses a CSRF-protected DELETE", async (t) => {
  let mutation;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("csrf")) return json({ success: true, data: { csrfToken: "x".repeat(43) } });
    mutation = options;
    return new Response(null, { status: 204 });
  });
  await authApi.logout();
  assert.equal(mutation.method, "DELETE");
  assert.equal(mutation.headers["X-CSRF-Token"], "x".repeat(43));
});

test("customer-facing failures never expose server messages or enumerate registered addresses", () => {
  assert.equal(authErrorMessage({ code: "auth/user-not-found" }), authErrorMessage({ code: "auth/wrong-password" }));
  assert.equal(authErrorMessage({ code: "auth/email-already-in-use" }), authErrorMessage({ code: "auth/invalid-credential" }));
  assert.ok(!authErrorMessage(new Error("private key details")).includes("private"));
  assert.match(authErrorMessage({ code: "AUTH_CLOCK_SKEW" }), /đồng bộ thời gian/);
  assert.notEqual(authErrorMessage({ code: "AUTH_CLOCK_SKEW" }), authErrorMessage({ code: "RECENT_LOGIN_REQUIRED" }));
});
