import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Category } from "../src/models/category.model.js";
import { Product } from "../src/models/product.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`c0000000000000000000${suffix}`);
const LOADED_AT = "2026-10-08T03:00:00.000Z";
const at = new Date(LOADED_AT);

let categories;
let products;
let admin;

const byCode = (code) => categories.find((item) => item.code === code);
const url = (code) => `/api/v1/admin/categories/${code}`;
const patch = (code, body) => admin.send("PATCH", url(code), { expectedUpdatedAt: LOADED_AT, ...body });

function matchesFilter(item, filter) {
 return Object.entries(filter).every(([key, value]) => {
  if (key === "_id" && value?.$ne) return String(item._id) !== String(value.$ne);
  return String(item[key]) === String(value);
 });
}

beforeEach(() => {
 categories = [
  { _id: id("0001"), code: "DM001", name: "Chó", slug: "cho", displayOrder: 1, isActive: true, description: "Cho chó", updatedAt: at },
  { _id: id("0002"), code: "DM002", name: "Mèo", slug: "meo", displayOrder: 2, isActive: true, updatedAt: at },
  { _id: id("0003"), code: "DM003", name: "Thức ăn cho chó", slug: "thuc-an-cho-cho", displayOrder: 1, isActive: false, updatedAt: at },
  { _id: id("0004"), code: "DM004", name: "Phụ kiện", slug: "phu-kien", displayOrder: 3, isActive: true, updatedAt: at },
 ];
 products = [{ categoryIds: [id("0003")] }];
 admin = createAdminTestApp();
 vi.spyOn(Category, "find").mockImplementation(() => ({ lean: async () => categories }));
 vi.spyOn(Category, "findById").mockImplementation((value) => ({ lean: async () => categories.find((item) => String(item._id) === String(value)) ?? null }));
 vi.spyOn(Category, "findOne").mockImplementation((filter) => ({
  lean: async () => categories.find((item) => (filter.code ? item.code === filter.code : String(item._id) === String(filter._id))) ?? null,
 }));
 vi.spyOn(Category, "exists").mockImplementation(async (filter) => (categories.some((item) => matchesFilter(item, filter)) ? { _id: "x" } : null));
 vi.spyOn(Category, "updateOne").mockImplementation(async (filter, update) => {
  const found = categories.find((item) => String(item._id) === String(filter._id) && item.updatedAt.getTime() === filter.updatedAt.getTime());
  if (found) Object.assign(found, update.$set, { updatedAt: new Date("2026-11-01T03:00:00Z") });
  return { matchedCount: found ? 1 : 0 };
 });
 vi.spyOn(Product, "find").mockImplementation(() => ({ select: () => ({ lean: async () => products }) }));
 vi.spyOn(Product, "countDocuments").mockImplementation(async ({ $or: [{ categoryIds: target }] }) => products
  .filter((item) => item.categoryIds.some((value) => String(value) === String(target))).length);
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/categories/:code", () => {
 it("returns the edit form's data", async () => {
  const { body } = await admin.send("GET", url("DM003")).expect(200);
  expect(body.data).toEqual({
   id: String(id("0003")), ref: "DM003", code: "DM003", name: "Thức ăn cho chó", slug: "thuc-an-cho-cho",
   description: "", displayOrder: 1, status: "hidden", updatedAt: LOADED_AT,
   productCount: 1, blocker: "còn 1 sản phẩm liên kết",
  });
 });

 it("returns null blocker when no products are linked", async () => {
  const { body } = await admin.send("GET", url("DM001")).expect(200);
  expect(body.data).toMatchObject({ blocker: null, productCount: 0 });
 });

 it.each(["DM999", "nope"])("returns 404 for %s", async (code) => {
  await admin.send("GET", url(code)).expect(404);
 });
});

describe("PATCH /api/v1/admin/categories/:code", () => {
 it("saves the fields and audits only what changed", async () => {
  const { body } = await patch("DM004", { name: " Phụ kiện mới ", slug: "phu-kien-moi", description: " Mô tả ", displayOrder: 9 }).expect(200);
  expect(byCode("DM004")).toMatchObject({ name: "Phụ kiện mới", slug: "phu-kien-moi", description: "Mô tả", displayOrder: 9 });
  expect(body.data).toMatchObject({ changed: true, name: "Phụ kiện mới", updatedAt: "2026-11-01T03:00:00.000Z" });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   actorId: admin.user()._id,
   action: "category.update",
   target: { collectionName: "categories", id: String(id("0004")) },
   before: { name: "Phụ kiện", slug: "phu-kien", description: "", displayOrder: 3 },
   after: { name: "Phụ kiện mới", slug: "phu-kien-moi", description: "Mô tả", displayOrder: 9 },
   summary: "Cập nhật danh mục DM004: tên, đường dẫn, mô tả, thứ tự",
  });
 });

 it("deactivates and reactivates", async () => {
  await patch("DM004", { isActive: false }).expect(200);
  expect(byCode("DM004").isActive).toBe(false);
  await admin.send("PATCH", url("DM004"), { expectedUpdatedAt: "2026-11-01T03:00:00.000Z", isActive: true }).expect(200);
  expect(byCode("DM004").isActive).toBe(true);
 });

 it("detects a no-op without writing or auditing", async () => {
  const { body } = await patch("DM001", { name: "Chó", slug: "cho", description: "Cho chó", displayOrder: 1, isActive: true }).expect(200);
  expect(body.data.changed).toBe(false);
  expect(Category.updateOne).not.toHaveBeenCalled();
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 describe("validation", () => {
  it.each([
   ["name", "a", "Tên danh mục phải có ít nhất 2 ký tự."],
   ["name", "x".repeat(101), "Tên danh mục tối đa 100 ký tự."],
   ["slug", "Thức Ăn", "Đường dẫn gồm chữ thường không dấu, số và dấu gạch ngang."],
   ["slug", "a--b", "Đường dẫn gồm chữ thường không dấu, số và dấu gạch ngang."],
   ["description", "x".repeat(501), "Mô tả tối đa 500 ký tự."],
   ["displayOrder", 0, "Thứ tự hiển thị là số nguyên từ 1."],
   ["displayOrder", 1.5, "Thứ tự hiển thị là số nguyên từ 1."],
   ["displayOrder", "1", "Thứ tự hiển thị là số nguyên từ 1."],
   ["isActive", "yes", "Trạng thái không hợp lệ."],
  ])("rejects %s=%j with its message", async (field, value, message) => {
   const { body } = await patch("DM004", { [field]: value }).expect(400);
   expect(body.error).toEqual({ code: "VALIDATION_ERROR", fields: { [field]: message } });
   expect(Category.updateOne).not.toHaveBeenCalled();
  });

  it("rejects a field the form does not edit", async () => {
   const { body } = await patch("DM004", { code: "DM100" }).expect(400);
   expect(body.error.fields).toEqual({ code: "Không được phép thay đổi trường này." });
  });

  it("rejects parentCode as unrecognized field", async () => {
   const { body } = await patch("DM004", { parentCode: "DM002" }).expect(400);
   expect(body.error.code).toBe("VALIDATION_ERROR");
  });
 });

 describe("duplicates", () => {
  it("refuses a name in use (MSG32)", async () => {
   const { body } = await patch("DM004", { name: "Mèo" }).expect(409);
   expect(body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { name: "Tên danh mục đã tồn tại." } });
   expect(Category.updateOne).not.toHaveBeenCalled();
  });

  it("refuses a slug in use", async () => {
   const { body } = await patch("DM004", { slug: "meo" }).expect(409);
   expect(body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { slug: "Đường dẫn đã tồn tại." } });
  });

  it("reports the unique index when a race gets past the check", async () => {
   Category.updateOne.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000, keyPattern: { slug: 1 } }));
   const { body } = await patch("DM004", { slug: "con-trong" }).expect(409);
   expect(body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { slug: "Đường dẫn đã tồn tại." } });
  });
 });

 describe("concurrent changes", () => {
  it("returns 409 when the form was loaded before the latest change", async () => {
   const { body } = await patch("DM004", { name: "Tên mới", expectedUpdatedAt: "2026-10-01T03:00:00.000Z" }).expect(409);
   expect(body.error.code).toBe("STALE_CATEGORY");
  });

  it("returns 409 when another change lands between the read and the write", async () => {
   Category.updateOne.mockResolvedValue({ matchedCount: 0 });
   const { body } = await patch("DM004", { name: "Tên mới" }).expect(409);
   expect(body.error.code).toBe("STALE_CATEGORY");
   expect(AuditLog.create).not.toHaveBeenCalled();
  });
 });

 it("returns 404 for an unknown code", async () => {
  await patch("DM999", { name: "Tên mới" }).expect(404);
 });
});
