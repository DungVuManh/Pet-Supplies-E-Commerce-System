import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { PromotionRedemption } from "../src/models/promotion-redemption.model.js";
import { Promotion } from "../src/models/promotion.model.js";
import { quoteClientKey, quoteLimitStore } from "../src/routers/voucher.router.js";
import { VOUCHER_INVALID_MESSAGE } from "../src/common/voucher-redemption.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const NOW = new Date("2026-11-15T05:00:00.000Z");
const productId = "507f1f77bcf86cd799439011";
const loadedAt = new Date("2026-10-01T00:00:00Z");
const MSG16 = "Mã giảm giá không hợp lệ hoặc không áp dụng được cho đơn hàng này.";

let vouchers;
let redemptions;
let orders;
let app;

const makeVoucher = (patch) => ({
 _id: new mongoose.Types.ObjectId(), code: "SALE", name: "Khuyến mãi", type: "percent", value: 10, minOrderAmount: 0,
 startAt: new Date("2026-11-01"), endAt: new Date("2026-12-01"), isActive: true, usedCount: 0, oncePerCustomer: true,
 updatedAt: loadedAt, createdAt: loadedAt, ...patch,
});
const items = [{ productId, variantSku: "SKU-1", qty: 2 }]; // 2 × 100.000 = 200.000
const guest = { name: "Khách", phone: "0912345678" };
const address = { recipientName: "Khách", phone: "0912345678", province: "Hà Nội", district: "Cầu Giấy", ward: "Dịch Vọng", street: "Số 1" };
const place = (patch = {}) => app.send("POST", "/api/v1/orders", { items, guestInfo: guest, shippingAddress: address, ...patch });
const quote = (patch = {}) => app.send("POST", "/api/v1/vouchers/quote", { code: "SALE", items, ...patch });

/** The parts of a MongoDB filter these controllers use. */
function reservationAllowed(voucher, filter) {
 if (filter.updatedAt && voucher.updatedAt.getTime() !== filter.updatedAt.getTime()) return false;
 if (voucher.isActive === false) return false;
 if (!(voucher.startAt <= filter.startAt.$lte) || !(voucher.endAt > filter.endAt.$gt)) return false;
 return voucher.usageLimit == null || (voucher.usedCount ?? 0) < voucher.usageLimit;
}

beforeEach(() => {
 vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
 vouchers = [makeVoucher()];
 redemptions = [];
 orders = [];
 app = createAdminTestApp({ role: null });
 quoteLimitStore.resetAll();
 vi.spyOn(AuditLog, "create").mockResolvedValue({});
 vi.spyOn(Product, "updateOne").mockResolvedValue({});
 vi.spyOn(Product, "findById").mockResolvedValue({ _id: productId, name: "Thức ăn", price: 100000, isActive: true, variants: [{ sku: "SKU-1", price: 100000 }] });

 vi.spyOn(Promotion, "findOne").mockImplementation(({ code }) => ({ lean: async () => vouchers.find((item) => item.code === code) ?? null }));
 vi.spyOn(Promotion, "updateOne").mockImplementation(async (filter, update, options) => {
  expect(options).toEqual({ timestamps: false });
  const voucher = vouchers.find((item) => String(item._id) === String(filter._id));
  if (!voucher) return { modifiedCount: 0 };
  if (update.$inc.usedCount === 1 && !reservationAllowed(voucher, filter)) return { modifiedCount: 0 };
  if (update.$inc.usedCount === -1 && !((voucher.usedCount ?? 0) > 0)) return { modifiedCount: 0 };
  voucher.usedCount = (voucher.usedCount ?? 0) + update.$inc.usedCount;
  return { modifiedCount: 1 };
 });

 vi.spyOn(PromotionRedemption, "exists").mockImplementation(async ({ promotionId, customerKey, status }) => (redemptions.some((item) => String(item.promotionId) === String(promotionId) && item.customerKey === customerKey && item.status === status) ? { _id: "x" } : null));
 vi.spyOn(PromotionRedemption, "create").mockImplementation(async (doc) => {
  const taken = doc.oncePerCustomer && redemptions.some((item) => item.oncePerCustomer && item.status === "active" && item.customerKey === doc.customerKey && String(item.promotionId) === String(doc.promotionId));
  if (taken) throw Object.assign(new Error("dup"), { code: 11000 });
  redemptions.push({ ...doc });
  return doc;
 });
 vi.spyOn(PromotionRedemption, "deleteOne").mockImplementation(async ({ orderId }) => {
  redemptions = redemptions.filter((item) => String(item.orderId) !== String(orderId));
  return { deletedCount: 1 };
 });
 vi.spyOn(PromotionRedemption, "findOneAndUpdate").mockImplementation(({ orderId, status }, update) => ({
  lean: async () => {
   const found = redemptions.find((item) => String(item.orderId) === String(orderId) && item.status === status);
   if (found) Object.assign(found, update.$set);
   return found ?? null;
  },
 }));

 // The real document validators run, so a wrong total fails like it would in production.
 vi.spyOn(Order, "create").mockImplementation(async (doc) => {
  const order = new Order(doc);
  await order.validate();
  orders.push(order.toObject());
  return order.toObject();
 });
 const findOrder = (id) => {
  const found = orders.find((item) => String(item._id) === String(id)) ?? null;
  return { lean: async () => found, then: (resolve, reject) => Promise.resolve(found).then(resolve, reject) };
 };
 vi.spyOn(Order, "findById").mockImplementation(findOrder);
 vi.spyOn(Order, "findOneAndUpdate").mockImplementation(async ({ _id }, update) => {
  const found = orders.find((item) => String(item._id) === String(_id));
  Object.assign(found, update.$set);
  return found;
 });
 vi.spyOn(Order, "updateOne").mockImplementation(async ({ _id }, update) => {
  Object.assign(orders.find((item) => String(item._id) === String(_id)), update.$set);
  return { modifiedCount: 1 };
 });
});
afterEach(() => {
 vi.useRealTimers();
 vi.restoreAllMocks();
});

const expectNothingReserved = () => {
 expect(orders).toHaveLength(0);
 expect(redemptions).toHaveLength(0);
 expect(vouchers[0].usedCount ?? 0).toBe(0);
};

describe("POST /api/v1/orders with no voucher", () => {
 it("behaves as before and touches no voucher data", async () => {
  await place().expect(201);
  expect(orders[0]).toMatchObject({ subtotal: 200000, discount: 0, shippingFee: 0, total: 200000 });
  expect(orders[0].promotionCode).toBeUndefined();
  expect(Promotion.findOne).not.toHaveBeenCalled();
  expect(Promotion.updateOne).not.toHaveBeenCalled();
 });

 it("ignores a forged discount alongside a voucher too", async () => {
  await place({ promotionCode: "SALE", expectedDiscount: 20000, discount: 199999, shippingFee: -1 }).expect(201);
  expect(orders[0]).toMatchObject({ discount: 20000, shippingFee: 0, total: 180000 });
 });
});

describe("POST /api/v1/orders with a voucher", () => {
 it.each([
  ["percent", {}, 20000],
  ["percent with a cap", { maxDiscount: 5000 }, 5000],
  ["fixed", { type: "fixed", value: 30000 }, 30000],
  ["fixed larger than the goods", { type: "fixed", value: 500000 }, 200000],
  ["100%", { value: 100 }, 200000],
 ])("stores the right totals for %s", async (_name, patch, discount) => {
  Object.assign(vouchers[0], patch);
  const { body } = await place({ promotionCode: " sale ", expectedDiscount: discount }).expect(201);
  expect(body.data.order).toMatchObject({ subtotal: 200000, discount, shippingFee: 0, total: 200000 - discount, promotionCode: "SALE" });
  expect(vouchers[0].usedCount).toBe(1);
  expect(redemptions[0]).toMatchObject({ code: "SALE", customerKey: "guest:0912345678", discount, status: "active", oncePerCustomer: true });
  expect(String(redemptions[0].orderId)).toBe(String(orders[0]._id));
 });

 it.each([
  ["expired", { startAt: new Date("2026-01-01"), endAt: new Date("2026-02-01") }],
  ["not yet started", { startAt: new Date("2027-01-01"), endAt: new Date("2027-02-01") }],
  ["turned off", { isActive: false }],
  ["used up", { usageLimit: 1, usedCount: 1 }],
 ])("refuses a voucher that is %s, without saying why", async (_name, patch) => {
  Object.assign(vouchers[0], patch);
  const before = vouchers[0].usedCount;
  const { body } = await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(409);
  expect(body.error.code).toBe("VOUCHER_INVALID");
  expect(body.message).toBe(MSG16);
  expect(orders).toHaveLength(0);
  expect(redemptions).toHaveLength(0);
  expect(vouchers[0].usedCount).toBe(before);
 });

 it("refuses an unknown code in the same words", async () => {
  const { body } = await place({ promotionCode: "NOPE", expectedDiscount: 0 }).expect(409);
  expect(body.message).toBe(MSG16);
  expectNothingReserved();
 });

 it("refuses a code that is not text", async () => {
  await place({ promotionCode: { $ne: null }, expectedDiscount: 0 }).expect(409);
  expectNothingReserved();
 });

 it("states the minimum only when the order is below it", async () => {
  vouchers[0].minOrderAmount = 500000;
  const { body } = await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(409);
  expect(body.error.code).toBe("VOUCHER_INVALID");
  expect(body.message.replace(/\s/g, " ")).toContain("500.000 ₫");
  expectNothingReserved();
 });

 it.each([["a different amount", 25000], ["no amount at all", undefined]])("refuses when the customer saw %s, returning the current one", async (_name, expectedDiscount) => {
  const { body } = await place({ promotionCode: "SALE", expectedDiscount }).expect(409);
  expect(body.error).toEqual({ code: "VOUCHER_CHANGED", currentDiscount: 20000 });
  expectNothingReserved();
 });

 it("refuses when an Admin edits the voucher between the check and the reservation", async () => {
  const original = Promotion.findOne.getMockImplementation();
  Promotion.findOne.mockImplementation((filter) => ({
   lean: async () => {
    const seen = { ...(await original(filter).lean()) };
    vouchers[0].updatedAt = new Date("2026-11-15T04:00:00Z");
    return seen;
   },
  }));
  const { body } = await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(409);
  expect(body.error.code).toBe("VOUCHER_INVALID");
  expectNothingReserved();
 });
});

describe("once per customer", () => {
 it("is enforced for a guest whose phone is formatted differently", async () => {
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(201);
  const { body } = await place({ promotionCode: "SALE", expectedDiscount: 20000, guestInfo: { ...guest, phone: "+84 912 345 678" } }).expect(409);
  expect(body.message).toBe(MSG16);
  expect(orders).toHaveLength(1);
  expect(vouchers[0].usedCount).toBe(1);
 });

 it("is enforced for an account, whatever phone it orders with", async () => {
  app.session.role = "customer";
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(201);
  expect(redemptions[0].customerKey).toBe(`user:${app.user()._id}`);
  await place({ promotionCode: "SALE", expectedDiscount: 20000, shippingAddress: { ...address, phone: "0987654321" } }).expect(409);
  expect(vouchers[0].usedCount).toBe(1);
 });

 it("gives the use back when the unique index catches a race the check missed", async () => {
  PromotionRedemption.create.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: 11000 }));
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(409);
  expectNothingReserved();
 });

 it("refuses a guest who cannot be identified, while allowing another voucher", async () => {
  await place({ promotionCode: "SALE", expectedDiscount: 20000, guestInfo: { name: "Khách", phone: "abc" }, shippingAddress: { ...address, phone: "abc" } }).expect(409);
  expectNothingReserved();
  vouchers[0].oncePerCustomer = false;
  await place({ promotionCode: "SALE", expectedDiscount: 20000, guestInfo: { name: "Khách", phone: "abc" }, shippingAddress: { ...address, phone: "abc" } }).expect(201);
  expect(redemptions[0].customerKey).toBe("guest:unknown");
 });

 it("does not limit a voucher that allows repeat use", async () => {
  vouchers[0].oncePerCustomer = false;
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(201);
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(201);
  expect(vouchers[0].usedCount).toBe(2);
 });
});

describe("when the order cannot be created", () => {
 it("restores the count and removes the redemption", async () => {
  Order.create.mockRejectedValueOnce(new Error("insert failed"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(500);
  expectNothingReserved();
 });
});

describe("cancelling", () => {
 const placed = async () => (await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(201)).body.data.order._id;

 it("gives the use back exactly once, and it can be redeemed again", async () => {
  const id = await placed();
  await app.send("PATCH", `/api/v1/orders/${id}/cancel`).expect(200);
  expect(vouchers[0].usedCount).toBe(0);
  expect(redemptions[0]).toMatchObject({ status: "released", releasedAt: NOW });
  await app.send("PATCH", `/api/v1/orders/${id}/cancel`).expect(400);
  expect(vouchers[0].usedCount).toBe(0);
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(201);
  expect(vouchers[0].usedCount).toBe(1);
 });

 it("gives the use back when Staff cancel the order, once", async () => {
  const id = await placed();
  app.session.role = "staff";
  await app.send("PATCH", `/api/v1/staff/orders/${id}/status`, { expectedStatus: "pending", orderStatus: "cancelled" }).expect(200);
  expect(vouchers[0].usedCount).toBe(0);
  expect(redemptions[0].status).toBe("released");
  expect(orders[0].discount).toBe(20000);
 });

 it("does not touch the count for a Staff change that is not a cancellation", async () => {
  const id = await placed();
  app.session.role = "staff";
  vi.spyOn(Product, "find").mockReturnValue({ lean: async () => [{ _id: productId, isActive: true, variants: [{ sku: "SKU-1", stock: 10, reservedStock: 0 }] }] });
  await app.send("PATCH", `/api/v1/staff/orders/${id}/status`, { expectedStatus: "pending", orderStatus: "confirmed" }).expect(200);
  expect(vouchers[0].usedCount).toBe(1);
 });

 it("never blocks the cancellation when the release fails", async () => {
  const id = await placed();
  PromotionRedemption.findOneAndUpdate.mockImplementationOnce(() => ({ lean: async () => { throw new Error("down"); } }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await app.send("PATCH", `/api/v1/orders/${id}/cancel`).expect(200);
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("[voucher]"), { orderId: id });
 });

 it("does nothing extra for an order with no voucher", async () => {
  const id = (await place().expect(201)).body.data.order._id;
  await app.send("PATCH", `/api/v1/orders/${id}/cancel`).expect(200);
  expect(Promotion.updateOne).not.toHaveBeenCalled();
 });
});

describe("a placed order is a snapshot", () => {
 it("is unchanged when the voucher is edited or removed later", async () => {
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(201);
  const snapshot = structuredClone(orders[0]);
  Object.assign(vouchers[0], { value: 50, isActive: false });
  vouchers = [];
  expect(orders[0]).toEqual(snapshot);
 });
});

describe("POST /api/v1/vouchers/quote", () => {
 it("returns the amounts and reserves nothing", async () => {
  const { body } = await quote({ code: " sale " }).expect(200);
  expect(body.data).toEqual({ code: "SALE", name: "Khuyến mãi", subtotal: 200000, discount: 20000, total: 180000 });
  expectNothingReserved();
  expect(Promotion.updateOne).not.toHaveBeenCalled();
 });

 it.each([
  ["unknown", "NOPE", {}],
  ["expired", "SALE", { startAt: new Date("2026-01-01"), endAt: new Date("2026-02-01") }],
  ["not started", "SALE", { startAt: new Date("2027-01-01"), endAt: new Date("2027-02-01") }],
  ["turned off", "SALE", { isActive: false }],
  ["used up", "SALE", { usageLimit: 1, usedCount: 1 }],
 ])("answers an %s code with the same 422 and MSG16", async (_name, code, patch) => {
  Object.assign(vouchers[0], patch);
  const { body } = await quote({ code }).expect(422);
  expect(body).toEqual({ success: false, message: MSG16, error: { code: "VOUCHER_INVALID" } });
 });

 it("states only the minimum for a valid code below it", async () => {
  vouchers[0].minOrderAmount = 500000;
  const { body } = await quote().expect(422);
  expect(body.message.replace(/\s/g, " ")).toContain("500.000 ₫");
 });

 it("checks once per customer when the guest's phone is known", async () => {
  await place({ promotionCode: "SALE", expectedDiscount: 20000 }).expect(201);
  await quote().expect(200);
  await quote({ phone: "0912 345 678" }).expect(422);
  await quote({ phone: "0987654321" }).expect(200);
 });

 it("prices from the database, ignoring prices sent by the client", async () => {
  const { body } = await quote({ items: [{ productId, variantSku: "SKU-1", qty: 2, unitPrice: 1, price: 1 }] }).expect(200);
  expect(body.data.subtotal).toBe(200000);
 });

 it("refuses a hidden product", async () => {
  Product.findById.mockResolvedValue({ _id: productId, name: "Ẩn", price: 100000, isActive: false, variants: [] });
  await quote().expect(404);
 });

 it("needs the CSRF token", async () => {
  const { body } = await app.send("POST", "/api/v1/vouchers/quote", { code: "SALE", items }, { csrf: false }).expect(403);
  expect(body.error.code).toBe("CSRF_INVALID");
 });

 it.each([[{ code: "" }], [{ code: 5 }], [{ items: [] }], [{ items: "x" }], [{ items: [{}] }]])("rejects the malformed body %j", async (patch) => {
  await quote(patch).expect(400);
 });

 it("limits guessing to 20 requests a minute", async () => {
  for (let count = 0; count < 20; count += 1) await quote({ code: "NOPE" }).expect(422);
  const { body } = await quote({ code: "NOPE" }).expect(429);
  expect(body.error.code).toBe("RATE_LIMITED");
 });

 it("counts each customer separately behind the local proxy, without believing other clients", () => {
  const client = (peer, forwarded) => ({ socket: { remoteAddress: peer }, get: () => forwarded });
  expect(quoteClientKey(client("127.0.0.1", "203.0.113.1"))).toBe("203.0.113.1");
  expect(quoteClientKey(client("127.0.0.1", "203.0.113.1"))).not.toBe(quoteClientKey(client("127.0.0.1", "203.0.113.2")));
  // Only the proxy's own entry counts, so a forged prefix changes nothing.
  expect(quoteClientKey(client("::ffff:127.0.0.1", "1.1.1.1, 203.0.113.1"))).toBe("203.0.113.1");
  // A direct caller cannot pick its own key.
  expect(quoteClientKey(client("198.51.100.7", "1.1.1.1"))).toBe("198.51.100.7");
 });
});

describe("GET /api/v1/vouchers/public", () => {
 const row = { code: "SALE", name: "Khuyến mãi", type: "percent", value: 10, maxDiscount: 5000, minOrderAmount: 0, endAt: new Date("2026-11-30T17:00:00.000Z"), usedCount: 7, usageLimit: 100, oncePerCustomer: true };
 let query;
 beforeEach(() => {
  query = { sort: vi.fn(() => query), limit: vi.fn(() => query), select: vi.fn(() => query), lean: vi.fn(async () => [row]) };
  vi.spyOn(Promotion, "find").mockReturnValue(query);
 });

 it("exposes only what the storefront shows, never usage figures", async () => {
  const { body } = await app.send("GET", "/api/v1/vouchers/public").expect(200);
  expect(body.data.items).toEqual([{ code: "SALE", name: "Khuyến mãi", type: "percent", value: 10, maxDiscount: 5000, minOrderAmount: 0, endDate: "2026-11-30" }]);
  expect(query.select).toHaveBeenCalledWith(expect.not.stringContaining("used"));
 });

 it("lists only public vouchers that can be used now, 6 by default", async () => {
  await app.send("GET", "/api/v1/vouchers/public").expect(200);
  expect(Promotion.find.mock.calls[0][0]).toMatchObject({ isPublic: true, isActive: { $ne: false }, startAt: { $lte: NOW }, endAt: { $gt: NOW } });
  expect(Promotion.find.mock.calls[0][0].$expr).toBeDefined();
  expect(query.limit).toHaveBeenCalledWith(6);
 });

 it("lets the voucher page ask for more, up to a limit", async () => {
  await app.send("GET", "/api/v1/vouchers/public?limit=50").expect(200);
  expect(query.limit).toHaveBeenCalledWith(50);
  await app.send("GET", "/api/v1/vouchers/public?limit=51").expect(400);
 });

 it("is open to guests", async () => {
  app.session.role = null;
  await app.send("GET", "/api/v1/vouchers/public").expect(200);
 });
});

it("keeps MSG16 exactly as the spec words it", () => {
 expect(VOUCHER_INVALID_MESSAGE).toBe(MSG16);
});
