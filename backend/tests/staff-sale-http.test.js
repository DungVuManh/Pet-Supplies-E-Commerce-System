import mongoose from "mongoose";
import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository, User } from "../src/models/user.model.js";
import { Product } from "../src/models/product.model.js";
import { Order } from "../src/models/order.model.js";
import { Payment } from "../src/models/payment.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";

const actor = "b".repeat(24), customerId = "c".repeat(24);
const key = "12345678-1234-4234-8234-123456789abc";
const body = { customer: { name: "Khách tại quầy", phone: "0912345678" },
 items: [{ sku: "SKU-1", qty: 2, expectedPrice: 10000 }], cashReceived: true };
const session = { testSession: true };
let role, stock, saved, app, transaction, auth, orderLookup;
function chain(value) {
 const q = { select: () => q, session: () => q, sort: () => q,
  skip: () => q, limit: () => q, lean: async () => value };
 return q;
}
beforeEach(() => {
 role = "staff"; stock = 5; saved = [];
 app = createApp(parseEnvironment({ NODE_ENV: "test" }));
 auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "staff-uid" }) };
 vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
 vi.spyOn(userRepository, "findByUid").mockImplementation(async () => role === "missing" ? null : ({
  _id: actor, role, fullName: "Staff test", email: "staff@example.test", phone: "0912345678",
 }));
 orderLookup = vi.spyOn(Order, "findOne").mockImplementation((filter) => chain(saved.find((d) =>
  d.model === "Order" && String(d.doc.createdByStaffId) === String(filter.createdByStaffId)
  && d.doc.creationRequestId === filter.creationRequestId)?.doc || null));
 vi.spyOn(User, "findOne").mockReturnValue(chain({ fullName: "Customer test", phone: "0901234567", email: "c@example.test" }));
 vi.spyOn(User, "find").mockReturnValue(chain([{ _id: customerId, fullName: "Customer test", phone: "0901234567", email: "c@example.test" }]));
 vi.spyOn(Product, "find").mockImplementation(() => chain([{ _id: "a".repeat(24), name: "Product test",
  variants: [{ sku: "SKU-1", label: "1 kg", price: 10000, stock, reservedStock: 2 }] }]));
 vi.spyOn(Product, "updateOne").mockImplementation(async (filter, update, options) => {
  expect(options.session).toBe(session);
  const condition = filter.variants.$elemMatch;
  if (stock < condition.stock.$gte) return { modifiedCount: 0 };
  stock += update.$inc["variants.$.stock"];
  return { modifiedCount: 1 };
 });
 for (const model of [Order, Payment, AuditLog]) vi.spyOn(model.prototype, "save").mockImplementation(async function (options) {
  expect(options.session).toBe(session);
  await this.validate();
  saved.push({ model: model.modelName, doc: this.toObject() });
  return this;
 });
 transaction = vi.spyOn(mongoose.connection, "transaction").mockImplementation(async (callback) => {
  const previous = stock, length = saved.length;
  try { return await callback(session); }
  catch (error) { stock = previous; saved.length = length; throw error; }
 });
});
afterEach(() => vi.restoreAllMocks());
async function browser() {
 const agent = request.agent(app);
 const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
 const send = (payload = body, requestId = key) => agent.post("/api/v1/staff/orders")
  .set("Cookie", "petly-session=test-session; " + csrf.headers["set-cookie"][0].split(";")[0])
  .set("Origin", "http://localhost:3000").set("X-CSRF-Token", csrf.body.data.csrfToken)
  .set("Idempotency-Key", requestId).send(payload);
 return { agent, send };
}
describe("Staff sale HTTP and transaction orchestration", () => {
 it("saves guest snapshots, exact server prices, stock, payment and audit in one transaction", async () => {
  const { send } = await browser();
  const response = await send().expect(201);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(stock).toBe(3);
  expect(saved.map((d) => d.model)).toEqual(["Order", "Payment", "AuditLog"]);
  const order = saved[0].doc;
  expect(order).toMatchObject({ subtotal: 20000, total: 20000, channel: "offline",
   orderStatus: "completed", paymentStatus: "paid", paymentMethod: "CASH", guestInfo: body.customer });
  expect(order.shippingAddress).toBeUndefined();
  expect(String(order.createdByStaffId)).toBe(actor);
  expect(saved[1].doc.amount).toBe(20000);
  expect(saved[2].doc.after).not.toHaveProperty("phone");
  expect(response.body.data.order).not.toHaveProperty("creationRequestHash");
 });
 it("resolves a Customer from DB rather than trusting contact details or creating a User", async () => {
  const { send } = await browser();
  await send({ customerId, items: body.items, cashReceived: true }).expect(201);
  expect(saved[0].doc.guestInfo.name).toBe("Customer test");
  expect(String(saved[0].doc.customerId)).toBe(customerId);
  expect(User.findOne).toHaveBeenCalledWith({ _id: customerId, role: "customer" });
 });
 it("replays once, rejects payload changes, and recovers only the actor's own receipt", async () => {
  const { agent, send } = await browser();
  const first = await send().expect(201);
  const second = await send().expect(200);
  expect(second.body).toEqual(first.body);
  expect(stock).toBe(3); expect(transaction).toHaveBeenCalledTimes(1);
  await send({ ...body, items: [{ ...body.items[0], qty: 1 }] }).expect(409);
  await agent.get(`/api/v1/staff/orders/creation/${key}`).set("Cookie", "petly-session=test-session").expect(200);
  expect(orderLookup).toHaveBeenLastCalledWith({ createdByStaffId: actor, creationRequestId: key });
 });
 it("does not retry a duplicate-key commit as a second sale", async () => {
  const { send } = await browser();
  await send().expect(201);
  orderLookup.mockReturnValueOnce(chain(null));
  transaction.mockRejectedValueOnce({ code: 11000 });
  await send().expect(200);
  expect(stock).toBe(3); expect(saved).toHaveLength(3);
 });
 for (const failureModel of [Payment, AuditLog]) it(`aborts when ${failureModel.modelName} fails after stock/order writes`, async () => {
  failureModel.prototype.save.mockRejectedValueOnce(new Error("private driver details"));
  const { send } = await browser();
  const response = await send().expect(503);
  expect(stock).toBe(5); expect(saved).toEqual([]);
  expect(JSON.stringify(response.body)).not.toContain("private driver");
 });
 it("rejects changed price, missing SKU and unavailable stock without a saved order", async () => {
  const { send } = await browser();
  for (const item of [{ ...body.items[0], expectedPrice: 1 }, { ...body.items[0], sku: "missing" }, { ...body.items[0], qty: 4 }]) {
   await send({ ...body, items: [item] }).expect(409);
   expect(saved).toEqual([]); expect(stock).toBe(5);
  }
 });
 it("fails closed on standalone MongoDB without attempting non-transactional writes", async () => {
  transaction.mockRejectedValueOnce({ code: 20 });
  const { send } = await browser();
  const response = await send().expect(503);
  expect(response.body.error.code).toBe("TRANSACTIONS_REQUIRED");
  expect(saved).toEqual([]); expect(stock).toBe(5);
 });
 it("requires JSON/Origin/CSRF, validates body and request key", async () => {
  await request(app).post("/api/v1/staff/orders").set("Cookie", "petly-session=test-session").send(body).expect(403);
  const { send } = await browser();
  await send({ ...body, total: 1 }).expect(400);
  await send(body, "bad-key").expect(400);
  expect(transaction).not.toHaveBeenCalled();
 });
 for (const denied of ["customer", "admin", "unknown", "missing"]) it(`rejects ${denied} on all Staff sale endpoints`, async () => {
  role = denied;
  const status = role === "missing" ? 409 : 403;
  for (const url of ["order-products", "order-customers?query=test", `orders/creation/${key}`]) {
   const response = await request(app).get(`/api/v1/staff/${url}`).set("Cookie", "petly-session=test-session").expect(status);
   expect(response.headers["cache-control"]).toBe("no-store");
  }
  const { send } = await browser(); await send().expect(status);
  expect(transaction).not.toHaveBeenCalled();
 });
 it("rejects guests, revoked sessions and service failures before writing", async () => {
  await request(app).post("/api/v1/staff/orders").send(body).expect(401);
  const { send } = await browser();
  auth.verifySessionCookie.mockRejectedValueOnce({ code: "auth/session-cookie-revoked" });
  await send().expect(401);
  auth.verifySessionCookie.mockRejectedValueOnce({ code: "auth/internal-error" });
  await send().expect(503);
  expect(saved).toEqual([]);
 });
 it("bounds lookup results and projects only necessary Customer fields", async () => {
  const response = await request(app).get("/api/v1/staff/order-customers?query=Customer")
   .set("Cookie", "petly-session=test-session").expect(200);
  expect(Object.keys(response.body.data.items[0]).sort()).toEqual(["email", "fullName", "id", "phone"]);
  expect(User.find.mock.calls[0][0].role).toBe("customer");
  await request(app).get("/api/v1/staff/order-customers?query=a")
   .set("Cookie", "petly-session=test-session").expect(400);
 });
});
