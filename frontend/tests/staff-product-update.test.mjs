import test from "node:test";
import assert from "node:assert/strict";
import { fetchStaffProduct, parseStaffProduct, updateStaffProduct, validateProductDraft, StaffProductsApiError } from "../features/staff/products/api.ts";

const sku = "LIVE-SKU";
const product = { productId: "a".repeat(24), sku, name: "Thức ăn", category: "Thức ăn", brand: "Petly", weight: "1 kg",
  description: "Mô tả", physical: 10, reserved: 2, availableStock: 8, price: 100000, threshold: 5,
  location: "Kệ A1", image: "/images/products/royal-canin-mini-adult.png", updated: "23/10", status: "active" };
const input = { physical: 12, status: "hidden", description: "Mô tả mới", expected: { physical: 10, reserved: 2, status: "active", description: "Mô tả" } };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ok = (data) => json({ success: true, data });

test("product parser preserves the single description and rejects invalid identity/inventory", () => {
  assert.deepEqual(parseStaffProduct(product, sku), product);
  for (const patch of [{ sku: "other" }, { productId: "bad" }, { physical: -1 }, { reserved: 11 },
    { price: 1.5 }, { availableStock: 10 }, { description: undefined }, { status: "unknown" }]) {
    assert.throws(() => parseStaffProduct({ ...product, ...patch }, sku), (e) => e.code === "INVALID_RESPONSE");
  }
});
test("draft validation accepts reserved/zero boundaries and rejects empty, fractional and unsafe quantities", () => {
  assert.deepEqual(validateProductDraft("2", "Mô tả", 2), {});
  assert.deepEqual(validateProductDraft("0", "Mô tả", 0), {});
  for (const value of ["", "-1", "1.5", "abc", "9007199254740992"]) assert.ok(validateProductDraft(value, "Mô tả", 0).physical);
  assert.ok(validateProductDraft("1", "Mô tả", 2).physical);
  for (const text of ["", "  ", "x".repeat(10001)]) assert.ok(validateProductDraft("2", text, 2).description);
});
test("server product fetch forwards only the supplied cookie with encoded SKU, no caching or redirects", async (t) => {
  const specialSku = "SKU 1/2";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://backend.test/api/v1/staff/products/SKU%201%2F2");
    assert.equal(options.headers.Cookie, "petly-session=fixture");
    assert.equal(options.cache, "no-store"); assert.equal(options.redirect, "error");
    return ok({ ...product, sku: specialSku });
  });
  assert.equal((await fetchStaffProduct("http://backend.test", "petly-session=fixture", specialSku)).sku, specialSku);
});
test("update sends CSRF, current edits and the original concurrency snapshot", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/csrf") ? ok({ csrfToken: "x".repeat(43) }) : ok({ sku });
  });
  await updateStaffProduct(sku, input);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `/api/v1/staff/products/${sku}`);
  assert.equal(calls[1].options.method, "PATCH");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "x".repeat(43));
  assert.equal(calls[1].options.credentials, "include");
  assert.deepEqual(JSON.parse(calls[1].options.body), input);
});
test("malformed CSRF/acknowledgements and network failures cannot report successful saves", async (t) => {
  let count = 0;
  t.mock.method(globalThis, "fetch", async () => { count++; return ok({ csrfToken: "bad" }); });
  await assert.rejects(updateStaffProduct(sku, input), (e) => e.code === "INVALID_RESPONSE");
  assert.equal(count, 1); t.mock.restoreAll();
  for (const response of [() => ok({ sku: "other" }), () => json(null), () => { throw new Error("network lost"); }]) {
    t.mock.method(globalThis, "fetch", async (url) => url.endsWith("/csrf") ? ok({ csrfToken: "x".repeat(43) }) : response());
    await assert.rejects(updateStaffProduct(sku, input), (e) => e instanceof StaffProductsApiError);
    t.mock.restoreAll();
  }
});
test("server errors preserve conflict/auth codes while hiding private messages", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => url.endsWith("/csrf") ? ok({ csrfToken: "x".repeat(43) })
    : json({ success: false, message: "private driver error", error: { code: "PRODUCT_CHANGED" } }, 409));
  await assert.rejects(updateStaffProduct(sku, input), (e) => e.status === 409 && e.code === "PRODUCT_CHANGED" && !e.message.includes("private driver"));
});
