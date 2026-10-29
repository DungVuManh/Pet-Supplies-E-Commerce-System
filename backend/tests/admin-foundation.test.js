import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accentInsensitiveRegex, searchFilter, searchTokens } from "../src/common/search.js";
import { listQuerySchema, parseQuery } from "../src/validators/admin/list-query.js";
import { pageDto, paginate } from "../src/common/pagination.js";
import { recordAudit, stripSecrets } from "../src/common/audit.js";
import { notifyAdmins } from "../src/common/admin-notify.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { AdminNotification } from "../src/models/admin-notification.model.js";

afterEach(() => vi.restoreAllMocks());

// The same matching rule as the frontend `matchesQuery`, applied in memory.
const matches = (query, ...fields) => searchTokens(query).every((token) =>
 fields.some((field) => accentInsensitiveRegex(token).test(field)));

describe("accent-insensitive search", () => {
 it("matches Vietnamese names without accents, in any case", () => {
  expect(matches("do khanh linh", "Đỗ Khánh Linh")).toBe(true);
  expect(matches("duc long", "Vũ Đức Long")).toBe(true);
  expect(matches("Đức", "Vũ Đức Long")).toBe(true);
  expect(matches("DUC", "vũ đức long")).toBe(true);
  expect(matches("dat nham", "Đặt nhầm sản phẩm")).toBe(true);
  expect(matches("don hang", "Đơn hàng mới")).toBe(true);
  expect(matches("ca canh", "Cá cảnh")).toBe(true);
  expect(matches("do khanh minh", "Đỗ Khánh Linh")).toBe(false);
 });

 it("requires every word somewhere in the fields", () => {
  expect(matches("cat ve sinh catsan", "Cát vệ sinh Catsan", "CT-BEN-10L")).toBe(true);
  expect(matches("ve sinh RC-ZERO", "Cát vệ sinh", "CT-BEN-10L")).toBe(false);
  expect(matches("", "anything")).toBe(true);
 });

 it("matches phone digits across spaces and treats input literally", () => {
  expect(matches("0934567890", "0934 567 890")).toBe(true);
  expect(matches("0934 567 890", "0934567890")).toBe(true);
  expect(matches("a.b", "axb")).toBe(false);
  expect(matches("a.b", "A.B")).toBe(true);
  expect(searchTokens("  (.*+?) #PA2610 ")).toEqual([".", "pa2610"]);
  expect(searchTokens(undefined)).toEqual([]);
 });

 it("builds a MongoDB filter with one $or per word", () => {
  expect(searchFilter("  ", ["name"])).toEqual({});
  const filter = searchFilter("duc 09", ["fullName", "phone"]);
  expect(filter.$and).toHaveLength(2);
  expect(Object.keys(filter.$and[0].$or[0])).toEqual(["fullName"]);
  expect(filter.$and[0].$or[1].phone.test("Đức")).toBe(true);
  expect(filter.$and[1].$or[1].phone.test("0 9")).toBe(true);
 });
});

describe("Admin list query", () => {
 it("defaults and trims", () => {
  expect(parseQuery(listQuerySchema, {})).toEqual({ page: 1, pageSize: 6, q: "" });
  expect(parseQuery(listQuerySchema, { page: "3", pageSize: "100", q: "  duc " })).toEqual({ page: 3, pageSize: 100, q: "duc" });
 });

 it("rejects out-of-range paging and long searches with 400", () => {
  for (const query of [{ page: "0" }, { page: "1.5" }, { pageSize: "101" }, { pageSize: "0" }, { page: "x" }, { q: "x".repeat(101) }]) {
   expect(() => parseQuery(listQuerySchema, query)).toThrow(expect.objectContaining({ statusCode: 400, code: "VALIDATION_ERROR" }));
  }
 });

 it("pages a model query and counts the same filter", async () => {
  const chain = { sort: vi.fn(() => chain), skip: vi.fn(() => chain), limit: vi.fn(() => chain), select: vi.fn(() => chain), lean: vi.fn(async () => [{ id: 1 }]) };
  const Model = { find: vi.fn(() => chain), countDocuments: vi.fn(async () => 13) };
  const page = await paginate(Model, { role: "staff" }, { page: 2, pageSize: 6 }, { select: "fullName" });
  expect(page).toEqual({ items: [{ id: 1 }], pagination: { page: 2, pageSize: 6, total: 13, totalPages: 3 } });
  expect(Model.find).toHaveBeenCalledWith({ role: "staff" });
  expect(Model.countDocuments).toHaveBeenCalledWith({ role: "staff" });
  expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
  expect(chain.skip).toHaveBeenCalledWith(6);
  expect(chain.limit).toHaveBeenCalledWith(6);
  expect(chain.select).toHaveBeenCalledWith("fullName");
  expect(pageDto([], 0, { page: 1, pageSize: 6 }).pagination.totalPages).toBe(0);
 });
});

describe("recordAudit", () => {
 const actorId = new mongoose.Types.ObjectId();
 const request = { user: { _id: actorId }, ip: "203.0.113.5" };

 it("records the actor, IP and result without secrets", async () => {
  vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
  const targetId = new mongoose.Types.ObjectId();
  await recordAudit(request, {
   action: "user.update", target: { collectionName: "users", id: targetId },
   before: { role: "customer", firebaseUid: "uid-1", sessionToken: "x" },
   after: { role: "staff", nested: { password: "p", note: "ok" }, ids: [targetId] },
   summary: "Đổi vai trò",
  });
  expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
   actorId, action: "user.update", target: { collectionName: "users", id: String(targetId) },
   before: { role: "customer", firebaseUid: "uid-1" },
   after: { role: "staff", nested: { note: "ok" }, ids: [String(targetId)] },
   ip: "203.0.113.5", result: "success", summary: "Đổi vai trò", at: expect.any(Date),
  }));
 });

 it("never throws into the caller", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(AuditLog, "create").mockRejectedValue(new Error("down"));
  await expect(recordAudit(request, { action: "x", target: { collectionName: "users", id: "1" } })).resolves.toBeNull();
  await expect(recordAudit({}, { action: "x", target: { collectionName: "users", id: "1" } })).resolves.toBeNull();
  expect(console.error).toHaveBeenCalledTimes(2);
 });

 it("keeps dates and primitives in snapshots", () => {
  const at = new Date();
  expect(stripSecrets({ at, n: 1, s: "a", none: null, list: [{ apiSecret: 1, ok: 2 }] }))
   .toEqual({ at, n: 1, s: "a", none: null, list: [{ ok: 2 }] });
 });
});

describe("notifyAdmins", () => {
 it("creates one shared notification", async () => {
  vi.spyOn(AdminNotification, "create").mockImplementation(async (data) => data);
  const data = { type: "stock", title: "Sắp hết hàng", detail: "SKU-1 còn 3", targetHref: "/admin/inventory", reference: "SKU-1" };
  await expect(notifyAdmins(data)).resolves.toEqual(data);
 });

 it("logs failures instead of throwing", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(AdminNotification, "create").mockRejectedValue(new Error("down"));
  await expect(notifyAdmins({ type: "order", title: "Đơn mới", reference: "PA1" })).resolves.toBeNull();
  expect(console.error).toHaveBeenCalledWith("[admin-notify] Failed to create notification", { type: "order", reference: "PA1" });
 });
});
