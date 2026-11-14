import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { User } from "../src/models/user.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const linh = { _id: new mongoose.Types.ObjectId(), fullName: "Đỗ Khánh Linh", phone: "0945678901", role: "customer", firebaseUid: "secret-uid" };
const staff = { _id: new mongoose.Types.ObjectId(), fullName: "Vũ Đức Long", phone: "0987654321", role: "staff", firebaseUid: "staff-uid" };
const item = (sku, fields = {}) => ({ productId: new mongoose.Types.ObjectId(), variantSku: sku, name: `Sản phẩm ${sku}`, unitPrice: 100000, qty: 2, ...fields });

const base = {
 orderCode: "PA-ONLINE", customerId: linh._id, channel: "online", orderStatus: "shipping", paymentMethod: "ONLINE", paymentStatus: "paid",
 paidAmount: 150000, subtotal: 200000, discount: 50000, total: 150000, promotionCode: "PET50K", createdAt: new Date("2026-11-01T03:00:00Z"),
 items: [item("RC-1", { image: "/images/products/royal-canin-mini-adult.png" }), item("GONE-1", { qty: 1, unitPrice: 0 })],
 shippingAddress: { recipientName: "Trần Bảo Ngọc", phone: "0912 456 789", street: "12 Lê Lợi", ward: "Bến Nghé", district: "Quận 1", province: "TP.HCM" },
 shipping: { carrier: "GHN", trackingNumber: "GHN123" },
 statusHistory: [
  { from: "confirmed", to: "shipping", by: staff._id, at: new Date("2026-11-02T03:00:00Z") },
  { from: "pending", to: "confirmed", by: staff._id, at: new Date("2026-11-01T05:00:00Z") },
 ],
 creationRequestHash: "hash-should-not-leak",
};

let orders;
let admin;

const get = (code) => admin.send("GET", `/api/v1/admin/orders/${code}`);
const query = (rows) => {
 const chain = { select: () => chain, lean: async () => rows };
 return chain;
};

beforeEach(() => {
 orders = [
  base,
  { orderCode: "PA-GUEST", channel: "online", orderStatus: "delivered", paymentMethod: "COD", subtotal: 100000, total: 130000, shippingFee: 30000,
   createdAt: new Date("2026-10-01T03:00:00Z"), items: [item("RC-1", { qty: 1 })], guestInfo: { name: "Khách vãng lai", phone: "0900111222", email: "guest@example.com" },
   shippingAddress: { recipientName: "null", phone: "null", street: "null", ward: "null", district: "null", province: "null" } },
  { orderCode: "PA-STORE", channel: "offline", orderStatus: "completed", paymentMethod: "CASH", paymentStatus: "paid", subtotal: 100000, total: 100000,
   createdByStaffId: staff._id, createdAt: new Date("2026-10-05T03:00:00Z"), items: [item("RC-1", { qty: 1 })] },
  { orderCode: "PA-INFLIGHT", creationState: "pending", channel: "offline", orderStatus: "completed", items: [item("RC-1")] },
 ];
 admin = createAdminTestApp();
 vi.spyOn(Order, "findOne").mockImplementation((filter) => ({
  lean: async () => orders.find((order) => order.orderCode === filter.orderCode && order.creationState !== "pending") ?? null,
 }));
 vi.spyOn(User, "find").mockImplementation(({ _id }) => query([linh, staff].filter((user) => _id.$in.includes(String(user._id)))));
 vi.spyOn(Product, "find").mockImplementation(() => query([{ variants: [{ sku: "RC-1" }] }]));
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/orders/:orderCode", () => {
 it("returns an online order with amounts, voucher, payment, customer, address, shipping, and history", async () => {
  const { body } = await get("PA-ONLINE").expect(200);
  expect(body.data).toEqual({
   orderCode: "PA-ONLINE", createdAt: "2026-11-01T03:00:00.000Z", channel: "online", status: "shipping",
   paymentMethod: "ONLINE", paymentStatus: "paid", paidAmount: 150000, needsReview: false,
   subtotal: 200000, discount: 50000, shippingFee: null, total: 150000, promotionCode: "PET50K",
   customer: { name: "Trần Bảo Ngọc", phone: "0912 456 789", email: null, accountId: String(linh._id), isGuest: false },
   shippingAddress: { recipientName: "Trần Bảo Ngọc", phone: "0912 456 789", street: "12 Lê Lợi", ward: "Bến Nghé", district: "Quận 1", province: "TP.HCM" },
   shipping: { carrier: "GHN", trackingNumber: "GHN123" },
   createdByStaff: null,
   items: [
    { sku: "RC-1", name: "Sản phẩm RC-1", unitPrice: 100000, qty: 2, lineTotal: 200000, image: "/images/products/royal-canin-mini-adult.png", productExists: true },
    { sku: "GONE-1", name: "Sản phẩm GONE-1", unitPrice: 0, qty: 1, lineTotal: 0, image: null, productExists: false },
   ],
   statusHistory: [
    { from: "pending", to: "confirmed", at: "2026-11-01T05:00:00.000Z", actorName: "Vũ Đức Long" },
    { from: "confirmed", to: "shipping", at: "2026-11-02T03:00:00.000Z", actorName: "Vũ Đức Long" },
   ],
  });
 });

 it("never returns secrets or internal fields", async () => {
  const text = JSON.stringify((await get("PA-ONLINE").expect(200)).body);
  for (const secret of ["secret-uid", "staff-uid", "hash-should-not-leak", "firebaseUid", "rawResult", "creationRequest"]) expect(text).not.toContain(secret);
 });

 it("shows a guest order with its own details, an older shipping fee, and no address made of \"null\"", async () => {
  const { body } = await get("PA-GUEST").expect(200);
  expect(body.data).toMatchObject({
   status: "completed", shippingFee: 30000, paymentStatus: null,
   customer: { name: "Khách vãng lai", phone: "0900111222", email: "guest@example.com", accountId: null, isGuest: true },
   shippingAddress: null,
  });
 });

 it("names the Staff member of an in-store sale and links no account", async () => {
  const { body } = await get("PA-STORE").expect(200);
  expect(body.data).toMatchObject({ channel: "offline", createdByStaff: "Vũ Đức Long", customer: { name: "Khách lẻ", accountId: null }, shippingAddress: null, shipping: null });
 });

 it.each(["PA-NONE", "PA-INFLIGHT", "bad code!", "x".repeat(61)])("returns 404 for %s", async (code) => {
  await get(encodeURIComponent(code)).expect(404);
 });

 it("refuses a guest, a Customer, and Staff", async () => {
  admin.session.role = null;
  await get("PA-ONLINE").expect(401);
  for (const role of ["customer", "staff"]) {
   admin.session.role = role;
   await get("PA-ONLINE").expect(403);
  }
 });
});
