import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository } from "../src/models/user.model.js";
import { Product } from "../src/models/product.model.js";

const sku = "REAL-SKU-1", id = "a".repeat(24);
const baseline = { physical: 10, reserved: 3, status: "active", description: "Mô tả ban đầu" };
const body = () => ({ physical: 12, status: "hidden", description: " Mô tả mới ", expected: { ...baseline } });
let app, product, role, update, auth;
const chain = (value) => ({ populate() { return this; }, lean: async () => value });
beforeEach(() => {
  app = createApp(parseEnvironment({ NODE_ENV: "test" })); role = "staff";
  product = { _id: id, name: "Sản phẩm thật", categoryId: { name: "Thức ăn" }, isActive: true, description: baseline.description,
    variants: [{ sku, label: "1 kg", price: 100000, stock: 10, reservedStock: 3 },
      { sku: "OTHER-SKU", label: "2 kg", price: 180000, stock: 7, reservedStock: 1 }] };
  auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "staff" }) };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({ _id: "b".repeat(24), role }));
  vi.spyOn(Product, "findOne").mockImplementation((filter) => chain(product?.variants.some((v) => v.sku === filter["variants.sku"]) ? structuredClone(product) : null));
  update = vi.spyOn(Product, "updateOne").mockImplementation(async (filter, operation, options) => {
    expect(options).toEqual({ runValidators: true });
    const match = filter.variants.$elemMatch;
    const variant = product.variants.find((v) => v.sku === match.sku);
    if (variant.stock !== match.stock || variant.reservedStock !== match.reservedStock
      || product.description !== filter.description || product.isActive !== filter.isActive) return { matchedCount: 0 };
    expect(Object.keys(operation.$set).sort()).toEqual(["description", "isActive", "variants.$.stock"]);
    variant.stock = operation.$set["variants.$.stock"];
    product.description = operation.$set.description; product.isActive = operation.$set.isActive;
    return { matchedCount: 1, modifiedCount: 1 };
  });
});
afterEach(() => vi.restoreAllMocks());
async function browser() {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
  const cookie = `petly-session=test; ${csrf.headers["set-cookie"][0].split(";")[0]}`;
  const send = (input = body(), target = sku) => agent.patch(`/api/v1/staff/products/${encodeURIComponent(target)}`)
    .set("Cookie", cookie).set("Origin", "http://localhost:3000").set("X-CSRF-Token", csrf.body.data.csrfToken).send(input);
  return { agent, send, cookie };
}

describe("Staff product updates", () => {
  it("updates one SKU stock plus shared status/description and reads persisted data", async () => {
    const { agent, send, cookie } = await browser();
    const response = await send().expect(200);
    expect(response.body).toEqual({ success: true, data: { sku } });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(product.variants[0]).toMatchObject({ stock: 12, reservedStock: 3, price: 100000 });
    expect(product.variants[1]).toMatchObject({ stock: 7, reservedStock: 1, price: 180000 });
    const detail = await agent.get(`/api/v1/staff/products/${sku}`).set("Cookie", cookie).expect(200);
    expect(detail.body.data).toMatchObject({ physical: 12, reserved: 3, availableStock: 9, status: "hidden", description: "Mô tả mới" });
  });
  it("accepts the reserved boundary and zero when no units are reserved", async () => {
    const { send } = await browser();
    await send({ ...body(), physical: 3 }).expect(200);
    product.variants[0].reservedStock = 0;
    await send({ physical: 0, status: "hidden", description: "Mô tả mới", expected: {
      physical: 3, reserved: 0, status: "hidden", description: "Mô tả mới",
    } }).expect(200);
    expect(product.variants[0].stock).toBe(0);
  });
  it("rejects quantities below actual reserved stock without writing", async () => {
    const { send } = await browser();
    expect((await send({ ...body(), physical: 2 }).expect(409)).body.error.code).toBe("STOCK_BELOW_RESERVED");
    expect(update).not.toHaveBeenCalled();
  });
  it("rejects stale stock, reservation, description and status snapshots", async () => {
    const { send } = await browser();
    for (const patch of [{ physical: 9 }, { reserved: 2 }, { description: "Cũ" }, { status: "hidden" }]) {
      expect((await send({ ...body(), expected: { ...baseline, ...patch } }).expect(409)).body.error.code).toBe("PRODUCT_CHANGED");
    }
    expect(update).not.toHaveBeenCalled();
  });
  it("does not overwrite concurrent sales/reservations/content updates or duplicate requests", async () => {
    const { send } = await browser();
    const write = update.getMockImplementation();
    update.mockImplementationOnce(async (...args) => { product.variants[0].stock--; return write(...args); });
    await send().expect(409); expect(product.variants[0].stock).toBe(9);
    expect(product.description).toBe(baseline.description);
    product.variants[0].stock = 10;
    await send().expect(200); await send().expect(409);
    expect(product.variants[0].stock).toBe(12);
  });
  it("rejects invalid numbers, empty/long descriptions and fields outside Staff permission", async () => {
    const { send } = await browser();
    for (const patch of [{ physical: -1 }, { physical: 1.5 }, { physical: "12" }, { physical: Number.MAX_SAFE_INTEGER + 1 },
      { description: "  " }, { description: "x".repeat(10001) }, { status: "unknown" }, { expected: undefined },
      { price: 1 }, { reservedStock: 0 }, { variants: [] }, { name: "Tên mới" }, { categoryId: id }, { images: [] }]) {
      await send({ ...body(), ...patch }).expect(400);
    }
    await send(body(), "x".repeat(101)).expect(400);
    expect(update).not.toHaveBeenCalled();
  });
  it("handles missing products and uncertain persistence without exposing driver details", async () => {
    const { send } = await browser();
    await send(body(), "missing").expect(404);
    update.mockRejectedValueOnce(new Error("private driver information"));
    const response = await send().expect(503);
    expect(JSON.stringify(response.body)).not.toContain("private driver");
  });
  it("enforces role, revocation, JSON/Origin/CSRF before writes", async () => {
    const { send, cookie } = await browser();
    await request(app).patch(`/api/v1/staff/products/${sku}`).send(body()).expect(401);
    for (const value of ["customer", "admin", "unknown"]) { role = value; await send().expect(403); }
    role = "staff";
    await request(app).patch(`/api/v1/staff/products/${sku}`).set("Cookie", cookie).send(body()).expect(403);
    await request(app).patch(`/api/v1/staff/products/${sku}`).set("Cookie", cookie)
      .set("Origin", "http://localhost:3000").type("form").send({}).expect(415);
    auth.verifySessionCookie.mockRejectedValueOnce({ code: "auth/session-cookie-revoked" });
    await send().expect(401); expect(update).not.toHaveBeenCalled();
  });
});
