import mongoose from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Category } from "../src/models/category.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`d0000000000000000000${suffix}`);
const food = { _id: id("0002"), code: "DM002", name: "Thức ăn", parentId: null };

let product;
let audits;
let admin;

const url = (sku, action = "") => `/api/v1/admin/products/${sku}${action && `/${action}`}`;

function query(rows) {
 const chain = { sort: () => chain, limit: () => chain, select: () => chain, populate: () => chain, lean: async () => rows };
 return chain;
}

beforeEach(() => {
 product = {
  _id: id("a001"), name: "Royal Canin Mini", brand: "Royal Canin", unit: "Túi", petType: "dog", description: "Mô tả", images: ["/a.png", "/b.png"],
  isActive: true, categoryIds: [food._id], updatedAt: new Date("2026-10-12T03:00:00Z"),
  variants: [
   { sku: "RC-1", label: "2 kg", price: 450000, cost: 325000, stock: 50, reservedStock: 5, lowStockThreshold: 10 },
   { sku: "RC-2", label: "5 kg", price: 900000, stock: 3 },
  ],
 };
 audits = [];
 admin = createAdminTestApp();
 vi.spyOn(Product, "findOne").mockImplementation((filter) => {
  const found = product.variants.some((variant) => variant.sku === filter["variants.sku"]);
  return query(found ? product : null);
 });
 vi.spyOn(Category, "find").mockImplementation(() => query([food]));
 vi.spyOn(Setting, "findById").mockImplementation(() => query({ lowStockThreshold: 5 }));
 vi.spyOn(Order, "exists").mockResolvedValue(null);
 vi.spyOn(AuditLog, "find").mockImplementation(() => query(audits));
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
 vi.spyOn(Product, "updateOne").mockImplementation(async (filter, update) => {
  const current = product.isActive !== false;
  const wantsVisible = filter.isActive === false;
  if (current === wantsVisible) return { matchedCount: 0 };
  product.isActive = update.$set.isActive;
  return { matchedCount: 1 };
 });
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/products/:sku", () => {
 it("returns the product and variant fields, including the cost Admin needs", async () => {
  const { body } = await admin.send("GET", url("RC-1")).expect(200);
  expect(body.data).toEqual({
   sku: "RC-1", code: "SP00A001", label: "2 kg", name: "Royal Canin Mini", brand: "Royal Canin", unit: "Túi", petType: "dog",
   description: "Mô tả", images: ["/a.png", "/b.png"], categories: [{ ref: "DM002", name: "Thức ăn", path: "Thức ăn" }],
   price: 450000, cost: 325000, stock: 50, reservedStock: 5, available: 45, threshold: 10, ownThreshold: 10, status: "active",
   isActive: true, hasOrders: false, updatedAt: "2026-10-12T03:00:00.000Z", lastUpdate: null, history: [],
  });
 });

 it("addresses the variant by SKU, and falls back to the global threshold", async () => {
  const { body } = await admin.send("GET", url("RC-2")).expect(200);
  expect(body.data).toMatchObject({ sku: "RC-2", label: "5 kg", cost: null, threshold: 5, ownThreshold: null, available: 3, status: "low", reservedStock: 0 });
 });

 it("reports whether orders reference the product", async () => {
  Order.exists.mockResolvedValue({ _id: id("b001") });
  const { body } = await admin.send("GET", url("RC-1")).expect(200);
  expect(body.data.hasOrders).toBe(true);
  expect(Order.exists).toHaveBeenCalledWith({ "items.productId": product._id });
 });

 it("builds the history and last update from the audit log", async () => {
  audits = [
   { _id: id("c001"), at: new Date("2026-10-20T03:00:00Z"), action: "product.hide", summary: "Ẩn sản phẩm RC-1", actorId: { fullName: "Quản trị viên" } },
   { _id: id("c002"), at: new Date("2026-10-19T03:00:00Z"), action: "product.show", actorId: null },
  ];
  const { body } = await admin.send("GET", url("RC-1")).expect(200);
  expect(AuditLog.find).toHaveBeenCalledWith({ "target.collectionName": "products", "target.id": String(product._id) });
  expect(body.data.lastUpdate).toEqual({ at: "2026-10-20T03:00:00.000Z", actorName: "Quản trị viên" });
  expect(body.data.history).toEqual([
   { id: String(id("c001")), at: "2026-10-20T03:00:00.000Z", title: "Ẩn sản phẩm RC-1", actorName: "Quản trị viên" },
   { id: String(id("c002")), at: "2026-10-19T03:00:00.000Z", title: "product.show", actorName: null },
  ]);
 });

 it("returns 404 for an unknown SKU", async () => {
  const { body } = await admin.send("GET", url("NOPE")).expect(404);
  expect(body.error.code).toBe("NOT_FOUND");
 });
});

describe("POST /api/v1/admin/products/:sku/hide and /show", () => {
 it("hides the product, audits it, and returns the new status", async () => {
  const { body } = await admin.send("POST", url("RC-1", "hide")).expect(200);
  expect(product.isActive).toBe(false);
  expect(body.data).toEqual({ sku: "RC-1", isActive: false, status: "hidden" });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   actorId: admin.user()._id,
   action: "product.hide",
   target: { collectionName: "products", id: String(product._id) },
   before: { isActive: true },
   after: { isActive: false },
   result: "success",
   summary: "Ẩn sản phẩm RC-1 · Royal Canin Mini",
  });
 });

 it("shows it again, returning the derived status", async () => {
  product.isActive = false;
  const { body } = await admin.send("POST", url("RC-2", "show")).expect(200);
  expect(product.isActive).toBe(true);
  expect(body.data).toEqual({ sku: "RC-2", isActive: true, status: "low" });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({ action: "product.show", before: { isActive: false }, after: { isActive: true } });
 });

 it("treats a missing isActive as visible", async () => {
  delete product.isActive;
  await admin.send("POST", url("RC-1", "hide")).expect(200);
  expect(Product.updateOne.mock.calls[0][0]).toEqual({ _id: product._id, isActive: { $ne: false } });
 });

 it("refuses a repeat without auditing", async () => {
  product.isActive = false;
  const hidden = await admin.send("POST", url("RC-1", "hide")).expect(409);
  expect(hidden.body.error.code).toBe("ALREADY_HIDDEN");
  product.isActive = true;
  const visible = await admin.send("POST", url("RC-1", "show")).expect(409);
  expect(visible.body.error.code).toBe("ALREADY_VISIBLE");
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it.each(["hide", "show"])("returns 404 on %s for an unknown SKU", async (action) => {
  await admin.send("POST", url("NOPE", action)).expect(404);
 });
});

describe("visibility on the public API", () => {
 it("asks only for visible products, so a hidden one disappears", async () => {
  vi.spyOn(Product, "find").mockImplementation((filter) => query(product.isActive === filter.isActive ? [product] : []));
  const publicList = async () => (await request(admin.app).get("/api/v1/products").expect(200)).body.data.products;
  expect(await publicList()).toHaveLength(1);
  await admin.send("POST", url("RC-1", "hide")).expect(200);
  expect(await publicList()).toHaveLength(0);
  await admin.send("POST", url("RC-1", "show")).expect(200);
  expect(await publicList()).toHaveLength(1);
 });
});
