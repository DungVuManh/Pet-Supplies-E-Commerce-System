import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Cart } from "../src/models/cart.model.js";
import { Category } from "../src/models/category.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { StockMovement } from "../src/models/stock-movement.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`d0000000000000000000${suffix}`);
const dog = { _id: id("0001"), code: "DM001", name: "Chó" };
const cat = { _id: id("0002"), code: "DM002", name: "Mèo" };
const noCode = { _id: id("0003"), name: "Chưa có mã" };

let product;
let admin;
const url = (sku = "RC-1") => `/api/v1/admin/products/${sku}`;
const patch = (body, sku) => admin.send("PATCH", url(sku), body);
const variant = (sku = "RC-1") => product.variants.find((item) => item.sku === sku);

function query(rows) {
 const chain = { sort: () => chain, limit: () => chain, select: () => chain, populate: () => chain, lean: async () => rows };
 return chain;
}

// Applies the conditional update to the in-memory product as MongoDB would.
function applyUpdate({ _id, variants }, update) {
 const target = String(product._id) === String(_id) ? product.variants.find((item) => {
  const { sku, stock, reservedStock } = variants.$elemMatch;
  if (item.sku !== sku) return false;
  if (stock !== undefined && item.stock !== stock) return false;
  return !(reservedStock && (item.reservedStock ?? 0) > reservedStock.$not.$gt);
 }) : null;
 if (!target) return { matchedCount: 0 };
 const write = (path, value, remove) => {
  const owner = path.startsWith("variants.$.") ? target : product;
  const key = path.replace("variants.$.", "");
  if (remove) delete owner[key];
  else owner[key] = value;
 };
 for (const [path, value] of Object.entries(update.$set ?? {})) write(path, value);
 for (const path of Object.keys(update.$unset ?? {})) write(path, null, true);
 return { matchedCount: 1 };
}

beforeEach(() => {
 product = {
  _id: id("a001"), name: "Royal Canin", brand: "Royal", unit: "Túi", petType: "dog", description: "Mô tả", images: [], isActive: true,
  categoryIds: [dog._id], updatedAt: new Date("2026-10-12T03:00:00Z"),
  variants: [
   { sku: "RC-1", label: "2 kg", price: 450000, cost: 300000, stock: 50, reservedStock: 5, lowStockThreshold: 10 },
   { sku: "RC-2", label: "5 kg", price: 900000, stock: 8, reservedStock: 0 },
  ],
 };
 admin = createAdminTestApp();
 // A fresh copy per read, as MongoDB returns, so later writes do not change what was read.
 vi.spyOn(Product, "findOne").mockImplementation((filter) => query(product?.variants.some((item) => item.sku === filter["variants.sku"])
  ? { ...product, variants: product.variants.map((item) => ({ ...item })) } : null));
 vi.spyOn(Product, "updateOne").mockImplementation(async (filter, update) => applyUpdate(filter, update));
 vi.spyOn(Product, "exists").mockResolvedValue(null);
 vi.spyOn(Product, "deleteOne").mockImplementation(async () => { product = null; return { deletedCount: 1 }; });
 vi.spyOn(Category, "find").mockImplementation(() => query([dog, cat, noCode]));
 vi.spyOn(Setting, "findById").mockImplementation(() => query({ lowStockThreshold: 5 }));
 vi.spyOn(Order, "exists").mockResolvedValue(null);
 vi.spyOn(Cart, "exists").mockResolvedValue(null);
 vi.spyOn(AuditLog, "find").mockImplementation(() => query([]));
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
 vi.spyOn(StockMovement, "find").mockImplementation(() => query([]));
 vi.spyOn(StockMovement, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("PATCH /api/v1/admin/products/:sku", () => {
 it("saves product fields and this variant's fields, leaving other variants alone", async () => {
  const { body } = await patch({ name: " Tên mới ", brand: "Mới", petType: "cat", description: "Mới", unit: "Hộp", isActive: false, price: 500000, cost: 350000, lowStockThreshold: 3 }).expect(200);
  expect(product).toMatchObject({ name: "Tên mới", brand: "Mới", petType: "cat", description: "Mới", unit: "Hộp", isActive: false });
  expect(variant()).toMatchObject({ price: 500000, cost: 350000, lowStockThreshold: 3 });
  expect(variant("RC-2")).toMatchObject({ price: 900000, stock: 8 });
  expect(body.data).toMatchObject({ changed: true, name: "Tên mới", price: 500000, status: "hidden" });
 });

 it("audits only what changed", async () => {
  await patch({ name: "Royal Canin", price: 500000 }).expect(200);
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   actorId: admin.user()._id,
   action: "product.update",
   target: { collectionName: "products", id: String(product._id) },
   before: { price: 450000 },
   after: { price: 500000 },
   summary: "Cập nhật sản phẩm RC-1: giá bán",
  });
  expect(AuditLog.create.mock.calls[0][0].after).not.toHaveProperty("name");
 });

 it("detects a no-op without writing, auditing, or recording a movement", async () => {
  const { body } = await patch({ name: "Royal Canin", price: 450000, stock: 50, expectedStock: 50, categoryCodes: ["DM001"], isActive: true, cost: 300000, lowStockThreshold: 10 }).expect(200);
  expect(body.data.changed).toBe(false);
  expect(Product.updateOne).not.toHaveBeenCalled();
  expect(AuditLog.create).not.toHaveBeenCalled();
  expect(StockMovement.create).not.toHaveBeenCalled();
 });

 it("clears cost and threshold with null", async () => {
  await patch({ cost: null, lowStockThreshold: null }).expect(200);
  expect(variant()).not.toHaveProperty("cost");
  expect(variant()).not.toHaveProperty("lowStockThreshold");
 });

 it("never returns the cost of another SKU, and keeps its own", async () => {
  const { body } = await patch({ price: 1 }, "RC-2").expect(200);
  expect(body.data).toMatchObject({ sku: "RC-2", cost: null });
 });

 describe("categories", () => {
  it("saves several categories by code or id", async () => {
   const { body } = await patch({ categoryCodes: ["DM002", String(noCode._id)] }).expect(200);
   expect(product.categoryIds).toEqual([String(cat._id), String(noCode._id)]);
   expect(body.data.categories.map((item) => item.name)).toEqual(["Mèo", "Chưa có mã"]);
  });

  it("ignores order and repeats when detecting a change", async () => {
   product.categoryIds = [dog._id, cat._id];
   expect((await patch({ categoryCodes: ["DM002", "DM001", "DM001"] }).expect(200)).body.data.changed).toBe(false);
  });

  it("moves a product with the older categoryId onto categoryIds", async () => {
   delete product.categoryIds;
   product.categoryId = dog._id;
   await patch({ categoryCodes: ["DM002"] }).expect(200);
   expect(product.categoryIds).toEqual([String(cat._id)]);
  });

  it("refuses an empty list and an unknown category", async () => {
   expect((await patch({ categoryCodes: [] }).expect(400)).body.error.fields).toEqual({ categoryCodes: "Chọn ít nhất một danh mục." });
   expect((await patch({ categoryCodes: ["DM999"] }).expect(400)).body.error.fields).toEqual({ categoryCodes: "Có danh mục không tồn tại." });
   expect(Product.updateOne).not.toHaveBeenCalled();
  });
 });

 describe("stock", () => {
  it("writes the new stock and records an adjust movement", async () => {
   await patch({ stock: 40, expectedStock: 50 }).expect(200);
   expect(variant().stock).toBe(40);
   expect(StockMovement.create).toHaveBeenCalledTimes(1);
   expect(StockMovement.create.mock.calls[0][0]).toMatchObject({
    productId: product._id, sku: "RC-1", type: "adjust", quantity: -10, stockBefore: 50, stockAfter: 40,
    source: { kind: "adjustment" }, actorId: admin.user()._id,
   });
   expect(AuditLog.create.mock.calls[0][0]).toMatchObject({ before: { stock: 50 }, after: { stock: 40 } });
  });

  it("records no movement when stock does not change", async () => {
   await patch({ price: 1 }).expect(200);
   expect(StockMovement.create).not.toHaveBeenCalled();
  });

  it("requires expectedStock", async () => {
   const { body } = await patch({ stock: 40 }).expect(400);
   expect(body.error.fields).toHaveProperty("stock");
   expect(variant().stock).toBe(50);
  });

  it("returns 409 when the form's stock is out of date", async () => {
   const { body } = await patch({ stock: 40, expectedStock: 49 }).expect(409);
   expect(body.error.code).toBe("STALE_STOCK");
   expect(variant().stock).toBe(50);
   expect(StockMovement.create).not.toHaveBeenCalled();
   expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("returns 409 when a sale lands between the read and the write", async () => {
   Product.updateOne.mockImplementationOnce(async (filter, update) => {
    variant().stock = 49;
    return applyUpdate(filter, update);
   });
   const { body } = await patch({ stock: 40, expectedStock: 50 }).expect(409);
   expect(body.error.code).toBe("STALE_STOCK");
   expect(variant().stock).toBe(49);
   expect(StockMovement.create).not.toHaveBeenCalled();
  });

  it("refuses stock below reserved, and accepts exactly reserved", async () => {
   const { body } = await patch({ stock: 4, expectedStock: 50 }).expect(400);
   expect(body.error.fields.stock).toContain("(5)");
   expect(variant().stock).toBe(50);
   await patch({ stock: 5, expectedStock: 50 }).expect(200);
   expect(variant().stock).toBe(5);
  });

  it("refuses stock below reserved when an order lands between the read and the write", async () => {
   Product.updateOne.mockImplementationOnce(async (filter, update) => {
    variant().reservedStock = 45;
    return applyUpdate(filter, update);
   });
   await patch({ stock: 40, expectedStock: 50 }).expect(409);
   expect(variant().stock).toBe(50);
  });

  it("still answers when the movement cannot be saved", async () => {
   vi.spyOn(console, "error").mockImplementation(() => {});
   StockMovement.create.mockRejectedValue(new Error("down"));
   await patch({ stock: 40, expectedStock: 50 }).expect(200);
   expect(variant().stock).toBe(40);
   expect(console.error).toHaveBeenCalledWith("[stock] Failed to record stock movement", { sku: "RC-1" });
  });
 });

 describe("SKU rename", () => {
  it("renames an unused SKU and returns the detail at the new SKU", async () => {
   const { body } = await patch({ sku: "RC-NEW" }).expect(200);
   expect(variant("RC-NEW")).toBeDefined();
   expect(body.data.sku).toBe("RC-NEW");
  });

  it("records the movement under the new SKU when both change", async () => {
   await patch({ sku: "RC-NEW", stock: 40, expectedStock: 50 }).expect(200);
   expect(StockMovement.create.mock.calls[0][0].sku).toBe("RC-NEW");
  });

  it("refuses when orders reference the SKU", async () => {
   Order.exists.mockResolvedValue({ _id: id("b001") });
   const { body } = await patch({ sku: "RC-NEW" }).expect(409);
   expect(Order.exists).toHaveBeenCalledWith({ "items.variantSku": "RC-1" });
   expect(body.error).toEqual({ code: "SKU_IN_USE", fields: { sku: "Không thể đổi SKU vì đã có đơn hàng dùng SKU này." } });
   expect(variant()).toBeDefined();
  });

  it("refuses when a cart holds the SKU", async () => {
   Cart.exists.mockResolvedValue({ _id: id("b002") });
   const { body } = await patch({ sku: "RC-NEW" }).expect(409);
   expect(Cart.exists).toHaveBeenCalledWith({ "items.variantSku": "RC-1" });
   expect(body.error.code).toBe("SKU_IN_USE");
  });

  it("refuses a SKU already in use, and reports the unique index if a race gets past the check", async () => {
   Product.exists.mockResolvedValueOnce({ _id: id("a002") });
   expect((await patch({ sku: "RC-2" }).expect(409)).body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { sku: "SKU đã tồn tại." } });
   Product.updateOne.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: 11000 }));
   expect((await patch({ sku: "RC-NEW" }).expect(409)).body.error.code).toBe("DUPLICATE_VALUE");
  });

  it("lets an older SKU that breaks the rule keep being edited", async () => {
   variant().sku = "PATE--001";
   const { body } = await patch({ price: 1 }, "PATE--001").expect(200);
   expect(body.data).toMatchObject({ sku: "PATE--001", price: 1 });
  });
 });

 describe("validation", () => {
  it.each([
   ["name", "ab", "Tên sản phẩm phải có ít nhất 3 ký tự."],
   ["name", "x".repeat(201), "Tên sản phẩm tối đa 200 ký tự."],
   ["sku", "rc-1", "SKU gồm chữ in hoa, số và dấu gạch ngang, ví dụ RC-MA-2KG."],
   ["sku", "RC--1", "SKU gồm chữ in hoa, số và dấu gạch ngang, ví dụ RC-MA-2KG."],
   ["petType", "Chó", "Loài thú cưng không hợp lệ."],
   ["petType", "bird", "Loài thú cưng không hợp lệ."],
   ["price", 0, "Giá bán phải là số nguyên lớn hơn 0."],
   ["price", 1.5, "Giá bán phải là số nguyên lớn hơn 0."],
   ["price", "100", "Giá bán phải là số nguyên lớn hơn 0."],
   ["cost", -1, "Giá vốn phải là số nguyên không âm."],
   ["stock", -1, "Tồn kho phải là số nguyên không âm."],
   ["stock", 1.5, "Tồn kho phải là số nguyên không âm."],
   ["lowStockThreshold", -1, "Ngưỡng cảnh báo phải là số nguyên không âm."],
   ["isActive", "yes", "Trạng thái không hợp lệ."],
  ])("rejects %s=%j with its message", async (field, value, message) => {
   const { body } = await patch({ [field]: value }).expect(400);
   expect(body.error).toEqual({ code: "VALIDATION_ERROR", fields: { [field]: message } });
   expect(Product.updateOne).not.toHaveBeenCalled();
  });

  it("rejects a field the form does not edit", async () => {
   const { body } = await patch({ reservedStock: 0 }).expect(400);
   expect(body.error.fields).toEqual({ reservedStock: "Không được phép thay đổi trường này." });
  });
 });

 it("returns 404 for an unknown SKU", async () => {
  await patch({ price: 1 }, "NOPE").expect(404);
 });
});

describe("DELETE /api/v1/admin/products/:sku", () => {
 it("deletes a product with no orders, with all its variants, and audits it", async () => {
  const productId = product._id;
  const { body } = await admin.send("DELETE", url()).expect(200);
  expect(body.data).toEqual({ sku: "RC-1" });
  expect(Product.deleteOne).toHaveBeenCalledWith({ _id: productId });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   actorId: admin.user()._id,
   action: "product.delete",
   target: { collectionName: "products", id: String(productId) },
   before: { name: "Royal Canin", skus: ["RC-1", "RC-2"] },
   summary: "Xóa sản phẩm RC-1 · Royal Canin",
  });
 });

 it("refuses when an order references the product", async () => {
  Order.exists.mockResolvedValue({ _id: id("b001") });
  const { body } = await admin.send("DELETE", url()).expect(409);
  expect(body.error.code).toBe("PRODUCT_HAS_ORDERS");
  expect(Order.exists).toHaveBeenCalledWith({ "items.productId": product._id });
  expect(Product.deleteOne).not.toHaveBeenCalled();
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("returns 404 for an unknown SKU", async () => {
  await admin.send("DELETE", url("NOPE")).expect(404);
 });
});

describe("the StockMovement model", () => {
 const data = { productId: id("a001"), sku: "A", type: "adjust", quantity: -2, stockBefore: 5, stockAfter: 3, source: { kind: "adjustment" } };

 it("accepts a signed quantity and stores in its own collection", async () => {
  await expect(new StockMovement(data).validate()).resolves.toBeUndefined();
  expect(StockMovement.collection.name).toBe("stockMovements");
 });

 it.each([
  [{ type: "lost" }], [{ quantity: 1.5 }], [{ stockAfter: -1 }], [{ source: { kind: "magic" } }], [{ source: undefined }], [{ sku: undefined }],
 ])("refuses %j", async (patchData) => {
  await expect(new StockMovement({ ...data, ...patchData }).validate()).rejects.toThrow();
 });
});
