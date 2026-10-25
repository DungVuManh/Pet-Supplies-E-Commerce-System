import { describe, it, expect } from "vitest";
import { parseSale, parseLookup, saleHash } from "../src/validators/staff-sale.validator.js";
import { Order } from "../src/models/order.model.js";

const input = { customer: { name: "Khách tại quầy", phone: "0912345678" },
 items: [{ sku: "SKU-1", qty: 2, expectedPrice: 10000 }], cashReceived: true };
describe("staff sale boundary", () => {
 it("accepts guests and normalizes phone without accepting protected fields", () => {
  expect(parseSale(input).customer.name).toBe(input.customer.name);
  for (const field of ["role", "total", "orderStatus", "createdByStaffId", "paymentStatus"]) {
   expect(() => parseSale({ ...input, [field]: "forged" })).toThrow();
  }
  expect(() => parseSale({ ...input, cashReceived: false })).toThrow();
  expect(() => parseSale({ ...input, items: [...input.items, ...input.items] })).toThrow();
  expect(() => parseSale({ ...input, customerId: "a".repeat(24) })).toThrow();
 });
 it("bounds lookup pages and refuses malformed search input", () => {
  expect(parseLookup({})).toEqual({ query: "", page: 1 });
  expect(() => parseLookup({ query: "a" }, true)).toThrow();
  expect(() => parseLookup({ page: "101" })).toThrow();
  expect(() => parseLookup({ query: ["a", "b"] })).toThrow();
 });
 it("hashes a normalized intent consistently and detects changed quantity", () => {
  expect(saleHash(parseSale(input))).toBe(saleHash(parseSale({ ...input })));
  expect(saleHash(parseSale(input))).not.toBe(saleHash(parseSale({ ...input,
   items: [{ ...input.items[0], qty: 3 }] })));
  const more = [{ ...input.items[0], sku: "SKU-2" }, ...input.items];
  expect(saleHash(parseSale({ ...input, items: more }))).toBe(saleHash(parseSale({ ...input, items: [...more].reverse() })));
 });
 it("allows address-free CASH offline sales but still requires online addresses", async () => {
  const data = { orderCode: "TEST-CASH", items: [{ productId: "a".repeat(24),
   variantSku: "SKU-1", name: "Sản phẩm", unitPrice: 10000, qty: 2 }],
   subtotal: 20000, total: 20000, channel: "offline", paymentMethod: "CASH",
   paymentStatus: "paid", orderStatus: "completed", createdByStaffId: "b".repeat(24) };
  await expect(new Order(data).validate()).resolves.toBeUndefined();
  await expect(new Order({ ...data, channel: "online", guestInfo: input.customer }).validate()).rejects.toThrow();
 });
});
