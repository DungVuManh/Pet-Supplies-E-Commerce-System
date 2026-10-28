import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository } from "../src/models/user.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";

const cookie = "petly-session=test-session";
let role, app, setting;

beforeEach(() => {
 role = "admin";
 setting = { _id: "global", lowStockThreshold: 8 };
 app = createApp(parseEnvironment({ NODE_ENV: "test" }));
 vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue({
  verifySessionCookie: vi.fn().mockResolvedValue({ uid: "admin-uid" }),
 });
 vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({
  _id: "a".repeat(24), role, fullName: "Admin test", email: "admin@example.test", phone: "0912345678",
 }));
 vi.spyOn(Setting, "findById").mockImplementation(() => ({ lean: async () => setting }));
 vi.spyOn(Product, "aggregate").mockResolvedValue([{
  items: [{ sku: "SKU-1", name: "Royal Canin", brand: "Royal Canin", available: 3, status: "low", threshold: 8 }],
  total: [{ count: 13 }],
 }]);
});
afterEach(() => vi.restoreAllMocks());

const stages = () => Product.aggregate.mock.calls[0][0];

describe("Admin inventory list", () => {
 it("rejects guests and every role except Admin", async () => {
  expect((await request(app).get("/api/v1/admin/inventory").expect(401)).body.error.code).toBe("UNAUTHENTICATED");
  for (role of ["customer", "staff"]) {
   const response = await request(app).get("/api/v1/admin/inventory").set("Cookie", cookie).expect(403);
   expect(response.body.error.code).toBe("FORBIDDEN");
  }
  expect(Product.aggregate).not.toHaveBeenCalled();
 });

 it("returns one row per variant with the global threshold and pagination", async () => {
  const response = await request(app).get("/api/v1/admin/inventory?page=2&pageSize=6")
   .set("Cookie", cookie).expect(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.body.data.items[0]).toMatchObject({ sku: "SKU-1", status: "low", threshold: 8 });
  expect(response.body.data.pagination).toEqual({ page: 2, pageSize: 6, total: 13, totalPages: 3 });
  expect(stages()[0]).toEqual({ $unwind: "$variants" });
  const facet = stages().at(-1).$facet.items;
  expect(facet).toEqual(expect.arrayContaining([{ $skip: 6 }, { $limit: 6 }]));
  expect(facet.at(-1).$project.threshold).toEqual({ $literal: 8 });
 });

 it("falls back to the schema threshold when the global setting is missing", async () => {
  setting = null;
  await request(app).get("/api/v1/admin/inventory").set("Cookie", cookie).expect(200);
  const low = stages()[2].$set.stockStatus.$switch.branches[1].case;
  expect(low).toEqual({ $lte: ["$available", 5] });
 });

 it("searches name or SKU literally and filters by stock status", async () => {
  await request(app).get("/api/v1/admin/inventory").query({ query: " a.b* ", status: "out" })
   .set("Cookie", cookie).expect(200);
  const pattern = { $regex: "a\\.b\\*", $options: "i" };
  expect(stages()).toContainEqual({ $match: { $or: [{ name: pattern }, { "variants.sku": pattern }] } });
  expect(stages()).toContainEqual({ $match: { stockStatus: "out" } });
 });

 it("does not filter by status for all", async () => {
  await request(app).get("/api/v1/admin/inventory?status=all").set("Cookie", cookie).expect(200);
  expect(stages().some((stage) => stage.$match)).toBe(false);
 });
});
