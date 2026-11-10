import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { User } from "../src/models/user.model.js";
import { parsePeriodQuery } from "../src/validators/admin/period.validator.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const URL = "/api/v1/admin/overview?from=2026-10-01&to=2026-10-03";

/** A chainable find() whose lean() resolves to `rows`. */
const query = (rows) => {
 const chain = { sort: () => chain, limit: () => chain, select: () => chain, populate: () => chain, lean: async () => rows };
 return chain;
};
const aggregateResult = (rows) => ({ option: async () => rows });
const isCurrentPeriod = (pipeline) => pipeline[0].$match.createdAt.$gte.toISOString() === "2026-09-30T17:00:00.000Z";

let send, session;
beforeEach(() => {
 ({ send, session } = createAdminTestApp());
 vi.spyOn(Order, "aggregate").mockImplementation((pipeline) => aggregateResult(isCurrentPeriod(pipeline)
  ? [{ _id: "completed", value: 1_500_000 }, { _id: "cancelled", value: 100_000 }]
  : [{ _id: "completed", value: 800_000 }]));
 vi.spyOn(Product, "aggregate").mockImplementation(() => aggregateResult([{
  total: [{ count: 4 }],
  items: [{ sku: "A-1", name: "Cát vệ sinh", available: 0, threshold: 20 }],
 }]));
 vi.spyOn(Order, "countDocuments").mockImplementation(async (filter) => (filter.createdAt.$gte.toISOString() === "2026-09-30T17:00:00.000Z" ? 3 : 7));
 vi.spyOn(User, "countDocuments").mockImplementation(async () => 2);
 vi.spyOn(Setting, "findById").mockReturnValue(query({ lowStockThreshold: 20 }));
 vi.spyOn(Order, "find").mockReturnValue(query([{
  _id: "o1", orderCode: "PA1", total: 450_000, orderStatus: "delivered", createdAt: new Date("2026-10-03T03:00:00Z"),
  items: [{ name: "Royal Canin", qty: 1 }, { name: "Bát ăn", qty: 1 }], customerId: { fullName: "Nguyễn An" },
 }]));
 vi.spyOn(AuditLog, "find").mockReturnValue(query([{
  _id: "a1", action: "product.update", summary: "Cập nhật sản phẩm", at: new Date("2026-10-03T04:00:00Z"), result: "success", actorId: { fullName: "Phạm Hà" },
 }]));
 vi.spyOn(User, "find").mockReturnValue(query([{
  _id: "u1", fullName: "Đỗ Linh", email: "linh@example.test", createdAt: new Date("2026-10-03T02:00:00Z"),
 }]));
 vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/overview", () => {
 it("is Admin-only", async () => {
  session.role = null;
  expect((await send("GET", URL)).status).toBe(401);
  for (const role of ["staff", "customer"]) {
   session.role = role;
   expect((await send("GET", URL)).status).toBe(403);
  }
 });

 it("counts revenue from completed and cancelled paid orders only, on the order total", async () => {
  await send("GET", URL).expect(200);
  const [pipeline] = Order.aggregate.mock.calls[0];
  expect(pipeline[0].$match).toMatchObject({
   creationState: { $ne: "pending" }, paymentStatus: "paid", orderStatus: { $in: ["completed", "cancelled"] },
  });
  expect(pipeline[1].$group.value).toEqual({ $sum: "$total" });
 });

 it("subtracts refunds from the net revenue, and leaves the chart to the finance report", async () => {
  const { body } = await send("GET", URL).expect(200);
  expect(body.data.revenue).toEqual({ value: 1_400_000, growthPercent: 75 });
 });

 it("can report a negative net revenue when refunds exceed sales", async () => {
  Order.aggregate.mockImplementation(() => aggregateResult([{ _id: "completed", value: 100 }, { _id: "cancelled", value: 300 }]));
  const { body } = await send("GET", URL).expect(200);
  expect(body.data.revenue.value).toBe(-200);
 });

 it("compares against the previous equal-length period", async () => {
  const { body } = await send("GET", URL).expect(200);
  expect(body.data.revenue.growthPercent).toBe(75);
  const previous = Order.aggregate.mock.calls.map(([pipeline]) => pipeline[0].$match.createdAt).find((range) => range.$gte.toISOString() !== "2026-09-30T17:00:00.000Z");
  expect(previous.$gte.toISOString()).toBe("2026-09-27T17:00:00.000Z");
  expect(previous.$lt.toISOString()).toBe("2026-09-30T17:00:00.000Z");
 });

 it("gives no growth when the previous period is zero", async () => {
  Order.aggregate.mockImplementation((pipeline) => aggregateResult(isCurrentPeriod(pipeline) ? [{ _id: "completed", value: 5 }] : []));
  User.countDocuments.mockImplementation(async (filter) => (filter.createdAt.$gte.toISOString() === "2026-09-30T17:00:00.000Z" ? 2 : 0));
  const { body } = await send("GET", URL).expect(200);
  expect(body.data.revenue.growthPercent).toBeNull();
  expect(body.data.newCustomers).toEqual({ value: 2, growthPercent: null });
 });

 it("returns the other counts, stock alerts, and merged activity newest first", async () => {
  const { body } = await send("GET", URL).expect(200);
  expect(body.data.period).toEqual({ preset: null, from: "2026-10-01", to: "2026-10-03" });
  expect(body.data.orders.value).toBe(3);
  expect(body.data.lowStock).toEqual({ total: 4, items: [{ sku: "A-1", name: "Cát vệ sinh", available: 0, threshold: 20 }] });
  expect(body.data.recentActivity.map((row) => row.id)).toEqual(["audit-a1", "order-o1", "user-u1"]);
  expect(body.data.recentActivity[1]).toMatchObject({
   title: "Đơn #PA1 được tạo", detail: "Nguyễn An · Royal Canin và 1 sản phẩm khác", status: "completed", href: "/admin/orders?q=PA1",
  });
  expect(body.data.recentActivity[2]).toMatchObject({ status: "active", value: "Customer", href: "/admin/users/u1" });
 });

 it("mixes activity types so a busy source can't fill the table", async () => {
  const at = (day) => new Date(`2026-10-${day}T03:00:00Z`);
  const audit = (id, day) => ({ _id: id, action: "x", at: at(day), result: "success" });
  const order = (id, day) => ({ _id: id, orderCode: id, total: 1, orderStatus: "pending", createdAt: at(day), items: [] });
  AuditLog.find.mockReturnValue(query([audit("a1", 20), audit("a2", 19), audit("a3", 18), audit("a4", 17), audit("a5", 16)]));
  Order.find.mockReturnValue(query([order("o1", 15), order("o2", 14), order("o3", 13)]));
  User.find.mockReturnValue(query([{ _id: "u1", fullName: "A", email: "a@example.test", createdAt: at(12) }]));
  const { body } = await send("GET", URL).expect(200);
  // Two of each available type, one spare row for the newest of the rest, newest first.
  expect(body.data.recentActivity.map((row) => row.id)).toEqual(["audit-a1", "audit-a2", "audit-a3", "order-o1", "order-o2", "user-u1"]);
 });

 it("gives every spare row to the only type that has events", async () => {
  Order.find.mockReturnValue(query([]));
  User.find.mockReturnValue(query([]));
  AuditLog.find.mockReturnValue(query(Array.from({ length: 6 }, (_, index) => ({ _id: `a${index}`, action: "x", at: new Date(2026, 9, 20 - index), result: "success" }))));
  const { body } = await send("GET", URL).expect(200);
  expect(body.data.recentActivity.map((row) => row.id)).toEqual(["audit-a0", "audit-a1", "audit-a2", "audit-a3", "audit-a4", "audit-a5"]);
 });

 it("applies each variant's own threshold and leaves out hidden products", async () => {
  await send("GET", URL).expect(200);
  const [pipeline] = Product.aggregate.mock.calls[0];
  expect(pipeline[0].$match).toEqual({ isActive: { $ne: false } });
  expect(pipeline[2].$set.threshold).toEqual({ $ifNull: ["$variants.lowStockThreshold", 20] });
 });

 it.each([
  ["revenue", () => Order.aggregate.mockImplementation(() => { throw new Error("boom"); })],
  ["orders", () => Order.countDocuments.mockRejectedValue(new Error("boom"))],
  ["newCustomers", () => User.countDocuments.mockRejectedValue(new Error("boom"))],
  ["lowStock", () => Product.aggregate.mockImplementation(() => { throw new Error("boom"); })],
  ["recentActivity", () => AuditLog.find.mockImplementation(() => { throw new Error("boom"); })],
 ])("a failing %s metric is null and the others still load", async (name, fail) => {
  fail();
  const { body } = await send("GET", URL).expect(200);
  expect(body.data[name]).toBeNull();
  for (const other of ["revenue", "orders", "newCustomers", "lowStock", "recentActivity"].filter((key) => key !== name)) {
   expect(body.data[other]).not.toBeNull();
  }
 });

 it("keeps the current value when only the previous period fails", async () => {
  Order.aggregate.mockImplementation((pipeline) => {
   if (!isCurrentPeriod(pipeline)) throw new Error("boom");
   return aggregateResult([{ _id: "completed", value: 10 }]);
  });
  const { body } = await send("GET", URL).expect(200);
  expect(body.data.revenue).toMatchObject({ value: 10, growthPercent: null });
 });

 it("rejects an invalid period", async () => {
  for (const search of ["from=2026-10-01", "from=2026-10-05&to=2026-10-01", "from=2026-02-30&to=2026-03-01", "from=2025-01-01&to=2026-10-01", "preset=forever", "preset=last-month&from=2026-10-01&to=2026-10-02", "extra=1"]) {
   const { status, body } = await send("GET", `/api/v1/admin/overview?${search}`);
   expect(status, search).toBe(400);
   expect(body.error.code).toBe("VALIDATION_ERROR");
  }
 });
});

describe("parsePeriodQuery", () => {
 // 17:30 UTC on 31 Oct is already 1 Nov in Asia/Ho_Chi_Minh.
 const now = new Date("2026-10-31T17:30:00Z");
 const dates = (query) => {
  const { from, to, preset } = parsePeriodQuery(query, now);
  return { from, to, preset };
 };

 it("defaults to the current local month to date", () => {
  expect(dates({})).toEqual({ from: "2026-11-01", to: "2026-11-01", preset: "this-month" });
 });

 it("resolves the presets", () => {
  expect(dates({ preset: "last-month" })).toEqual({ from: "2026-10-01", to: "2026-10-31", preset: "last-month" });
  expect(dates({ preset: "this-quarter" })).toEqual({ from: "2026-10-01", to: "2026-11-01", preset: "this-quarter" });
  expect(parsePeriodQuery({ preset: "last-month" }, new Date("2026-01-15T00:00:00Z"))).toMatchObject({ from: "2025-12-01", to: "2025-12-31" });
 });

 it("uses local-day boundaries with an exclusive end", () => {
  const { start, end } = parsePeriodQuery({ from: "2026-10-01", to: "2026-10-01" }, now);
  expect(start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
  expect(end.toISOString()).toBe("2026-10-01T17:00:00.000Z");
 });

 it("allows exactly 366 days", () => {
  expect(parsePeriodQuery({ from: "2026-01-01", to: "2027-01-01" }, now).from).toBe("2026-01-01");
 });
});
