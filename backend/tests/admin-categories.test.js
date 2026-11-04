import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Category } from "../src/models/category.model.js";
import { Product } from "../src/models/product.model.js";
import { migrations } from "../src/scripts/migrate-admin.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`c0000000000000000000${suffix}`);
const cat = { _id: id("0002"), code: "DM002", name: "Mèo", displayOrder: 1, isActive: true };
const dog = { _id: id("0001"), code: "DM001", name: "Chó", displayOrder: 2, isActive: true };
const dogToys = { _id: id("0004"), code: "DM004", name: "Đồ chơi", displayOrder: 3, isActive: false };
const dogFood = { _id: id("0003"), code: "DM003", name: "Thức ăn cho chó", displayOrder: 4, isActive: true };
const health = { _id: id("0005"), name: "Sức khỏe", isActive: true };

let categories;
let products;
let admin;

const list = async (query = {}) => (await admin.send("GET", `/api/v1/admin/categories?${new URLSearchParams(query)}`).expect(200)).body.data;
const rows = (data) => data.items.map((row) => row.name);
const row = (data, name) => data.items.find((item) => item.name === name);

beforeEach(() => {
 categories = [dog, cat, dogFood, dogToys, health];
 products = [
  { categoryIds: [dogFood._id] },
  { categoryIds: [dogFood._id, dogToys._id] },
  { categoryIds: [dogFood._id, cat._id] },
  { categoryId: health._id },
 ];
 admin = createAdminTestApp();
 vi.spyOn(Category, "find").mockImplementation(() => ({ lean: async () => categories }));
 vi.spyOn(Product, "find").mockImplementation(() => ({ select: () => ({ lean: async () => products }) }));
 vi.spyOn(Category, "findOne").mockImplementation((filter) => ({
  lean: async () => categories.find((item) => (filter.code ? item.code === filter.code : String(item._id) === String(filter._id))) ?? null,
 }));
 vi.spyOn(Product, "countDocuments").mockImplementation(async ({ $or: [{ categoryIds: target }] }) => products
  .filter((item) => (item.categoryIds ?? [item.categoryId]).some((value) => String(value) === String(target))).length);
 vi.spyOn(Category, "deleteOne").mockImplementation(async ({ _id }) => {
  categories = categories.filter((item) => String(item._id) !== String(_id));
  return { deletedCount: 1 };
 });
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/categories", () => {
 it("returns categories in display order, with unordered categories last", async () => {
  const data = await list();
  expect(rows(data)).toEqual(["Mèo", "Chó", "Đồ chơi", "Thức ăn cho chó", "Sức khỏe"]);
  expect(data.pagination).toEqual({ page: 1, pageSize: 5, total: 5, totalPages: 1 });
  expect(data.counts).toEqual({ all: 5 });
 });

 it("returns the row fields", async () => {
  const data = await list();
  expect(row(data, "Thức ăn cho chó")).toEqual({
   id: String(dogFood._id), ref: "DM003", code: "DM003", name: "Thức ăn cho chó",
   status: "active", productCount: 3,
  });
  expect(row(data, "Đồ chơi").status).toBe("hidden");
 });

 it("falls back to the id for a category without a code", async () => {
  const data = await list();
  expect(row(data, "Sức khỏe")).toMatchObject({ code: null, ref: String(health._id) });
 });

 it("counts each category's products", async () => {
  const data = await list();
  expect(row(data, "Chó").productCount).toBe(0);
  expect(row(data, "Đồ chơi").productCount).toBe(1);
  expect(row(data, "Mèo").productCount).toBe(1);
  expect(row(data, "Thức ăn cho chó").productCount).toBe(3);
 });

 it("counts a product that still has the older categoryId", async () => {
  expect(row(await list(), "Sức khỏe").productCount).toBe(1);
 });

 it("searches by query and filters by status", async () => {
  const data = await list({ q: "thuc an" });
  expect(rows(data)).toEqual(["Thức ăn cho chó"]);
  expect(data.counts.all).toBe(5);

  expect(rows(await list({ q: "dm002" }))).toEqual(["Mèo"]);
  const hidden = await list({ status: "hidden" });
  expect(rows(hidden)).toEqual(["Đồ chơi"]);
  expect(rows(await list({ status: "active", q: "do choi" }))).toEqual([]);
 });

 it("handles an empty database", async () => {
  categories = [];
  products = [];
  expect(await list()).toEqual({ items: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 0 }, counts: { all: 0 } });
 });

 it("rejects an unknown status", async () => {
  const { body } = await admin.send("GET", "/api/v1/admin/categories?status=banned").expect(400);
  expect(body.error.code).toBe("VALIDATION_ERROR");
 });
});

describe("DELETE /api/v1/admin/categories/:code", () => {
 const remove = (ref) => admin.send("DELETE", `/api/v1/admin/categories/${ref}`);

 it("refuses while products are linked", async () => {
  const { body } = await remove("DM003").expect(409);
  expect(body).toMatchObject({ message: "Không thể xóa “Thức ăn cho chó”: còn 3 sản phẩm liên kết.", error: { code: "CATEGORY_IN_USE" } });
  expect(Category.deleteOne).not.toHaveBeenCalled();
 });

 it("looks for products in both the current and the older shape", async () => {
  await remove(String(health._id)).expect(409);
  expect(Product.countDocuments).toHaveBeenCalledWith({ $or: [{ categoryIds: health._id }, { categoryId: health._id }] });
 });

 it("deletes an unlinked category and audits it", async () => {
  products = [];
  const { body } = await remove("dm002").expect(200);
  expect(body.data).toEqual({ id: String(cat._id) });
  expect(categories).not.toContainEqual(cat);
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   actorId: admin.user()._id,
   action: "category.delete",
   target: { collectionName: "categories", id: String(cat._id) },
   before: { code: "DM002", name: "Mèo" },
   result: "success",
   summary: "Xóa danh mục DM002 Mèo",
  });
 });

 it("deletes a category that has no code yet, by id", async () => {
  products = [];
  await remove(String(health._id)).expect(200);
  expect(AuditLog.create.mock.calls[0][0].summary).toBe("Xóa danh mục Sức khỏe");
 });

 it.each(["DM999", "not-a-code", "c0000000000000000000ffff"])("returns 404 for %s", async (ref) => {
  const { body } = await remove(ref).expect(404);
  expect(body.error.code).toBe("NOT_FOUND");
 });
});

describe("the categories.tree migration", () => {
 const step = migrations.find((item) => item.name === "categories.tree");
 let stored;

 beforeEach(() => {
  stored = [
   { _id: id("00a1"), name: "Zebra", createdAt: new Date("2026-01-01") },
   { _id: id("00a2"), name: "Apple", createdAt: new Date("2026-01-02") },
   { _id: id("00a3"), name: "Mango", code: "DM007", displayOrder: 5, createdAt: new Date("2026-01-03") },
  ];
  vi.spyOn(Category, "find").mockImplementation(() => ({ select: () => ({ sort: () => ({ lean: async () => stored.map((item) => ({ ...item })) }) }) }));
  vi.spyOn(Category, "updateOne").mockImplementation(async ({ _id }, { $set }) => {
   Object.assign(stored.find((item) => item._id === _id), $set);
   return { modifiedCount: 1 };
  });
 });

 it("gives codes in creation order after the highest, and display order by name", async () => {
  expect(await step.run()).toBe(2);
  expect(stored[0]).toMatchObject({ code: "DM008", displayOrder: 7 });
  expect(stored[1]).toMatchObject({ code: "DM009", displayOrder: 6 });
  expect(stored[2]).toMatchObject({ code: "DM007", displayOrder: 5 });
 });

 it("does not bump updatedAt, which conflict checks compare", async () => {
  await step.run();
  expect(Category.updateOne.mock.calls[0][2]).toEqual({ timestamps: false });
 });

 it("changes nothing on a second run", async () => {
  await step.run();
  Category.updateOne.mockClear();
  expect(await step.run()).toBe(0);
  expect(Category.updateOne).not.toHaveBeenCalled();
 });
});
