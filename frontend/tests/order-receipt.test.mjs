import test from "node:test";
import assert from "node:assert/strict";
import { confirmOrderReceiptApi, OrderReceiptApiError } from "../features/orders/services/receipt-confirmation.service.ts";

const id = "a".repeat(24);
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});
const csrf = () => json({ success: true, data: { csrfToken: "x".repeat(43) } });

test("customer receipt confirmation uses CSRF and accepts only a completed response for its order", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/csrf")
      ? csrf()
      : json({ success: true, data: { order: { id, orderStatus: "completed" } } });
  });

  assert.deepEqual(await confirmOrderReceiptApi(id), { id, orderStatus: "completed" });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `/api/v1/orders/${id}/receipt-confirmation`);
  assert.equal(calls[1].options.method, "PATCH");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "x".repeat(43));
  assert.equal(calls[1].options.credentials, "include");
  assert.equal(calls[1].options.cache, "no-store");
  assert.equal(calls[1].options.body, "{}");
});

test("customer receipt confirmation never accepts a malformed or mismatched response", async (t) => {
  for (const body of [
    null,
    { success: true, data: { order: { id: "b".repeat(24), orderStatus: "completed" } } },
    { success: true, data: { order: { id, orderStatus: "shipping" } } },
  ]) {
    t.mock.method(globalThis, "fetch", async (url) => url.endsWith("/csrf") ? csrf() : json(body));
    await assert.rejects(confirmOrderReceiptApi(id), (error) => error instanceof OrderReceiptApiError && error.code === "INVALID_RESPONSE");
    t.mock.restoreAll();
  }
});

test("customer receipt confirmation maps known errors without exposing server text", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => url.endsWith("/csrf")
    ? csrf()
    : json({ success: false, message: "private database information", error: { code: "ORDER_STATUS_CONFLICT" } }, 409));
  await assert.rejects(
    confirmOrderReceiptApi(id),
    (error) => error instanceof OrderReceiptApiError && error.code === "ORDER_STATUS_CONFLICT" && !error.message.includes("private"),
  );
});
