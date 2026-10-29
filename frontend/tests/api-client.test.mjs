import assert from "node:assert/strict";
import { test } from "node:test";
import { apiGet, apiSend, ApiError, parseEnvelope, withQuery } from "../lib/api-client.ts";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const token = "t".repeat(43);

test("GET unwraps the envelope, sends no cookies cross-site, and skips empty query values", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return json({ success: true, data: { items: [1], pagination: { page: 2 } } });
  });
  const data = await apiGet("/api/v1/admin/users", { q: "đức", page: 2, role: "", status: undefined, locked: false });
  assert.deepEqual(data, { items: [1], pagination: { page: 2 } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/v1/admin/users?q=%C4%91%E1%BB%A9c&page=2&locked=false");
  assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.method, undefined);
  assert.equal(calls[0].options.headers, undefined);
});

test("mutations fetch a CSRF token first and send JSON with the header", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return url === "/api/v1/auth/csrf" ? json({ success: true, data: { csrfToken: token } }) : json({ success: true, data: { id: "u1" } });
  });
  assert.deepEqual(await apiSend("PATCH", "/api/v1/admin/users/u1", { fullName: "A" }), { id: "u1" });
  assert.deepEqual(calls.map((call) => call.url), ["/api/v1/auth/csrf", "/api/v1/admin/users/u1"]);
  const { options } = calls[1];
  assert.equal(options.method, "PATCH");
  assert.equal(options.headers["X-CSRF-Token"], token);
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(options.body), { fullName: "A" });
  await apiSend("POST", "/api/v1/admin/notifications/read-all");
  assert.equal(calls[3].options.body, "{}");
});

test("a malformed CSRF token stops the mutation", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(url);
    return json({ success: true, data: { csrfToken: "short" } });
  });
  await assert.rejects(apiSend("POST", "/api/v1/admin/users/u1/lock", { reason: "abc" }),
    (error) => error instanceof ApiError && error.code === "INVALID_RESPONSE" && error.status === 502);
  assert.deepEqual(urls, ["/api/v1/auth/csrf"]);
});

test("error envelopes become ApiError with status, code, message, and field errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => json({
    success: false, message: "Tài khoản đang bị khóa.", error: { code: "ACCOUNT_LOCKED", fields: { reason: "Bắt buộc", bad: 1 } },
  }, 403));
  await assert.rejects(apiGet("/api/v1/admin/users"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.code, "ACCOUNT_LOCKED");
    assert.equal(error.message, "Tài khoản đang bị khóa.");
    assert.deepEqual(error.fields, { reason: "Bắt buộc" });
    return true;
  });
});

test("network failures, non-JSON bodies, and unexpected shapes are mapped", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  await assert.rejects(apiGet("/api/v1/admin/users"), (error) => error.code === "NETWORK_ERROR" && error.status === 0);

  t.mock.method(globalThis, "fetch", async () => new Response("<html>Bad gateway</html>", { status: 502 }));
  await assert.rejects(apiGet("/api/v1/admin/users"), (error) => error.code === "INVALID_RESPONSE" && error.status === 502);

  assert.throws(() => parseEnvelope(200, { success: true }), (error) => error.code === "INVALID_RESPONSE");
  assert.throws(() => parseEnvelope(500, { success: true, data: {} }), (error) => error.code === "INVALID_RESPONSE" && error.status === 500);
  assert.throws(() => parseEnvelope(404, { success: false, error: { code: "NOT_FOUND" } }), (error) => error.code === "NOT_FOUND" && error.message.length > 0);
  assert.equal(parseEnvelope(200, { success: true, data: null }), null);
});

test("a caller's abort is passed through instead of becoming a network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new DOMException("Aborted", "AbortError"); });
  await assert.rejects(apiGet("/api/v1/admin/users", {}, { signal: new AbortController().signal }), (error) => error.name === "AbortError");
});

test("only relative /api/v1 paths are accepted", async () => {
  await assert.rejects(apiGet("https://evil.example/api/v1/x"), /must start with \/api\/v1\//);
  assert.equal(withQuery("/api/v1/x"), "/api/v1/x");
});
