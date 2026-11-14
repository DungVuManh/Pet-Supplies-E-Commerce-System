import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Category } from "../src/models/category.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`d0000000000000000000${suffix}`);
const dog = { _id: id("0001"), code: "DM001", name: "Chó" };
const food = { _id: id("0002"), code: "DM002", name: "Thức ăn" };
const cat = { _id: id("0003"), code: "DM003", name: "Mèo" };
const noCode = { _id: id("0004"), name: "Chưa có mã" };

const variant = (sku, fields = {}) => ({ sku, label: sku, price: 100000, stock: 50, reservedStock: 0, ...fields });
const royal = {
 _id: id("a001"), name: "Royal Canin Mini", brand: "Royal Canin", isActive: true, unit: "Túi", categoryIds: [food._id, cat._id],
 variants: [variant("RC-1", { price: 450000 }), variant("RC-2", { stock: 12, reservedStock: 2, lowStockThreshold: 10 })],
};
const whiskas = { _id: id("a002"), name: "Pate Whiskas", brand: "Whiskas", isActive: false, categoryIds: [cat._id], variants: [variant("WK-1")] };
// Available stock exactly at the global threshold (5).
const kong = { _id: id("a003"), name: "Đồ chơi KONG", brand: "KONG", isActive: true, categoryIds: [dog._id], variants: [variant("KG-1", { stock: 7, reservedStock: 2 })] };
// Written before `categoryIds` existed, with no brand.
const legacy = { _id: id("a004"), name: "Sản phẩm cũ", categoryId: noCode._id, variants: [variant("OLD-1", { stock: 6, reservedStock: undefined })] };

let products;
let setting;
let admin;

const list = async (query = {}) => (await admin.send("GET", `/api/v1/admin/products?${new URLSearchParams({ pageSize: "100", ...query })}`).expect(200)).body.data;
const skus = (data) => data.items.map((row) => row.sku);
const row = (data, sku) => data.items.find((item) => item.sku === sku);

beforeEach(() => {
 products = [royal, whiskas, kong, legacy];
 setting = { lowStockThreshold: 5 };
 admin = createAdminTestApp();
 vi.spyOn(Product, "find").mockImplementation(() => {
  const chain = { select: () => chain, sort: () => chain, lean: async () => products };
  return chain;
 });
 vi.spyOn(Category, "find").mockImplementation(() => ({ select: () => ({ lean: async () => [dog, food, cat, noCode] }) }));
 vi.spyOn(Setting, "findById").mockImplementation(() => ({ select: () => ({ lean: async () => setting }) }));
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/products", () => {
 it("returns one row per variant, with the product fields on each", async () => {
  const data = await list();
  expect(skus(data)).toEqual(["RC-1", "RC-2", "WK-1", "KG-1", "OLD-1"]);
  expect(row(data, "RC-1")).toEqual({
   sku: "RC-1", code: "SP00A001", name: "Royal Canin Mini", brand: "Royal Canin", unit: "Túi", price: 450000, available: 50, threshold: 5,
   status: "active", categories: [{ ref: "DM002", name: "Thức ăn", path: "Thức ăn" }, { ref: "DM003", name: "Mèo", path: "Mèo" }],
  });
 });

 it("never returns the cost", async () => {
  products = [{ ...kong, variants: [variant("KG-1", { cost: 12345 })] }];
  expect(JSON.stringify((await list()).items)).not.toContain("12345");
 });

 it("handles a product with the older categoryId and no brand", async () => {
  const data = await list();
  expect(row(data, "OLD-1")).toMatchObject({ brand: "", unit: "", available: 6, categories: [{ ref: String(noCode._id), name: "Chưa có mã", path: "Chưa có mã" }] });
 });

 describe("threshold and status", () => {
  it("falls back to the global threshold, and prefers the variant's own", async () => {
   const data = await list();
   expect(row(data, "RC-1").threshold).toBe(5);
   expect(row(data, "RC-2").threshold).toBe(10);
  });

  it("uses the Setting default when there is no settings document", async () => {
   setting = null;
   expect(row(await list(), "RC-1").threshold).toBe(5);
  });

  it("treats available == threshold as low, and one above as on sale", async () => {
   const data = await list();
   expect(row(data, "KG-1")).toMatchObject({ available: 5, threshold: 5, status: "low" });
   expect(row(data, "OLD-1")).toMatchObject({ available: 6, status: "active" });
   // Available is stock minus reserved: 12 - 2 = 10, at its own threshold of 10.
   expect(row(data, "RC-2")).toMatchObject({ available: 10, threshold: 10, status: "low" });
  });

  it("shows a hidden product as hidden even when it is low", async () => {
   products = [{ ...whiskas, variants: [variant("WK-1", { stock: 0 })] }];
   expect(row(await list(), "WK-1").status).toBe("hidden");
  });

  it("treats a missing isActive as visible", async () => {
   expect(row(await list(), "OLD-1").status).toBe("active");
  });
 });

 describe("filters", () => {
  it("counts rows by visibility, ignoring the filters", async () => {
   const counts = { all: 5, active: 4, hidden: 1 };
   expect((await list()).counts).toEqual(counts);
   expect((await list({ tab: "hidden", q: "kong" })).counts).toEqual(counts);
  });

  it("filters by tab, where on sale includes low stock", async () => {
   expect(skus(await list({ tab: "hidden" }))).toEqual(["WK-1"]);
   expect(skus(await list({ tab: "active" }))).toEqual(["RC-1", "RC-2", "KG-1", "OLD-1"]);
  });

  it("filters by derived status", async () => {
   expect(skus(await list({ status: "low" }))).toEqual(["RC-2", "KG-1"]);
   expect(skus(await list({ status: "active" }))).toEqual(["RC-1", "OLD-1"]);
   expect(skus(await list({ status: "hidden" }))).toEqual(["WK-1"]);
   expect(skus(await list({ tab: "hidden", status: "low" }))).toEqual([]);
  });

  it("filters products by category", async () => {
   expect(skus(await list({ category: "DM001" }))).toEqual(["KG-1"]);
   expect(skus(await list({ category: "DM002" }))).toEqual(["RC-1", "RC-2"]);
  });

  it("finds a product through any of its categories", async () => {
   expect(skus(await list({ category: "DM003" }))).toEqual(["RC-1", "RC-2", "WK-1"]);
  });

  it("filters by a category without a code, and by the older categoryId", async () => {
   expect(skus(await list({ category: String(noCode._id) }))).toEqual(["OLD-1"]);
  });

  it("returns nothing for an unknown category", async () => {
   expect((await list({ category: "DM999" })).items).toEqual([]);
  });

  it.each([
   ["rc-2", ["RC-2"]],
   ["royal", ["RC-1", "RC-2"]],
   ["do choi", ["KG-1"]],
   ["sp00a003", ["KG-1"]],
   ["whiskas pate", ["WK-1"]],
   ["khong co", []],
  ])("searches %s across SKU, code, name, and brand", async (q, expected) => {
   expect(skus(await list({ q }))).toEqual(expected);
  });
 });

 it("pages the rows", async () => {
  const first = await list({ pageSize: "2" });
  expect(skus(first)).toEqual(["RC-1", "RC-2"]);
  expect(first.pagination).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
  expect(skus(await list({ pageSize: "2", page: "3" }))).toEqual(["OLD-1"]);
 });

 it("handles an empty database", async () => {
  products = [];
  const data = await list();
  expect(data.items).toEqual([]);
  expect(data.counts).toEqual({ all: 0, active: 0, hidden: 0 });
 });

 it.each([["tab", "archived"], ["status", "gone"], ["page", "0"]])("rejects %s=%s with 400", async (name, value) => {
  const { body } = await admin.send("GET", `/api/v1/admin/products?${name}=${value}`).expect(400);
  expect(body.error.code).toBe("VALIDATION_ERROR");
 });
});

describe("the Product model additions", () => {
 const data = { name: "A", petType: "dog", categoryIds: [id("0001")], variants: [{ sku: "A", label: "A", price: 1 }] };

 it("keeps the new fields optional", async () => {
  await expect(new Product(data).validate()).resolves.toBeUndefined();
 });

 it("accepts valid values and refuses negative or fractional ones", async () => {
  const withFields = (fields) => new Product({ ...data, unit: "Túi", variants: [{ sku: "A", label: "A", price: 1, ...fields }] });
  await expect(withFields({ cost: 0, lowStockThreshold: 0 }).validate()).resolves.toBeUndefined();
  for (const fields of [{ cost: -1 }, { cost: 1.5 }, { lowStockThreshold: -1 }, { lowStockThreshold: 1.5 }]) {
   await expect(withFields(fields).validate()).rejects.toThrow();
  }
 });

 it("hides the cost from ordinary queries, because catalog responses return variants as stored", () => {
  expect(Product.schema.path("variants").schema.path("cost").options.select).toBe(false);
 });
});
