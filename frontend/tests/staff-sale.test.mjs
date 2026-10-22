import test from "node:test";
import assert from "node:assert/strict";
import { parseSaleProducts, parseSaleCustomers, parseSaleReceipt, validateSaleDraft, submitSale, SaleApiError } from "../features/staff/orders/sale-api.ts";

const product = { productId: "a".repeat(24), sku: "SKU-1", name: "Thức ăn", variantLabel: "1 kg", price: 10000, availableStock: 3 };
const envelope = (data) => ({ success: true, data });
const receipt = { id: "b".repeat(24), orderCode: "POS-TEST", total: 20000, channel: "offline", orderStatus: "completed", paymentStatus: "paid", paymentMethod: "CASH" };
test("sale parser rejects invalid prices/stock and malformed success envelopes", () => {
  assert.equal(parseSaleProducts(envelope({ items: [product], page: 1, hasMore: false })).items[0].sku, "SKU-1");
  for (const patch of [{ price: -1 }, { availableStock: 0 }, { productId: "fake" }, { price: 1.5 }]) {
    assert.throws(() => parseSaleProducts(envelope({ items: [{ ...product, ...patch }], page: 1, hasMore: false })));
  }
  assert.throws(() => parseSaleCustomers(envelope({ items: [{ role: "staff" }], page: 1, hasMore: false })));
  assert.deepEqual(parseSaleReceipt(envelope({ order: receipt })), receipt);
  assert.throws(() => parseSaleReceipt(envelope({ order: { ...receipt, paymentStatus: "unpaid" } })));
});
test("draft requires customer choice/contact, quantity and explicit cash confirmation", () => {
  const contact = { name: "Khách lẻ", phone: "0912345678", email: "" };
  assert.deepEqual(validateSaleDraft("new", contact, null, [{ ...product, qty: 2 }], true), {});
  assert.ok(validateSaleDraft("existing", contact, null, [{ ...product, qty: 4 }], false).customer);
  assert.ok(validateSaleDraft("new", { ...contact, phone: "bad" }, null, [], false).phone);
  assert.ok(validateSaleDraft("new", contact, null, [{ ...product, qty: 1.5 }], true).items);
});
test("creation obtains CSRF, keeps the supplied idempotency key and parses receipt", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return Response.json(calls.length % 2 === 1 ? envelope({ csrfToken: "x".repeat(43) }) : envelope({ order: receipt }));
  });
  const payload = { customer: { name: "Khách lẻ", phone: "0912345678" }, items: [{ sku: "SKU-1", qty: 2, expectedPrice: 10000 }], cashReceived: true };
  for (let i = 0; i < 2; i++) await submitSale(payload, "same-intent-key");
  assert.equal(calls[1].options.headers["Idempotency-Key"], calls[3].options.headers["Idempotency-Key"]);
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "x".repeat(43));
  assert.equal(calls[1].options.cache, "no-store");
  assert.equal(calls[1].options.body, calls[3].options.body);
});
test("service and malformed-response errors never become success", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: { code: "CSRF_INVALID" } }, { status: 403 }));
  await assert.rejects(submitSale({}, "key"), (error) => error instanceof SaleApiError && error.code === "CSRF_INVALID" && error.status === 403);
});
