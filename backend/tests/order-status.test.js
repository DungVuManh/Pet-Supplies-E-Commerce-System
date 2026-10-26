import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository, User } from "../src/models/user.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";

const id = "a".repeat(24), actor = "b".repeat(24), productId = "c".repeat(24);
const chain = (value) => ({ select() { return this; }, lean: async () => value });
let app, order, role, update, stock, auth;
beforeEach(() => {
  app = createApp(parseEnvironment({ NODE_ENV: "test" }));
  role = "staff"; stock = 10;
  order = { _id: id, orderCode: "TEST-ORDER", channel: "online", orderStatus: "pending",
    paymentMethod: "COD", paymentStatus: "unpaid", guestInfo: { name: "Khách", phone: "0912345678" },
    shippingAddress: { recipientName: "Khách", phone: "0912345678", province: "TP.HCM", district: "Q1", ward: "P1", street: "1 A" },
    items: [{ productId, variantSku: "SKU-1", name: "Sản phẩm", qty: 2, unitPrice: 10000 }],
    subtotal: 20000, total: 20000, statusHistory: [], createdAt: new Date(),
  };
  auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "staff" }) };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({ _id: actor, role, fullName: "Staff" }));
  vi.spyOn(Order, "findById").mockImplementation(() => chain(order));
  vi.spyOn(Product, "find").mockImplementation(() => chain([{ _id: productId, isActive: true,
    variants: [{ sku: "SKU-1", stock, reservedStock: 1 }] }]));
  vi.spyOn(User, "find").mockReturnValue(chain([{ _id: actor, fullName: "Staff" }]));
  update = vi.spyOn(Order, "updateOne").mockImplementation(async (filter, operation, options) => {
    expect(options).toEqual({ runValidators: true });
    if (filter.orderStatus !== order.orderStatus || filter.paymentStatus !== order.paymentStatus) return { modifiedCount: 0 };
    expect(filter.channel).toBe("online");
    expect(filter.creationState).toEqual({ $ne: "pending" });
    Object.assign(order, operation.$set);
    order.statusHistory.push(operation.$push.statusHistory);
    return { modifiedCount: 1 };
  });
});
afterEach(() => vi.restoreAllMocks());
async function browser() {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
  const cookie = `petly-session=test; ${csrf.headers["set-cookie"][0].split(";")[0]}`;
  const send = (body = { expectedStatus: "pending", orderStatus: "confirmed" }, target = id) =>
    agent.patch(`/api/v1/staff/orders/${target}/status`).set("Cookie", cookie)
      .set("Origin", "http://localhost:3000").set("X-CSRF-Token", csrf.body.data.csrfToken).send(body);
  return { agent, send, cookie };
}

describe("Staff order status", () => {
  it("persists every permitted forward step and one history entry per step without changing payment", async () => {
    const { send } = await browser();
    for (const [from, to] of [["pending", "confirmed"], ["confirmed", "processing"], ["processing", "shipping"]]) {
      const response = await send({ expectedStatus: from, orderStatus: to }).expect(200);
      expect(response.body.data.order).toEqual({ id, orderStatus: to });
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(order.statusHistory.at(-1)).toMatchObject({ from, to, by: actor, at: expect.any(Date) });
    }
    expect(order.statusHistory).toHaveLength(3);
    expect(order.paymentStatus).toBe("unpaid");
    expect(order.shipping).toBeUndefined();
    expect(update.mock.calls.every(([, change]) => Object.keys(change.$set).join() === "orderStatus")).toBe(true);
  });
  it("stores optional manual shipping details and exposes permitted next states on detail", async () => {
    const { send, agent, cookie } = await browser();
    order.orderStatus = "processing";
    await send({ expectedStatus: "processing", orderStatus: "shipping", shipping: { carrier: " Shipper tự do " } }).expect(200);
    expect(order.shipping).toEqual({ carrier: "Shipper tự do", trackingNumber: "" });
    const response = await agent.get(`/api/v1/staff/orders/${id}`).set("Cookie", cookie).expect(200);
    expect(response.body.data.order.allowedNextStatuses).toEqual([]);
    expect(response.body.data.order.shipping).toEqual(order.shipping);
  });
  it("keeps legacy delivered orders readable as completed without rewriting history", async () => {
    const { agent, cookie } = await browser();
    order.orderStatus = "delivered";
    order.statusHistory = [{ from: "shipping", to: "delivered", by: actor, at: new Date() }];
    const response = await agent.get(`/api/v1/staff/orders/${id}`).set("Cookie", cookie).expect(200);
    expect(response.body.data.order.orderStatus).toBe("completed");
    expect(response.body.data.order.statusHistory[0]).toMatchObject({ from: "shipping", to: "completed" });
    expect(response.body.data.order.allowedNextStatuses).toEqual([]);
    expect(order.orderStatus).toBe("delivered");
    expect(order.statusHistory[0].to).toBe("delivered");
    expect(update).not.toHaveBeenCalled();
  });
  it("includes legacy delivered orders in completed filters and summary counts", async () => {
    const { agent, cookie } = await browser();
    order.orderStatus = "delivered";
    vi.spyOn(Order, "aggregate").mockResolvedValue([
      { _id: "completed", count: 2 }, { _id: "delivered", count: 1 }, { _id: "cancelled", count: 1 },
    ]);
    const listQuery = { select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => [order] };
    const find = vi.spyOn(Order, "find").mockReturnValue(listQuery);
    const count = vi.spyOn(Order, "countDocuments").mockResolvedValue(3);
    const response = await agent.get("/api/v1/staff/orders?status=completed").set("Cookie", cookie).expect(200);
    expect(find).toHaveBeenCalledWith({ $and: [
      { creationState: { $nin: ["pending"] } }, { orderStatus: { $in: ["completed", "delivered"] } },
    ] });
    expect(count).toHaveBeenCalledWith(find.mock.calls[0][0]);
    expect(response.body.data.items[0].orderStatus).toBe("completed");
    expect(response.body.data.pagination.total).toBe(3);
    expect(response.body.data.summary).toEqual({ all: 4, statusCounts: {
      pending: 0, confirmed: 0, processing: 0, shipping: 0, completed: 3, cancelled: 1,
    } });
  });
  for (const status of ["pending", "confirmed"]) it(`allows cancellation only from ${status}`, async () => {
    const { send } = await browser(); order.orderStatus = status;
    await send({ expectedStatus: status, orderStatus: "cancelled" }).expect(200);
    expect(order.statusHistory).toHaveLength(1);
  });
  it("rejects skipping, reversing, terminal/offline changes and the removed delivered step", async () => {
    const { send } = await browser();
    for (const [from, to] of [["pending", "shipping"], ["processing", "confirmed"], ["processing", "cancelled"],
      ["shipping", "cancelled"],
      ["delivered", "processing"], ["completed", "processing"], ["cancelled", "confirmed"]]) {
      order.orderStatus = from;
      await send({ expectedStatus: from, orderStatus: to }).expect(409);
    }
    for (const from of ["pending", "confirmed", "processing", "shipping"]) {
      order.orderStatus = from;
      await send({ expectedStatus: from, orderStatus: "completed" }).expect(400);
    }
    order.orderStatus = "shipping";
    await send({ expectedStatus: "shipping", orderStatus: "delivered" }).expect(400);
    order.channel = "offline"; order.orderStatus = "pending";
    await send().expect(409);
    expect(update).not.toHaveBeenCalled();
  });
  it("guards confirmation against unpaid ONLINE, missing information and insufficient stock including duplicate lines", async () => {
    const { send } = await browser();
    order.paymentMethod = "ONLINE";
    expect((await send().expect(409)).body.error.code).toBe("PAYMENT_NOT_VERIFIED");
    order.paymentMethod = "COD"; order.shippingAddress = undefined;
    expect((await send().expect(409)).body.error.code).toBe("ORDER_NOT_CONFIRMABLE");
    order.shippingAddress = { recipientName: "Khách", phone: "0912345678", province: "HCM", district: "Q1", ward: "P1", street: "1 A" };
    stock = 2;
    expect((await send().expect(409)).body.error.code).toBe("OUT_OF_STOCK");
    stock = 4; order.items.push({ ...order.items[0] }); order.subtotal = order.total = 40000;
    expect((await send().expect(409)).body.error.code).toBe("OUT_OF_STOCK");
    expect(update).not.toHaveBeenCalled();
  });
  it("rejects stale/repeated and concurrent updates without duplicate history", async () => {
    const { send } = await browser();
    await send().expect(200); await send().expect(409);
    expect(order.statusHistory).toHaveLength(1);
    order.orderStatus = "pending"; update.mockResolvedValueOnce({ modifiedCount: 0 });
    expect((await send().expect(409)).body.error.code).toBe("ORDER_STATUS_CONFLICT");
    expect(order.statusHistory).toHaveLength(1);
  });
  it("rejects unknown fields, shipping outside the shipping step, invalid IDs and oversize text", async () => {
    const { send } = await browser();
    for (const patch of [{ by: actor }, { paymentStatus: "paid" }, { shipping: {} }, { expectedStatus: { $ne: "pending" } }]) {
      await send({ expectedStatus: "pending", orderStatus: "confirmed", ...patch }).expect(400);
    }
    await send(undefined, "invalid").expect(400);
    await send({ expectedStatus: "processing", orderStatus: "shipping", shipping: { carrier: "x".repeat(101) } }).expect(400);
    expect(update).not.toHaveBeenCalled();
  });
  it("hides missing/pending-creation orders and masks uncertain persistence errors", async () => {
    const { send } = await browser(); order.creationState = "pending";
    await send().expect(404); order.creationState = "complete";
    update.mockRejectedValueOnce(new Error("private driver information"));
    const response = await send().expect(503);
    expect(JSON.stringify(response.body)).not.toContain("private driver");
    order = null; await send().expect(404);
  });
  it("enforces exact role, revocation, JSON, Origin and CSRF before writes", async () => {
    const { send, cookie } = await browser();
    await request(app).patch(`/api/v1/staff/orders/${id}/status`).send({}).expect(401);
    for (const value of ["customer", "admin", "unknown"]) { role = value; await send().expect(403); }
    role = "staff";
    await request(app).patch(`/api/v1/staff/orders/${id}/status`).set("Cookie", cookie).send({}).expect(403);
    await request(app).patch(`/api/v1/staff/orders/${id}/status`).set("Cookie", cookie).set("Origin", "http://localhost:3000")
      .type("form").send({}).expect(415);
    auth.verifySessionCookie.mockRejectedValueOnce({ code: "auth/session-cookie-revoked" });
    await send().expect(401);
    expect(update).not.toHaveBeenCalled();
  });
});
