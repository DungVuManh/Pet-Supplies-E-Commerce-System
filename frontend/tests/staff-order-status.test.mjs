import test from "node:test";
import assert from "node:assert/strict";
import { updateStaffOrderStatus, StaffOrdersApiError } from "../features/staff/orders/api.ts";

const id = "a".repeat(24);
const input = { expectedStatus: "processing", orderStatus: "shipping", shipping: { carrier: "", trackingNumber: "" } };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const csrf = () => json({ success: true, data: { csrfToken: "x".repeat(43) } });

test("status update obtains CSRF and sends the expected status with cookies and no cache", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/csrf") ? csrf() : json({ success: true, data: { order: { id, orderStatus: "shipping" } } });
  });
  assert.deepEqual(await updateStaffOrderStatus(id, input), { id, orderStatus: "shipping" });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `/api/v1/staff/orders/${id}/status`);
  assert.equal(calls[1].options.method, "PATCH");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "x".repeat(43));
  assert.equal(calls[1].options.credentials, "include");
  assert.equal(calls[1].options.cache, "no-store");
  assert.deepEqual(JSON.parse(calls[1].options.body), input);
});

test("invalid CSRF responses never send a mutation", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return json({ success: true, data: { csrfToken: "bad" } }); });
  await assert.rejects(updateStaffOrderStatus(id, input), (e) => e instanceof StaffOrdersApiError && e.code === "INVALID_RESPONSE");
  assert.equal(calls, 1);
});

test("conflict and business errors retain their codes without exposing server messages", async (t) => {
  for (const code of ["ORDER_STATUS_CONFLICT", "OUT_OF_STOCK", "PAYMENT_NOT_VERIFIED", "CSRF_INVALID"]) {
    t.mock.method(globalThis, "fetch", async (url) => url.endsWith("/csrf") ? csrf()
      : json({ success: false, message: "private database information", error: { code } }, code === "CSRF_INVALID" ? 403 : 409));
    await assert.rejects(updateStaffOrderStatus(id, input), (e) => e.code === code && !e.message.includes("private database"));
    t.mock.restoreAll();
  }
});

test("malformed/wrong-order/wrong-state success and network errors are not accepted as success", async (t) => {
  for (const body of [null, { success: true, data: { order: { id: "b".repeat(24), orderStatus: "shipping" } } },
    { success: true, data: { order: { id, orderStatus: "completed" } } }]) {
    t.mock.method(globalThis, "fetch", async (url) => url.endsWith("/csrf") ? csrf() : json(body));
    await assert.rejects(updateStaffOrderStatus(id, input), (e) => e.code === "INVALID_RESPONSE");
    t.mock.restoreAll();
  }
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.endsWith("/csrf")) return csrf();
    throw new Error("network lost after request");
  });
  await assert.rejects(updateStaffOrderStatus(id, input), (e) => e.status === 0 && e.code === "NETWORK_ERROR");
});
