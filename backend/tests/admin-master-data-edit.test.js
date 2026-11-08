import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextMasterDataCode } from "../src/common/master-data-code.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { MasterData } from "../src/models/master-data.model.js";
import { Product } from "../src/models/product.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const LOADED_AT = "2026-11-01T03:00:00.000Z";
const SAVED_AT = new Date("2026-11-08T03:00:00.000Z");
const URL = "/api/v1/admin/master-data";

let rows;
let products;
let admin;
let createErrors;

const row = (kind, code, name, fields = {}) => ({ _id: new mongoose.Types.ObjectId(), kind, code, name, description: "", isActive: true, updatedAt: new Date(LOADED_AT), ...fields });
const byCode = (code) => rows.find((item) => item.code === code);
const duplicateKey = () => Object.assign(new Error("E11000"), { code: 11000 });

/** Equality plus the operators the controller uses. */
function matches(item, filter) {
 return Object.entries(filter).every(([key, condition]) => {
  const value = item[key];
  if (condition && typeof condition === "object" && !(condition instanceof mongoose.Types.ObjectId)) {
   if ("$regex" in condition) return new RegExp(condition.$regex, condition.$options).test(value ?? "");
   if ("$ne" in condition) return String(value) !== String(condition.$ne);
  }
  return String(value) === String(condition);
 });
}
const query = (result) => ({ select: () => query(result), lean: async () => result });

beforeEach(() => {
 rows = [
  row("petType", "PET-DOG", "Chó"),
  row("petType", "PET-FISH", "Cá cảnh", { isActive: false }),
  row("petType", "PET-HAM", "Hamster"),
  row("breed", "BR-001", "Poodle", { petTypeCode: "PET-DOG" }),
  row("breed", "BR-007", "Corgi", { petTypeCode: "PET-DOG" }),
  row("brand", "BRD-KONG", "KONG"),
  row("brand", "BRD-MOI", "Thương hiệu mới"),
  row("unit", "UNIT-TUI", "Túi"),
  row("shippingMethod", "SHIP-STD", "Tiêu chuẩn", { fee: 30000 }),
 ];
 products = [{ brand: "KONG", unit: "Túi" }, { brand: "KONG" }];
 createErrors = [];
 admin = createAdminTestApp();
 vi.spyOn(MasterData, "find").mockImplementation((filter) => query(rows.filter((item) => matches(item, filter))));
 vi.spyOn(MasterData, "findOne").mockImplementation((filter) => query(rows.find((item) => matches(item, filter)) ?? null));
 vi.spyOn(MasterData, "findById").mockImplementation((id) => query(rows.find((item) => String(item._id) === String(id)) ?? null));
 vi.spyOn(MasterData, "exists").mockImplementation(async (filter) => (rows.some((item) => matches(item, filter)) ? { _id: "x" } : null));
 vi.spyOn(MasterData, "countDocuments").mockImplementation(async (filter) => rows.filter((item) => matches(item, filter)).length);
 vi.spyOn(MasterData, "create").mockImplementation(async (values) => {
  if (createErrors.length) throw createErrors.shift();
  const document = { _id: new mongoose.Types.ObjectId(), ...values, updatedAt: SAVED_AT };
  rows.push(document);
  return { toObject: () => document };
 });
 vi.spyOn(MasterData, "updateOne").mockImplementation(async (filter, update) => {
  const found = rows.find((item) => String(item._id) === String(filter._id) && item.updatedAt.getTime() === filter.updatedAt.getTime());
  if (found) Object.assign(found, update.$set, { updatedAt: SAVED_AT });
  return { matchedCount: found ? 1 : 0 };
 });
 vi.spyOn(MasterData, "deleteOne").mockImplementation(async (filter) => {
  rows = rows.filter((item) => String(item._id) !== String(filter._id));
  return { deletedCount: 1 };
 });
 vi.spyOn(Product, "countDocuments").mockImplementation(async (filter) => products.filter((item) => matches(item, filter)).length);
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("nextMasterDataCode", () => {
 it("makes codes like the seed, and numbers repeats", () => {
  expect(nextMasterDataCode("brand", "Thương hiệu Đẹp", [])).toBe("BRD-THUONG-HIEU-DEP");
  expect(nextMasterDataCode("brand", "KONG", ["BRD-KONG", "BRD-KONG-2"])).toBe("BRD-KONG-3");
  expect(nextMasterDataCode("unit", "!!!", [])).toBe("UNIT-X");
  expect(nextMasterDataCode("breed", "Bất kỳ", ["BR-001", "BR-007", "OTHER"])).toBe("BR-008");
  expect(nextMasterDataCode("breed", "Đầu tiên", [])).toBe("BR-001");
  expect(nextMasterDataCode("petType", "x".repeat(100), []).length).toBeLessThanOrEqual(44);
 });
});

describe("POST /api/v1/admin/master-data", () => {
 const create = (body) => admin.send("POST", URL, body);

 it.each([
  [{ kind: "petType", name: "Thỏ", description: "Thú nhỏ" }, "PET-THO"],
  [{ kind: "breed", name: "Husky", petTypeCode: "pet-dog" }, "BR-008"],
  [{ kind: "brand", name: "Royal Canin", description: "Pháp" }, "BRD-ROYAL-CANIN"],
  [{ kind: "unit", name: "Hộp" }, "UNIT-HOP"],
  [{ kind: "shippingMethod", name: "Hỏa tốc", fee: 45000 }, "SHIP-HOA-TOC"],
 ])("creates %j as %s and audits it", async (body, code) => {
  const { body: response } = await create(body).expect(201);
  expect(response.data).toMatchObject({ kind: body.kind, code, name: body.name, status: "active", blocker: null });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({ action: "masterData.create", after: { kind: body.kind, code }, result: "success" });
 });

 it("stores the breed's pet type in upper case, and a shipping fee", async () => {
  await create({ kind: "breed", name: "Husky", petTypeCode: "pet-dog" }).expect(201);
  expect(MasterData.create.mock.calls[0][0]).toMatchObject({ petTypeCode: "PET-DOG", isActive: true, description: "" });
  const { body } = await create({ kind: "shippingMethod", name: "Miễn phí", fee: 0, isActive: false }).expect(201);
  expect(body.data).toMatchObject({ fee: 0, status: "inactive" });
 });

 it("numbers a code taken by another name, and retries when another Admin takes it", async () => {
  rows.push(row("brand", "BRD-ROYAL-CANIN", "Royal-Canin cũ"));
  createErrors = [duplicateKey()];
  MasterData.create.mockImplementationOnce(async () => {
   rows.push(row("brand", "BRD-ROYAL-CANIN-2", "Khác"));
   throw createErrors.shift();
  });
  const { body } = await create({ kind: "brand", name: "Royal Canin" }).expect(201);
  expect(body.data.code).toBe("BRD-ROYAL-CANIN-3");
 });

 it("refuses a name in use, ignoring case, and allows it for another pet type", async () => {
  const { body } = await create({ kind: "brand", name: "kong" }).expect(409);
  expect(body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { name: "Tên thương hiệu đã tồn tại." } });
  await create({ kind: "breed", name: "poodle", petTypeCode: "PET-DOG" }).expect(409);
  await create({ kind: "breed", name: "Poodle", petTypeCode: "PET-HAM" }).expect(201);
  expect(MasterData.create).toHaveBeenCalledTimes(1);
 });

 it("does not treat regex characters in a name as a pattern", async () => {
  await create({ kind: "unit", name: "T.i" }).expect(201);
 });

 it.each(["PET-FISH", "PET-NONE"])("refuses a breed of the inactive or unknown pet type %s", async (petTypeCode) => {
  const { body } = await create({ kind: "breed", name: "Mới", petTypeCode }).expect(400);
  expect(body.error.fields).toEqual({ petTypeCode: "Loài thú cưng không tồn tại hoặc đã ngừng dùng." });
 });

 it.each([
  [{ name: "A" }, "kind", "Loại dữ liệu nền không hợp lệ."],
  [{ kind: "colour", name: "A" }, "kind", "Loại dữ liệu nền không hợp lệ."],
  [{ kind: "unit", name: " " }, "name", "Nhập tên."],
  [{ kind: "unit", name: "x".repeat(101) }, "name", "Tên tối đa 100 ký tự."],
  [{ kind: "unit", name: "A", description: "x".repeat(301) }, "description", "Mô tả tối đa 300 ký tự."],
  [{ kind: "unit", name: "A", fee: 5 }, "fee", "Không được phép thay đổi trường này."],
  [{ kind: "brand", name: "A", petTypeCode: "PET-DOG" }, "petTypeCode", "Không được phép thay đổi trường này."],
  [{ kind: "breed", name: "A" }, "petTypeCode", "Chọn loài thú cưng."],
  [{ kind: "shippingMethod", name: "A" }, "fee", "Phí là số nguyên từ 0."],
  [{ kind: "shippingMethod", name: "A", fee: -1 }, "fee", "Phí là số nguyên từ 0."],
  [{ kind: "shippingMethod", name: "A", fee: 1.5 }, "fee", "Phí là số nguyên từ 0."],
  [{ kind: "unit", name: "A", code: "UNIT-X" }, "code", "Không được phép thay đổi trường này."],
 ])("rejects %j on %s", async (body, field, message) => {
  const { body: response } = await create(body).expect(400);
  expect(response.error).toEqual({ code: "VALIDATION_ERROR", fields: { [field]: message } });
  expect(MasterData.create).not.toHaveBeenCalled();
 });
});

describe("GET /api/v1/admin/master-data/:kind/:code", () => {
 it.each([
  ["brand", "BRD-KONG", { renameBlocked: "đang dùng cho 2 sản phẩm", blocker: "đang dùng cho 2 sản phẩm" }],
  ["brand", "BRD-MOI", { renameBlocked: null, blocker: null }],
  ["unit", "UNIT-TUI", { blocker: "đang dùng cho 1 sản phẩm" }],
  ["petType", "PET-DOG", { renameBlocked: null, blocker: "còn 2 giống thuộc loài này" }],
  ["petType", "PET-HAM", { blocker: null }],
  ["breed", "br-001", { petTypeCode: "PET-DOG", fee: null }],
  ["shippingMethod", "SHIP-STD", { fee: 30000, petTypeCode: null }],
 ])("returns %s %s with what blocks a change", async (kind, code, expected) => {
  const { body } = await admin.send("GET", `${URL}/${kind}/${code}`).expect(200);
  expect(body.data).toMatchObject({ kind, code: code.toUpperCase(), updatedAt: LOADED_AT, ...expected });
 });

 it.each([["brand", "BRD-NONE"], ["colour", "X"], ["unit", "BRD-KONG"]])("returns 404 for %s %s", async (kind, code) => {
  await admin.send("GET", `${URL}/${kind}/${code}`).expect(404);
 });
});

describe("PATCH /api/v1/admin/master-data/:kind/:code", () => {
 const patch = (path, body) => admin.send("PATCH", `${URL}/${path}`, { expectedUpdatedAt: LOADED_AT, ...body });

 it("saves only what changed, keeps the code, and audits it", async () => {
  const { body } = await patch("shippingMethod/SHIP-STD", { name: "Tiêu chuẩn", fee: 35000, isActive: false }).expect(200);
  expect(MasterData.updateOne.mock.calls[0][1]).toEqual({ $set: { fee: 35000, isActive: false } });
  expect(body.data).toMatchObject({ code: "SHIP-STD", fee: 35000, status: "inactive", changed: true });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   action: "masterData.update", before: { fee: 30000, isActive: true }, after: { fee: 35000, isActive: false },
   summary: "Cập nhật phương thức vận chuyển SHIP-STD: trạng thái, phí",
  });
 });

 it("renames a brand no product uses", async () => {
  await patch("brand/BRD-MOI", { name: "Thương hiệu khác" }).expect(200);
  expect(byCode("BRD-MOI")).toMatchObject({ name: "Thương hiệu khác", code: "BRD-MOI" });
 });

 it.each([["brand/BRD-KONG", "Kong"], ["unit/UNIT-TUI", "Túi lớn"]])("refuses to rename %s in use, even by case", async (path, name) => {
  const { body } = await patch(path, { name }).expect(409);
  expect(body.error.code).toBe("MASTER_DATA_IN_USE");
  expect(body.error.fields.name).toMatch(/^Không thể đổi tên: đang dùng cho \d sản phẩm/);
  expect(MasterData.updateOne).not.toHaveBeenCalled();
 });

 it("still lets a brand in use be deactivated", async () => {
  await patch("brand/BRD-KONG", { isActive: false }).expect(200);
  expect(byCode("BRD-KONG").isActive).toBe(false);
 });

 it("refuses another row's name, and a breed moved onto a pet type that has it", async () => {
  await patch("brand/BRD-MOI", { name: "KONG" }).expect(409);
  rows.push(row("breed", "BR-010", "Corgi", { petTypeCode: "PET-HAM" }));
  const { body } = await patch("breed/BR-010", { petTypeCode: "PET-DOG" }).expect(409);
  expect(body.error.fields).toEqual({ name: "Tên giống đã tồn tại." });
 });

 it("detects a no-op without writing", async () => {
  const { body } = await patch("unit/UNIT-TUI", { name: "Túi", description: "", isActive: true }).expect(200);
  expect(body.data.changed).toBe(false);
  expect(MasterData.updateOne).not.toHaveBeenCalled();
 });

 it("refuses an edit loaded before someone else's save", async () => {
  const { body } = await admin.send("PATCH", `${URL}/unit/UNIT-TUI`, { expectedUpdatedAt: "2026-10-01T00:00:00.000Z", description: "x" }).expect(409);
  expect(body.error.code).toBe("STALE_MASTER_DATA");
 });

 it("refuses a code change and fields of another kind", async () => {
  expect((await patch("unit/UNIT-TUI", { code: "UNIT-NEW" }).expect(400)).body.error.fields).toEqual({ code: "Không được phép thay đổi trường này." });
  expect((await patch("unit/UNIT-TUI", { fee: 1 }).expect(400)).body.error.fields).toEqual({ fee: "Không được phép thay đổi trường này." });
 });
});

describe("DELETE /api/v1/admin/master-data/:kind/:code", () => {
 it("deletes an unused row and audits it", async () => {
  await admin.send("DELETE", `${URL}/brand/BRD-MOI`).expect(200);
  expect(byCode("BRD-MOI")).toBeUndefined();
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({ action: "masterData.delete", before: { code: "BRD-MOI", name: "Thương hiệu mới" } });
 });

 it.each(["brand/BRD-KONG", "unit/UNIT-TUI", "petType/PET-DOG"])("refuses %s while in use", async (path) => {
  const { body } = await admin.send("DELETE", `${URL}/${path}`).expect(409);
  expect(body.error.code).toBe("MASTER_DATA_IN_USE");
  expect(MasterData.deleteOne).not.toHaveBeenCalled();
 });
});

describe("access", () => {
 const calls = [["POST", URL, { kind: "unit", name: "A" }], ["GET", `${URL}/unit/UNIT-TUI`], ["PATCH", `${URL}/unit/UNIT-TUI`, { expectedUpdatedAt: LOADED_AT }], ["DELETE", `${URL}/brand/BRD-MOI`]];

 it.each(calls)("refuses %s %s to a guest, a Customer, and Staff", async (method, path, body) => {
  admin.session.role = null;
  await admin.send(method, path, body).expect(401);
  for (const role of ["customer", "staff"]) {
   admin.session.role = role;
   await admin.send(method, path, body).expect(403);
  }
 });

 it.each(calls.filter(([method]) => method !== "GET"))("refuses %s %s without the CSRF pair", async (method, path, body) => {
  await admin.send(method, path, body, { csrf: false }).expect(403);
  expect(MasterData.create).not.toHaveBeenCalled();
  expect(MasterData.updateOne).not.toHaveBeenCalled();
  expect(MasterData.deleteOne).not.toHaveBeenCalled();
 });
});
