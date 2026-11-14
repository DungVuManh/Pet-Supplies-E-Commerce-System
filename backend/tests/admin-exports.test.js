import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EXPORT_LIMIT } from "../src/controllers/admin/product.controller.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Category } from "../src/models/category.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const food = { _id: new mongoose.Types.ObjectId(), code: "DM002", name: "Thức ăn" };
const toy = { _id: new mongoose.Types.ObjectId(), code: "DM003", name: "Đồ chơi" };
const variant = (sku, fields = {}) => ({ sku, label: sku, price: 100000, stock: 50, reservedStock: 0, ...fields });
const product = (name, fields) => ({ _id: new mongoose.Types.ObjectId(), name, brand: "B", isActive: true, categoryIds: [food._id], ...fields });

let products;
let admin;

const exportProducts = async (query = {}) => (await admin.send("GET", `/api/v1/admin/products/export?${new URLSearchParams(query)}`).expect(200)).body.data;

beforeEach(() => {
 products = [
  product("Royal Canin", { variants: [variant("RC-1", { cost: 98765 }), variant("RC-2")] }),
  product("Whiskas", { isActive: false, variants: [variant("WK-1")] }),
  product("KONG", { categoryIds: [toy._id], variants: [variant("KG-1", { stock: 3 })] }),
 ];
 admin = createAdminTestApp();
 vi.spyOn(Product, "find").mockImplementation(() => {
  const chain = { select: () => chain, sort: () => chain, lean: async () => products };
  return chain;
 });
 vi.spyOn(Category, "find").mockImplementation(() => ({ select: () => ({ lean: async () => [food, toy] }) }));
 vi.spyOn(Setting, "findById").mockImplementation(() => ({ select: () => ({ lean: async () => ({ lowStockThreshold: 5 }) }) }));
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/products/export", () => {
 it("returns every matching row across pages, never the cost, and audits it", async () => {
  const data = await exportProducts({ pageSize: "1", page: "2" });
  expect(data.items.map((row) => row.sku)).toEqual(["RC-1", "RC-2", "WK-1", "KG-1"]);
  expect(data).toMatchObject({ total: 4, truncated: false });
  expect(JSON.stringify(data)).not.toContain("98765");
  expect(data.items[0]).not.toHaveProperty("cost");
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   action: "product.export", after: { tab: "all", rows: 4 }, summary: "Xuất danh sách sản phẩm: 4 dòng", result: "success",
  });
 });

 it.each([
  [{ tab: "hidden" }, ["WK-1"]],
  [{ status: "low" }, ["KG-1"]],
  [{ category: "DM003" }, ["KG-1"]],
  [{ q: "royal" }, ["RC-1", "RC-2"]],
  [{ q: "nothing" }, []],
 ])("applies %j like the list", async (query, expected) => {
  expect((await exportProducts(query)).items.map((row) => row.sku)).toEqual(expected);
 });

 it(`stops at ${EXPORT_LIMIT} rows and says so`, async () => {
  products = [product("Nhiều", { variants: Array.from({ length: EXPORT_LIMIT + 3 }, (_, index) => variant(`MANY-${index}`)) })];
  const data = await exportProducts();
  expect(data.items).toHaveLength(EXPORT_LIMIT);
  expect(data).toMatchObject({ total: EXPORT_LIMIT + 3, truncated: true });
 });

 it("is not read as a SKU", async () => {
  const getProduct = vi.spyOn(Product, "findOne");
  await exportProducts();
  expect(getProduct).not.toHaveBeenCalled();
 });

 it("refuses a guest, a Customer, and Staff, and a bad filter", async () => {
  admin.session.role = null;
  await admin.send("GET", "/api/v1/admin/products/export").expect(401);
  for (const role of ["customer", "staff"]) {
   admin.session.role = role;
   await admin.send("GET", "/api/v1/admin/products/export").expect(403);
  }
  admin.session.role = "admin";
  await admin.send("GET", "/api/v1/admin/products/export?status=gone").expect(400);
 });
});
