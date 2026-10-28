import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository } from "../src/models/user.model.js";
import { Order } from "../src/models/order.model.js";

const id = "a".repeat(24);
const customerId = "b".repeat(24);
const anotherCustomerId = "c".repeat(24);
const chain = (value) => ({ lean: async () => value });

let app;
let order;
let role;
let currentUserId;
let update;
let auth;

beforeEach(() => {
  app = createApp(parseEnvironment({ NODE_ENV: "test" }));
  role = "customer";
  currentUserId = customerId;
  order = {
    _id: id,
    customerId,
    channel: "online",
    orderStatus: "shipping",
    creationState: "complete",
    statusHistory: [],
  };
  auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "customer" }) };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({
    _id: currentUserId,
    role,
    fullName: "Customer",
  }));
  vi.spyOn(Order, "findOne").mockImplementation((filter) =>
    chain(String(filter.customerId) === customerId ? order : null),
  );
  vi.spyOn(Order, "findById").mockImplementation(() => chain(order));
  update = vi.spyOn(Order, "updateOne").mockImplementation(async (filter, operation, options) => {
    expect(options).toEqual({ runValidators: true });
    if (filter.orderStatus !== order.orderStatus || String(filter.customerId) !== customerId) {
      return { modifiedCount: 0 };
    }
    expect(filter).toMatchObject({ _id: id, channel: "online", orderStatus: "shipping" });
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
  const confirm = (target = id) =>
    agent.patch(`/api/v1/orders/${target}/receipt-confirmation`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", csrf.body.data.csrfToken)
      .send({});
  return { confirm, cookie };
}

describe("Customer receipt confirmation", () => {
  it("lets the owning customer complete only a shipping order and records the customer", async () => {
    const { confirm } = await browser();
    const response = await confirm().expect(200);

    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.data.order).toEqual({ id, orderStatus: "completed" });
    expect(order.statusHistory).toEqual([
      expect.objectContaining({ from: "shipping", to: "completed", by: customerId, at: expect.any(Date) }),
    ]);
  });

  it("does not disclose or change another customer's order", async () => {
    currentUserId = anotherCustomerId;
    const { confirm, cookie } = await browser();
    expect((await confirm().expect(404)).body.error.code).toBe("ORDER_NOT_FOUND");
    await request(app).get(`/api/v1/orders/${id}`).set("Cookie", cookie).expect(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects non-shipping, offline, pending-creation, and repeated confirmations", async () => {
    const { confirm } = await browser();
    for (const patch of [
      { orderStatus: "processing" },
      { channel: "offline" },
      { creationState: "pending" },
    ]) {
      Object.assign(order, { orderStatus: "shipping", channel: "online", creationState: "complete" }, patch);
      await confirm().expect(patch.creationState === "pending" ? 404 : 409);
    }
    Object.assign(order, { orderStatus: "shipping", channel: "online", creationState: "complete" });
    await confirm().expect(200);
    await confirm().expect(409);
    expect(order.statusHistory).toHaveLength(1);
  });

  it("requires an authenticated customer and the existing mutation protections", async () => {
    const { confirm, cookie } = await browser();
    await request(app).patch(`/api/v1/orders/${id}/receipt-confirmation`).send({}).expect(401);
    for (const value of ["staff", "admin"]) {
      role = value;
      await confirm().expect(403);
    }
    role = "customer";
    await request(app).patch(`/api/v1/orders/${id}/receipt-confirmation`)
      .set("Cookie", cookie)
      .send({})
      .expect(403);
    await request(app).patch(`/api/v1/orders/${id}/receipt-confirmation`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .type("form")
      .send({})
      .expect(415);
    expect(update).not.toHaveBeenCalled();
  });
});
