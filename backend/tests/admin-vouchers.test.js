import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Order } from "../src/models/order.model.js";
import { PromotionRedemption } from "../src/models/promotion-redemption.model.js";
import { Promotion } from "../src/models/promotion.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const LOADED_AT = "2026-10-08T03:00:00.000Z";
const at = new Date(LOADED_AT);
const NOW = new Date("2026-11-15T05:00:00.000Z");
const day = (date) => new Date(`${date}T00:00:00+07:00`);
const url = (code) => `/api/v1/admin/vouchers/${code}`;
const form = (patch = {}) => ({
 code: "new10", name: "Giảm 10%", type: "percent", value: 10, maxDiscount: 50000, minOrderAmount: 100000,
 startDate: "2026-11-01", endDate: "2026-11-30", usageLimit: 100, oncePerCustomer: true, isPublic: true, ...patch,
});

let vouchers;
let redemptions;
let orders;
let admin;

const seedVoucher = (patch) => ({
 _id: new mongoose.Types.ObjectId(), code: "SALE", name: "Khuyến mãi", type: "percent", value: 10, minOrderAmount: 0,
 startAt: day("2026-11-01"), endAt: day("2026-12-01"), isActive: true, usedCount: 0, oncePerCustomer: true, isPublic: false,
 createdAt: at, updatedAt: at, ...patch,
});
const byCode = (code) => vouchers.find((item) => item.code === code);
const audits = () => AuditLog.create.mock.calls.map(([entry]) => entry);
const patch = (code, body) => admin.send("PATCH", url(code), { expectedUpdatedAt: LOADED_AT, ...body });

beforeEach(() => {
 vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
 vouchers = [
  seedVoucher({ code: "SALE" }),
  seedVoucher({ code: "SOON", name: "Sắp có", startAt: day("2026-12-01"), endAt: day("2026-12-31") }),
  seedVoucher({ code: "OLD", name: "Đã hết hạn", startAt: day("2026-01-01"), endAt: day("2026-02-01") }),
  seedVoucher({ code: "FULL", name: "Hết lượt", usageLimit: 2, usedCount: 2 }),
  seedVoucher({ code: "OFF", name: "Đã tắt", isActive: false }),
 ];
 redemptions = [];
 orders = [];
 admin = createAdminTestApp();
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
 vi.spyOn(Promotion, "find").mockImplementation(() => ({ sort: () => ({ lean: async () => vouchers }) }));
 vi.spyOn(Promotion, "findOne").mockImplementation((filter) => ({ lean: async () => byCode(filter.code) ?? null }));
 vi.spyOn(Promotion, "findById").mockImplementation((id) => ({ lean: async () => vouchers.find((item) => String(item._id) === String(id)) ?? null }));
 vi.spyOn(Promotion, "create").mockImplementation(async (fields) => {
  if (byCode(fields.code.toUpperCase())) throw Object.assign(new Error("dup"), { code: 11000 });
  const voucher = seedVoucher({ ...fields, createdAt: new Date(), updatedAt: new Date() });
  vouchers.push(voucher);
  return { ...voucher, toObject: () => voucher };
 });
 vi.spyOn(Promotion, "updateOne").mockImplementation(async (filter, update) => {
  const found = vouchers.find((item) => String(item._id) === String(filter._id) && item.updatedAt.getTime() === filter.updatedAt.getTime());
  if (!found) return { matchedCount: 0 };
  if (filter.usedCount && (found.usedCount ?? 0) !== 0) return { matchedCount: 0 };
  if (update.$set?.code && vouchers.some((item) => item !== found && item.code === update.$set.code)) throw Object.assign(new Error("dup"), { code: 11000 });
  Object.assign(found, update.$set, { updatedAt: new Date("2026-11-15T06:00:00Z") });
  for (const field of Object.keys(update.$unset ?? {})) delete found[field];
  return { matchedCount: 1 };
 });
 vi.spyOn(Promotion, "findOneAndUpdate").mockImplementation((filter, update) => ({
  lean: async () => {
   const found = vouchers.find((item) => String(item._id) === String(filter._id));
   const wanted = filter.isActive === false ? found.isActive === false : found.isActive !== false;
   if (!wanted) return null;
   Object.assign(found, update.$set);
   return found;
  },
 }));
 vi.spyOn(Promotion, "deleteOne").mockImplementation(async ({ _id }) => {
  const before = vouchers.length;
  vouchers = vouchers.filter((item) => String(item._id) !== String(_id));
  return { deletedCount: before - vouchers.length };
 });
 vi.spyOn(PromotionRedemption, "exists").mockImplementation(async ({ promotionId }) => (redemptions.some((item) => String(item.promotionId) === String(promotionId)) ? { _id: "x" } : null));
 vi.spyOn(PromotionRedemption, "aggregate").mockImplementation(async ([{ $match }]) => {
  const ids = $match.promotionId.$in.map(String);
  const totals = new Map();
  for (const item of redemptions) {
   if (item.status === "active" && ids.includes(String(item.promotionId))) totals.set(String(item.promotionId), (totals.get(String(item.promotionId)) ?? 0) + item.discount);
  }
  return [...totals].map(([_id, total]) => ({ _id, total }));
 });
 vi.spyOn(Order, "exists").mockImplementation(async ({ promotionCode }) => (orders.includes(promotionCode) ? { _id: "x" } : null));
});
afterEach(() => {
 vi.useRealTimers();
 vi.restoreAllMocks();
});

describe("GET /api/v1/admin/vouchers", () => {
 it("counts every tab, joining used-up and expired as ended", async () => {
  const { body } = await admin.send("GET", "/api/v1/admin/vouchers").expect(200);
  expect(body.data.counts).toEqual({ all: 5, active: 1, scheduled: 1, ended: 2, disabled: 1 });
  expect(body.data.pagination).toMatchObject({ total: 5, page: 1 });
 });

 it.each([["active", ["SALE"]], ["scheduled", ["SOON"]], ["ended", ["OLD", "FULL"]], ["disabled", ["OFF"]]])("filters the %s tab", async (tab, codes) => {
  const { body } = await admin.send("GET", `/api/v1/admin/vouchers?tab=${tab}`).expect(200);
  expect(body.data.items.map((item) => item.code)).toEqual(codes);
 });

 it("searches code and name, ignoring accents and case, and counts within the search", async () => {
  const { body } = await admin.send("GET", "/api/v1/admin/vouchers?q=da%20tat").expect(200);
  expect(body.data.items.map((item) => item.code)).toEqual(["OFF"]);
  expect(body.data.counts.all).toBe(1);
  const byCodeSearch = await admin.send("GET", "/api/v1/admin/vouchers?q=sale").expect(200);
  expect(byCodeSearch.body.data.items.map((item) => item.code)).toEqual(["SALE"]);
 });

 it("pages the results", async () => {
  const { body } = await admin.send("GET", "/api/v1/admin/vouchers?page=2&pageSize=2").expect(200);
  expect(body.data.items.map((item) => item.code)).toEqual(["OLD", "FULL"]);
  expect(body.data.pagination).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
 });

 it("sums the discount from active redemptions only", async () => {
  const { _id: promotionId } = byCode("SALE");
  redemptions = [{ promotionId, status: "active", discount: 5000 }, { promotionId, status: "active", discount: 7000 }, { promotionId, status: "released", discount: 9000 }];
  const { body } = await admin.send("GET", "/api/v1/admin/vouchers?tab=active").expect(200);
  expect(body.data.items[0].discountGiven).toBe(12000);
 });

 it("treats a document with no usedCount as unused", async () => {
  delete byCode("SALE").usedCount;
  byCode("SALE").usageLimit = 1;
  const { body } = await admin.send("GET", "/api/v1/admin/vouchers?tab=active").expect(200);
  expect(body.data.items[0]).toMatchObject({ code: "SALE", usedCount: 0, state: "active" });
 });

 it("refuses an unknown tab", async () => {
  await admin.send("GET", "/api/v1/admin/vouchers?tab=other").expect(400);
 });
});

describe("GET /api/v1/admin/vouchers/:code", () => {
 it("returns the form's data in Vietnam calendar days", async () => {
  const { body } = await admin.send("GET", url("sale")).expect(200);
  expect(body.data).toMatchObject({
   code: "SALE", startDate: "2026-11-01", endDate: "2026-11-30", state: "active", used: false, lockedFields: [], updatedAt: LOADED_AT, usedCount: 0,
  });
 });

 it.each([
  ["a counted use", () => { byCode("SALE").usedCount = 1; }],
  ["a released redemption", () => { redemptions = [{ promotionId: byCode("SALE")._id, status: "released", discount: 1 }]; }],
  ["an order with the code", () => { orders = ["SALE"]; }],
 ])("locks fields after %s", async (_name, arrange) => {
  arrange();
  const { body } = await admin.send("GET", url("SALE")).expect(200);
  expect(body.data).toMatchObject({ used: true, lockedFields: ["code", "type", "value"] });
 });

 it("is 404 when unknown", async () => {
  const { body } = await admin.send("GET", url("NOPE")).expect(404);
  expect(body.error.code).toBe("NOT_FOUND");
 });
});

describe("POST /api/v1/admin/vouchers", () => {
 it("creates a voucher with its dates as Vietnam days, and audits it", async () => {
  const { body } = await admin.send("POST", "/api/v1/admin/vouchers", form()).expect(201);
  expect(body.data).toMatchObject({ code: "NEW10", usedCount: 0, startDate: "2026-11-01", endDate: "2026-11-30" });
  expect(byCode("NEW10").startAt.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  expect(byCode("NEW10").endAt.toISOString()).toBe("2026-11-30T17:00:00.000Z");
  expect(audits()[0]).toMatchObject({ action: "voucher.create", target: { collectionName: "promotions" } });
 });

 it("leaves empty optional limits off the document", async () => {
  await admin.send("POST", "/api/v1/admin/vouchers", form({ type: "fixed", value: 20000, maxDiscount: null, usageLimit: null })).expect(201);
  expect(byCode("NEW10").maxDiscount).toBeUndefined();
  expect(byCode("NEW10").usageLimit).toBeUndefined();
 });

 it.each([
  ["code", { code: "ab" }, "3–30 ký tự"],
  ["code", { code: "có dấu" }, "3–30 ký tự"],
  ["code", { code: "x".repeat(31) }, "3–30 ký tự"],
  ["name", { name: " " }, "Vui lòng nhập tên"],
  ["name", { name: "x".repeat(101) }, "tối đa 100"],
  ["type", { type: "shipping" }, "Loại giảm giá"],
  ["value", { value: 0 }, "từ 1 trở lên"],
  ["value", { value: 101 }, "từ 1 đến 100"],
  ["value", { value: 10.5 }, "số nguyên"],
  ["value", { type: "fixed", maxDiscount: null, value: 1.5 }, "số nguyên"],
  ["maxDiscount", { maxDiscount: 0 }, "từ 1 ₫"],
  ["maxDiscount", { type: "fixed", value: 1000, maxDiscount: 500 }, "phần trăm"],
  ["minOrderAmount", { minOrderAmount: -1 }, "không được âm"],
  ["startDate", { startDate: "2026-13-40" }, "không hợp lệ"],
  ["endDate", { endDate: "tomorrow" }, "không hợp lệ"],
  ["endDate", { startDate: "2026-11-30", endDate: "2026-11-01" }, "từ ngày bắt đầu"],
  ["usageLimit", { usageLimit: 0 }, "từ 1 trở lên"],
  ["usageLimit", { usageLimit: 1.5 }, "số nguyên"],
  ["usedCount", { usedCount: 5 }, "Không được phép"],
 ])("rejects %s with its own message: %j", async (field, input, message) => {
  const { body } = await admin.send("POST", "/api/v1/admin/vouchers", form(input)).expect(400);
  expect(body.error.fields[field]).toContain(message);
  expect(Promotion.create).not.toHaveBeenCalled();
 });

 it("allows a voucher lasting a single day", async () => {
  await admin.send("POST", "/api/v1/admin/vouchers", form({ startDate: "2026-11-20", endDate: "2026-11-20" })).expect(201);
  expect(byCode("NEW10").endAt > byCode("NEW10").startAt).toBe(true);
 });

 it("reports a duplicate code with MSG32, including a race caught by the index", async () => {
  const { body } = await admin.send("POST", "/api/v1/admin/vouchers", form({ code: "sale" })).expect(409);
  expect(body.error).toMatchObject({ code: "DUPLICATE_VALUE", fields: { code: "Mã voucher đã tồn tại." } });
  expect(audits()).toHaveLength(0);
 });
});

describe("PATCH /api/v1/admin/vouchers/:code", () => {
 it("changes only what differs, and audits exactly that", async () => {
  const { body } = await patch("SALE", { name: "Tên mới", usageLimit: 50 }).expect(200);
  expect(body.data).toMatchObject({ changed: true, name: "Tên mới", usageLimit: 50 });
  expect(audits()[0]).toMatchObject({ action: "voucher.update", before: { name: "Khuyến mãi", usageLimit: null }, after: { name: "Tên mới", usageLimit: 50 } });
 });

 it("requires expectedUpdatedAt, and refuses a stale edit", async () => {
  const missing = await admin.send("PATCH", url("SALE"), { name: "X" }).expect(400);
  expect(missing.body.error.fields.expectedUpdatedAt).toBeTruthy();
  const { body } = await admin.send("PATCH", url("SALE"), { expectedUpdatedAt: "2020-01-01T00:00:00.000Z", name: "X" }).expect(409);
  expect(body.error.code).toBe("STALE_VOUCHER");
  expect(Promotion.updateOne).not.toHaveBeenCalled();
 });

 it("refuses an edit that loses the race to another write", async () => {
  Promotion.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
  const { body } = await patch("SALE", { name: "X" }).expect(409);
  expect(body.error.code).toBe("STALE_VOUCHER");
  expect(audits()).toHaveLength(0);
 });

 it("writes nothing for a no-op, including one that resends every field", async () => {
  const { body: { data: current } } = await admin.send("GET", url("SALE"));
  const { code, name, type, value, maxDiscount, minOrderAmount, startDate, endDate, usageLimit, oncePerCustomer, isPublic } = current;
  const { body } = await patch("SALE", { code, name, type, value, maxDiscount, minOrderAmount, startDate, endDate, usageLimit, oncePerCustomer, isPublic }).expect(200);
  expect(body.data.changed).toBe(false);
  expect(Promotion.updateOne).not.toHaveBeenCalled();
  expect(audits()).toHaveLength(0);
 });

 it("keeps an exact stored time when the day did not change", async () => {
  const exact = new Date("2026-11-20T09:30:00.000Z");
  byCode("SALE").endAt = exact;
  await patch("SALE", { endDate: "2026-11-20", name: "Tên mới" }).expect(200);
  expect(byCode("SALE").endAt).toBe(exact);
 });

 it.each([["code", { code: "OTHER" }], ["type", { type: "fixed" }], ["value", { value: 20 }]])("locks %s after the first use", async (field, input) => {
  byCode("SALE").usedCount = 1;
  const { body } = await patch("SALE", input).expect(400);
  expect(body.error.fields[field]).toContain("đã được sử dụng");
  expect(Promotion.updateOne).not.toHaveBeenCalled();
 });

 it("still edits limits, dates and the name after the first use", async () => {
  byCode("SALE").usedCount = 1;
  await patch("SALE", { name: "Tên mới", endDate: "2026-12-15", usageLimit: 5, minOrderAmount: 1000 }).expect(200);
  expect(byCode("SALE")).toMatchObject({ name: "Tên mới", usageLimit: 5, minOrderAmount: 1000 });
 });

 it("makes a locked-field write conditional on nothing having been spent since", async () => {
  await patch("SALE", { value: 20 }).expect(200);
  expect(Promotion.updateOne.mock.calls[0][0].usedCount).toEqual({ $in: [0, null] });
 });

 it("refuses a usage limit below the uses so far, and guards the write against a concurrent use", async () => {
  byCode("SALE").usedCount = 5;
  const { body } = await patch("SALE", { usageLimit: 4 }).expect(400);
  expect(body.error.fields.usageLimit).toContain("(5)");
  await patch("SALE", { usageLimit: 5 }).expect(200);
  expect(Promotion.updateOne.mock.calls[0][0].$expr).toEqual({ $lte: [{ $ifNull: ["$usedCount", 0] }, 5] });
 });

 it("holds an edit to the cross-field rules using the stored values", async () => {
  const fixedOnPercent = await patch("SALE", { value: 150 }).expect(400);
  expect(fixedOnPercent.body.error.fields.value).toContain("1 đến 100");
  const dates = await patch("SALE", { endDate: "2026-10-01" }).expect(400);
  expect(dates.body.error.fields.endDate).toContain("từ ngày bắt đầu");
 });

 it("clears a limit", async () => {
  byCode("SALE").usageLimit = 10;
  await patch("SALE", { usageLimit: null }).expect(200);
  expect(byCode("SALE").usageLimit).toBeUndefined();
 });

 it("refuses renaming to a code that exists, and unknown fields", async () => {
  const { body } = await patch("SALE", { code: "soon" }).expect(409);
  expect(body.error.code).toBe("DUPLICATE_VALUE");
  const unknown = await patch("SALE", { usedCount: 0 }).expect(400);
  expect(unknown.body.error.fields.usedCount).toBeTruthy();
 });

 it("is 404 when unknown", async () => {
  await patch("NOPE", { name: "X" }).expect(404);
 });
});

describe("enable and disable", () => {
 it("turns off and on, auditing each", async () => {
  const off = await admin.send("POST", `${url("SALE")}/disable`).expect(200);
  expect(off.body.data.state).toBe("disabled");
  const on = await admin.send("POST", `${url("SALE")}/enable`).expect(200);
  expect(on.body.data.state).toBe("active");
  expect(audits().map((entry) => [entry.action, entry.after])).toEqual([
   ["voucher.disable", { isActive: false }], ["voucher.enable", { isActive: true }],
  ]);
 });

 it("refuses a repeat without auditing it", async () => {
  const off = await admin.send("POST", `${url("OFF")}/disable`).expect(409);
  expect(off.body.error.code).toBe("VOUCHER_ALREADY_DISABLED");
  const on = await admin.send("POST", `${url("SALE")}/enable`).expect(409);
  expect(on.body.error.code).toBe("VOUCHER_ALREADY_ENABLED");
  expect(audits()).toHaveLength(0);
 });
});

describe("DELETE /api/v1/admin/vouchers/:code", () => {
 it("deletes a voucher never used, and audits it", async () => {
  await admin.send("DELETE", url("SALE")).expect(200);
  expect(byCode("SALE")).toBeUndefined();
  expect(audits()[0]).toMatchObject({ action: "voucher.delete", before: { code: "SALE" } });
 });

 it.each([
  ["a counted use", () => { byCode("SALE").usedCount = 1; }],
  ["a released redemption", () => { redemptions = [{ promotionId: byCode("SALE")._id, status: "released", discount: 1 }]; }],
  ["an order with the code", () => { orders = ["SALE"]; }],
 ])("refuses after %s, saying why", async (_name, arrange) => {
  arrange();
  const { body } = await admin.send("DELETE", url("SALE")).expect(409);
  expect(body.error.code).toBe("VOUCHER_IN_USE");
  expect(body.message).toContain("SALE");
  expect(byCode("SALE")).toBeDefined();
  expect(audits()).toHaveLength(0);
 });

 it("refuses when an order reserved a use after the check", async () => {
  Promotion.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });
  const { body } = await admin.send("DELETE", url("SALE")).expect(409);
  expect(body.error.code).toBe("VOUCHER_IN_USE");
  expect(Promotion.deleteOne.mock.calls[0][0].usedCount).toEqual({ $in: [0, null] });
 });
});
