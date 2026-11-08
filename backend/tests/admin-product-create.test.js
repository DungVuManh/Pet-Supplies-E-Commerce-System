import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Category } from "../src/models/category.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { StockMovement } from "../src/models/stock-movement.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const URL = "/api/v1/admin/products";
const dog = { _id: new mongoose.Types.ObjectId(), code: "DM001", name: "Chó" };
const toy = { _id: new mongoose.Types.ObjectId(), code: "DM002", name: "Đồ chơi" };

let products;
let admin;
let createError;

const query = (rows) => {
 const chain = { select: () => chain, sort: () => chain, limit: () => chain, populate: () => chain, lean: async () => rows };
 return chain;
};

const valid = (patch = {}) => ({
 name: "Bóng cao su KONG", brand: "KONG", petType: "dog", categoryCodes: ["DM001", "dm002"], description: " Bền ", unit: "Cái",
 variants: [
  { label: "Cỡ S", sku: "KONG-S", price: 150000, cost: 90000, stock: 12, lowStockThreshold: 3 },
  { label: "Cỡ M", sku: "KONG-M", price: 190000 },
 ],
 ...patch,
});
const create = (body) => admin.send("POST", URL, body);

beforeEach(() => {
 products = [{ _id: new mongoose.Types.ObjectId(), name: "Cũ", variants: [{ sku: "OLD-1" }] }];
 createError = null;
 admin = createAdminTestApp();
 vi.spyOn(Category, "find").mockImplementation(() => query([dog, toy]));
 vi.spyOn(Setting, "findById").mockImplementation(() => query({ lowStockThreshold: 5 }));
 vi.spyOn(Product, "find").mockImplementation((filter) => {
  const wanted = filter["variants.sku"].$in;
  return query(products.filter((product) => product.variants.some((variant) => wanted.includes(variant.sku))));
 });
 vi.spyOn(Product, "create").mockImplementation(async (values) => {
  if (createError) throw createError;
  const document = { _id: new mongoose.Types.ObjectId(), ...values, createdAt: new Date(), updatedAt: new Date() };
  products.push(document);
  return { toObject: () => document };
 });
 vi.spyOn(Order, "exists").mockResolvedValue(null);
 vi.spyOn(AuditLog, "find").mockImplementation(() => query([]));
 vi.spyOn(StockMovement, "find").mockImplementation(() => query([]));
 vi.spyOn(StockMovement, "insertMany").mockResolvedValue([]);
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/v1/admin/products", () => {
 it("creates a product with its variants and no images", async () => {
  const { body } = await create(valid()).expect(201);
  const stored = Product.create.mock.calls[0][0];
  expect(stored).toEqual({
   name: "Bóng cao su KONG", brand: "KONG", petType: "dog", description: "Bền", unit: "Cái", isActive: true,
   categoryIds: [String(dog._id), String(toy._id)], images: [],
   variants: [
    { label: "Cỡ S", sku: "KONG-S", price: 150000, cost: 90000, stock: 12, reservedStock: 0, lowStockThreshold: 3 },
    { label: "Cỡ M", sku: "KONG-M", price: 190000, stock: 0, reservedStock: 0 },
   ],
  });
  expect(body.data).toMatchObject({
   sku: "KONG-S", label: "Cỡ S", name: "Bóng cao su KONG", images: [], price: 150000, cost: 90000, stock: 12, available: 12,
   threshold: 3, status: "active", isActive: true, categories: [{ ref: "DM001" }, { ref: "DM002" }],
  });
 });

 it("records starting stock only for variants that have some, and audits without secrets", async () => {
  await create(valid()).expect(201);
  expect(StockMovement.insertMany).toHaveBeenCalledWith([expect.objectContaining({
   sku: "KONG-S", type: "adjust", quantity: 12, stockBefore: 0, stockAfter: 12, reason: "Tồn kho ban đầu",
   source: { kind: "adjustment", id: expect.any(String) }, actorId: admin.user()._id,
  })]);
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   action: "product.create", target: { collectionName: "products" },
   after: { name: "Bóng cao su KONG", variants: [{ sku: "KONG-S", stock: 12 }, { sku: "KONG-M", stock: 0 }] },
   summary: "Tạo sản phẩm KONG-S, KONG-M · Bóng cao su KONG", result: "success",
  });
 });

 it("records no movement when nothing is in stock, and keeps the product when the movement fails", async () => {
  await create(valid({ variants: [{ label: "Một", sku: "ONE", price: 1000 }] })).expect(201);
  expect(StockMovement.insertMany).not.toHaveBeenCalled();
  StockMovement.insertMany.mockRejectedValueOnce(new Error("down"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await create(valid({ variants: [{ label: "Hai", sku: "TWO", price: 1000, stock: 4 }] })).expect(201);
  expect(products.some((product) => product.variants[0].sku === "TWO")).toBe(true);
 });

 it("creates a hidden product", async () => {
  const { body } = await create(valid({ isActive: false })).expect(201);
  expect(body.data).toMatchObject({ isActive: false, status: "hidden" });
 });

 describe("SKUs", () => {
  it("refuses a SKU repeated in the form, on its later row", async () => {
   const variants = [{ label: "A", sku: "SAME", price: 1 }, { label: "B", sku: "OTHER", price: 1 }, { label: "C", sku: "SAME", price: 1 }];
   const { body } = await create(valid({ variants })).expect(400);
   expect(body.error.fields).toEqual({ "variants.2.sku": "SKU bị trùng với phân loại khác." });
  });

  it("refuses SKUs that other products use, naming each row", async () => {
   products.push({ variants: [{ sku: "KONG-M" }] }, { variants: [{ sku: "KONG-S" }] });
   const { body } = await create(valid()).expect(409);
   expect(body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { "variants.0.sku": "SKU đã tồn tại.", "variants.1.sku": "SKU đã tồn tại." } });
   expect(Product.create).not.toHaveBeenCalled();
  });

  it("reports a SKU race the check missed on the right row", async () => {
   createError = Object.assign(new Error("E11000"), { code: 11000, keyValue: { "variants.sku": "KONG-M" } });
   const { body } = await create(valid()).expect(409);
   expect(body.error.fields).toEqual({ "variants.1.sku": "SKU đã tồn tại." });
   expect(StockMovement.insertMany).not.toHaveBeenCalled();
   expect(AuditLog.create).not.toHaveBeenCalled();
  });
 });

 it("refuses an unknown category", async () => {
  const { body } = await create(valid({ categoryCodes: ["DM001", "DM999"] })).expect(400);
  expect(body.error.fields).toEqual({ categoryCodes: "Có danh mục không tồn tại." });
 });

 describe("validation", () => {
  it.each([
   [{ name: "ab" }, "name", "Tên sản phẩm phải có ít nhất 3 ký tự."],
   [{ petType: "bird" }, "petType", "Loài thú cưng không hợp lệ."],
   [{ categoryCodes: [] }, "categoryCodes", "Chọn ít nhất một danh mục."],
   [{ variants: [] }, "variants", "Thêm ít nhất một phân loại."],
   [{ variants: Array.from({ length: 21 }, (_, index) => ({ label: "x", sku: `S-${index}`, price: 1 })) }, "variants", "Tối đa 20 phân loại."],
   [{ variants: [{ label: " ", sku: "A", price: 1 }] }, "variants.0.label", "Nhập tên phân loại, ví dụ Túi 2 kg."],
   [{ variants: [{ label: "A", sku: "a b", price: 1 }] }, "variants.0.sku", "SKU gồm chữ in hoa, số và dấu gạch ngang, ví dụ RC-MA-2KG."],
   [{ variants: [{ label: "A", sku: "A", price: 0 }] }, "variants.0.price", "Giá bán phải là số nguyên lớn hơn 0."],
   [{ variants: [{ label: "A", sku: "A", price: 1, stock: -1 }] }, "variants.0.stock", "Tồn kho phải là số nguyên không âm."],
   [{ variants: [{ label: "A", sku: "A", price: 1, reservedStock: 2 }] }, "variants.0.reservedStock", "Không được phép thay đổi trường này."],
   [{ images: ["https://example.com/a.png"] }, "images", "Không được phép thay đổi trường này."],
  ])("rejects %j on %s", async (patch, field, message) => {
   const { body } = await create(valid(patch)).expect(400);
   expect(body.error).toEqual({ code: "VALIDATION_ERROR", fields: { [field]: message } });
   expect(Product.create).not.toHaveBeenCalled();
  });
 });

 describe("access", () => {
  it("refuses a guest, a Customer, and Staff", async () => {
   admin.session.role = null;
   await create(valid()).expect(401);
   for (const role of ["customer", "staff"]) {
    admin.session.role = role;
    await create(valid()).expect(403);
   }
   expect(Product.create).not.toHaveBeenCalled();
  });

  it("refuses a request without the CSRF pair", async () => {
   await admin.send("POST", URL, valid(), { csrf: false }).expect(403);
   expect(Product.create).not.toHaveBeenCalled();
  });
 });
});
