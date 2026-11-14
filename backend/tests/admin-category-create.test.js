import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Category } from "../src/models/category.model.js";
import { Product } from "../src/models/product.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const URL = "/api/v1/admin/categories";
const at = new Date("2026-11-07T03:00:00.000Z");

let categories;
let admin;
/** Errors the next `Category.create` calls throw, in order, before succeeding. */
let createErrors;

const duplicateKey = (keyPattern) => Object.assign(new Error("E11000"), { code: 11000, keyPattern });
const create = (body) => admin.send("POST", URL, body);

/** A query chain over `rows`; only the shapes the controller uses. */
function chain(rows) {
 const state = { rows };
 const query = {
  select: () => query,
  sort: (order) => {
   const [[field, direction]] = Object.entries(order);
   state.rows = [...state.rows].sort((a, b) => (a[field] - b[field]) * direction);
   return query;
  },
  limit: (count) => { state.rows = state.rows.slice(0, count); return query; },
  lean: async () => state.rows,
 };
 return query;
}

beforeEach(() => {
 categories = [
  { _id: new mongoose.Types.ObjectId(), code: "DM001", name: "Chó", slug: "cho", displayOrder: 1, updatedAt: at },
  { _id: new mongoose.Types.ObjectId(), code: "DM007", name: "Mèo", slug: "meo", displayOrder: 4, updatedAt: at },
  // Before the migration: no code and no order.
  { _id: new mongoose.Types.ObjectId(), name: "Cũ", slug: "cu", updatedAt: at },
 ];
 createErrors = [];
 admin = createAdminTestApp();
 vi.spyOn(Category, "find").mockImplementation((filter = {}) => chain(categories.filter((item) =>
  Object.entries(filter).every(([field, condition]) => (condition?.$exists ? item[field] !== undefined : true)))));
 vi.spyOn(Category, "exists").mockImplementation(async (filter) => (categories.some((item) =>
  Object.entries(filter).every(([field, value]) => item[field] === value)) ? { _id: "x" } : null));
 vi.spyOn(Category, "create").mockImplementation(async (values) => {
  if (createErrors.length) throw createErrors.shift();
  const document = { _id: new mongoose.Types.ObjectId(), ...values, createdAt: at, updatedAt: at };
  categories.push(document);
  return { toObject: () => document };
 });
 vi.spyOn(Product, "find").mockImplementation(() => ({ select: () => ({ lean: async () => [] }) }));
 vi.spyOn(Product, "countDocuments").mockResolvedValue(0);
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/v1/admin/categories", () => {
 it("creates a category with the next code and order, and audits it", async () => {
  const { body } = await create({ name: " Đồ chơi ", slug: "do-choi", petType: "dog", description: " Bóng, xương gặm " }).expect(201);
  expect(Category.create).toHaveBeenCalledWith({
   name: "Đồ chơi", slug: "do-choi", petType: "dog", description: "Bóng, xương gặm", isActive: true, displayOrder: 5, code: "DM008",
  });
  expect(body.data).toMatchObject({
   ref: "DM008", code: "DM008", name: "Đồ chơi", slug: "do-choi", petType: "dog", description: "Bóng, xương gặm",
   displayOrder: 5, status: "active", productCount: 0, blocker: null,
  });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   actorId: admin.user()._id,
   action: "category.create",
   target: { collectionName: "categories", id: body.data.id },
   after: { code: "DM008", name: "Đồ chơi", slug: "do-choi", petType: "dog", displayOrder: 5, isActive: true },
   summary: "Tạo danh mục DM008 Đồ chơi",
   result: "success",
  });
 });

 it("applies the defaults and keeps a chosen order and status", async () => {
  await create({ name: "Phụ kiện", slug: "phu-kien", displayOrder: 2, isActive: false }).expect(201);
  expect(Category.create).toHaveBeenCalledWith(expect.objectContaining({ petType: "both", description: "", displayOrder: 2, isActive: false }));
 });

 it("starts at DM001 and order 1 in an empty database", async () => {
  categories = [];
  await create({ name: "Đầu tiên", slug: "dau-tien" }).expect(201);
  expect(Category.create).toHaveBeenCalledWith(expect.objectContaining({ code: "DM001", displayOrder: 1 }));
 });

 it("retries with a fresh code when another Admin took it", async () => {
  createErrors = [duplicateKey({ code: 1 })];
  // The other Admin's category appears between the two attempts.
  Category.create.mockImplementationOnce(async () => {
   categories.push({ _id: new mongoose.Types.ObjectId(), code: "DM008", name: "Khác", slug: "khac", displayOrder: 5 });
   throw createErrors.shift();
  });
  const { body } = await create({ name: "Đồ chơi", slug: "do-choi" }).expect(201);
  expect(Category.create).toHaveBeenCalledTimes(2);
  expect(body.data.code).toBe("DM009");
 });

 it("gives up after 3 code clashes without saving", async () => {
  createErrors = [1, 2, 3].map(() => duplicateKey({ code: 1 }));
  const { body } = await create({ name: "Đồ chơi", slug: "do-choi" }).expect(409);
  expect(body.error.code).toBe("CODE_CONFLICT");
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 describe("duplicates (MSG32)", () => {
  it("refuses a name and a slug in use, both at once", async () => {
   const { body } = await create({ name: "Mèo", slug: "cho" }).expect(409);
   expect(body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { name: "Tên danh mục đã tồn tại.", slug: "Đường dẫn đã tồn tại." } });
   expect(Category.create).not.toHaveBeenCalled();
  });

  it.each([["name", "Tên danh mục đã tồn tại."], ["slug", "Đường dẫn đã tồn tại."]])("reports a %s race the check missed", async (field, message) => {
   createErrors = [duplicateKey({ [field]: 1 })];
   const { body } = await create({ name: "Đồ chơi", slug: "do-choi" }).expect(409);
   expect(body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { [field]: message } });
   expect(Category.create).toHaveBeenCalledTimes(1);
  });
 });

 describe("validation", () => {
  it.each([
   [{ slug: "do-choi" }, "name", "Tên danh mục không hợp lệ."],
   [{ name: "a", slug: "do-choi" }, "name", "Tên danh mục phải có ít nhất 2 ký tự."],
   [{ name: "Đồ chơi" }, "slug", "Đường dẫn không hợp lệ."],
   [{ name: "Đồ chơi", slug: "Đồ Chơi" }, "slug", "Đường dẫn gồm chữ thường không dấu, số và dấu gạch ngang."],
   [{ name: "Đồ chơi", slug: "do-choi", petType: "bird" }, "petType", "Loài thú cưng không hợp lệ."],
   [{ name: "Đồ chơi", slug: "do-choi", displayOrder: 0 }, "displayOrder", "Thứ tự hiển thị là số nguyên từ 1."],
   [{ name: "Đồ chơi", slug: "do-choi", description: "x".repeat(501) }, "description", "Mô tả tối đa 500 ký tự."],
   [{ name: "Đồ chơi", slug: "do-choi", code: "DM100" }, "code", "Không được phép thay đổi trường này."],
  ])("rejects %j on %s", async (body, field, message) => {
   const response = await create(body).expect(400);
   expect(response.body.error).toEqual({ code: "VALIDATION_ERROR", fields: { [field]: message } });
   expect(Category.create).not.toHaveBeenCalled();
  });
 });

 describe("access", () => {
  it("refuses a guest, a Customer, and Staff", async () => {
   admin.session.role = null;
   await create({ name: "Đồ chơi", slug: "do-choi" }).expect(401);
   for (const role of ["customer", "staff"]) {
    admin.session.role = role;
    await create({ name: "Đồ chơi", slug: "do-choi" }).expect(403);
   }
   expect(Category.create).not.toHaveBeenCalled();
  });

  it("refuses a request without the CSRF pair", async () => {
   await admin.send("POST", URL, { name: "Đồ chơi", slug: "do-choi" }, { csrf: false }).expect(403);
   expect(Category.create).not.toHaveBeenCalled();
  });
 });
});

describe("PATCH /api/v1/admin/categories/:code with a pet type", () => {
 it("saves and audits a pet type change", async () => {
  vi.spyOn(Category, "findOne").mockImplementation((filter) => ({ lean: async () => categories.find((item) => item.code === filter.code) ?? null }));
  vi.spyOn(Category, "findById").mockImplementation(() => ({ lean: async () => ({ ...categories[0], petType: "cat" }) }));
  vi.spyOn(Category, "updateOne").mockResolvedValue({ matchedCount: 1 });
  const { body } = await admin.send("PATCH", `${URL}/DM001`, { expectedUpdatedAt: at.toISOString(), petType: "cat" }).expect(200);
  expect(Category.updateOne.mock.calls[0][1]).toEqual({ $set: { petType: "cat" } });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({ before: { petType: "both" }, after: { petType: "cat" }, summary: "Cập nhật danh mục DM001: loài" });
  expect(body.data.petType).toBe("cat");
 });
});
