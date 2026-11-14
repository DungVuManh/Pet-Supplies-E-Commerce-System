import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Order } from "../src/models/order.model.js";
import { User } from "../src/models/user.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`e0000000000000000000${suffix}`);
const linh = { _id: id("0001"), fullName: "Đỗ Khánh Linh", phone: "0945678901" };

const order = (code, day, orderStatus, fields = {}) => ({
 _id: new mongoose.Types.ObjectId(),
 orderCode: code,
 orderStatus,
 total: 100000,
 paymentMethod: "COD",
 createdAt: new Date(`2026-10-${day}T03:00:00Z`),
 shippingAddress: { recipientName: "Trần Bảo Ngọc", phone: "0912 456 789" },
 ...fields,
});

const seed = () => [
 order("PA-PENDING", "20", "pending"),
 order("PA-CONFIRM", "19", "confirmed"),
 order("PA-PROCESS", "18", "processing"),
 order("PA-SHIP", "17", "shipping"),
 order("PA-DONE", "16", "completed", { paymentMethod: "ONLINE" }),
 order("PA-OLD", "15", "delivered"),
 order("PA-CANCEL", "14", "cancelled"),
 // A guest order, with the guest's own details.
 order("PA-GUEST", "13", "completed", { guestInfo: { name: "Vũ Đức Long", phone: "0987654321" }, shippingAddress: { recipientName: "Người nhận khác", phone: "0900000001" } }),
 // A signed-in customer whose checkout stored the literal text "null".
 order("PA-ACCOUNT", "12", "completed", { customerId: linh._id, shippingAddress: { recipientName: "null", phone: "null" } }),
 // An in-store sale with no customer details at all.
 order("PA-WALKIN", "11", "completed", { channel: "offline", paymentMethod: "CASH", shippingAddress: undefined }),
 // A Staff sale whose stock writes are still in flight.
 order("PA-INFLIGHT", "21", "completed", { creationState: "pending" }),
];

let orders;
let admin;

function get(document, path) {
 return path.split(".").reduce((value, key) => value?.[key], document);
}

// A small in-memory stand-in for the MongoDB filter semantics the list relies on.
function matches(document, filter) {
 return Object.entries(filter).every(([key, condition]) => {
  if (key === "$and") return condition.every((part) => matches(document, part));
  if (key === "$or") return condition.some((part) => matches(document, part));
  const value = get(document, key);
  if (condition instanceof RegExp) return condition.test(value ?? "");
  if (condition?.$in) return condition.$in.some((item) => String(item) === String(value));
  if (condition?.$ne !== undefined) return value !== condition.$ne;
  return value === condition;
 });
}

function fakeFind(rows, filter) {
 const state = { skip: 0, limit: Infinity };
 const chain = {
  sort: () => chain, select: () => chain,
  skip: (value) => { state.skip = value; return chain; },
  limit: (value) => { state.limit = value; return chain; },
  lean: async () => rows.filter((item) => matches(item, filter)).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(state.skip, state.skip + state.limit),
 };
 return chain;
}

const list = async (query = {}) => (await admin.send("GET", `/api/v1/admin/orders?${new URLSearchParams({ pageSize: "100", ...query })}`).expect(200)).body.data;
const codes = (data) => data.items.map((row) => row.orderCode);
const row = (data, code) => data.items.find((item) => item.orderCode === code);

beforeEach(() => {
 orders = seed();
 admin = createAdminTestApp();
 vi.spyOn(Order, "find").mockImplementation((filter) => fakeFind(orders, filter));
 vi.spyOn(Order, "countDocuments").mockImplementation(async (filter) => orders.filter((item) => matches(item, filter)).length);
 vi.spyOn(Order, "aggregate").mockImplementation(async ([{ $match }]) => {
  const groups = new Map();
  for (const item of orders.filter((value) => matches(value, $match))) groups.set(item.orderStatus, (groups.get(item.orderStatus) ?? 0) + 1);
  return [...groups].map(([_id, count]) => ({ _id, count }));
 });
 vi.spyOn(User, "find").mockImplementation((filter) => fakeFind([linh], filter));
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/orders", () => {
 it("lists every channel newest first, hiding Staff sales still being created", async () => {
  const data = await list();
  expect(codes(data)).toEqual(["PA-PENDING", "PA-CONFIRM", "PA-PROCESS", "PA-SHIP", "PA-DONE", "PA-OLD", "PA-CANCEL", "PA-GUEST", "PA-ACCOUNT", "PA-WALKIN"]);
  expect(codes(data)).not.toContain("PA-INFLIGHT");
 });

 it("returns only the row fields", async () => {
  expect(row(await list(), "PA-DONE")).toEqual({
   orderCode: "PA-DONE", customerName: "Trần Bảo Ngọc", phone: "0912 456 789", createdAt: "2026-10-16T03:00:00.000Z",
   total: 100000, paymentMethod: "ONLINE", status: "completed",
  });
 });

 describe("customer details", () => {
  it("prefers the guest's own details", async () => {
   expect(row(await list(), "PA-GUEST")).toMatchObject({ customerName: "Vũ Đức Long", phone: "0987654321" });
  });

  it("falls back to the account, treating the stored text null as missing", async () => {
   expect(row(await list(), "PA-ACCOUNT")).toMatchObject({ customerName: "Đỗ Khánh Linh", phone: "0945678901" });
  });

  it("labels an in-store sale with no customer", async () => {
   expect(row(await list(), "PA-WALKIN")).toMatchObject({ customerName: "Khách lẻ", phone: "", paymentMethod: "CASH" });
  });
 });

 describe("tabs", () => {
  it.each([
   ["processing", ["PA-PENDING", "PA-CONFIRM", "PA-PROCESS"]],
   ["shipping", ["PA-SHIP"]],
   ["completed", ["PA-DONE", "PA-OLD", "PA-GUEST", "PA-ACCOUNT", "PA-WALKIN"]],
   ["cancelled", ["PA-CANCEL"]],
  ])("groups %s", async (tab, expected) => {
   expect(codes(await list({ tab }))).toEqual(expected);
  });

  it("covers every status, so each order is in exactly one tab", async () => {
   const all = codes(await list());
   const grouped = [];
   for (const tab of ["processing", "shipping", "completed", "cancelled"]) grouped.push(...codes(await list({ tab })));
   expect([...grouped].sort()).toEqual([...all].sort());
   expect(new Set(orders.filter((item) => !item.creationState).map((item) => item.orderStatus)).size).toBe(7);
  });

  it("counts each tab, ignoring the filters and hidden sales", async () => {
   const counts = { all: 10, processing: 3, shipping: 1, completed: 5, cancelled: 1 };
   expect((await list()).counts).toEqual(counts);
   expect((await list({ tab: "shipping", q: "PA-SHIP" })).counts).toEqual(counts);
  });

  it("shows a legacy delivered order as completed", async () => {
   expect(row(await list(), "PA-OLD").status).toBe("completed");
  });
 });

 describe("status filter", () => {
  it.each([
   ["pending", ["PA-PENDING", "PA-CONFIRM"]],
   ["processing", ["PA-PROCESS"]],
   ["cancelled", ["PA-CANCEL"]],
  ])("filters %s, matching the badges", async (status, expected) => {
   expect(codes(await list({ status }))).toEqual(expected);
  });

  it("combines with the tab", async () => {
   expect(codes(await list({ tab: "processing", status: "processing" }))).toEqual(["PA-PROCESS"]);
   expect(codes(await list({ tab: "shipping", status: "cancelled" }))).toEqual([]);
  });
 });

 describe("search", () => {
  it.each([
   ["PA-SHIP", ["PA-SHIP"]],
   ["#PA-SHIP", ["PA-SHIP"]],
   ["# PA-SHIP", ["PA-SHIP"]],
   ["pa-ship", ["PA-SHIP"]],
   ["Vũ Đức Long", ["PA-GUEST"]],
   ["vu duc long", ["PA-GUEST"]],
   ["0987654321", ["PA-GUEST"]],
   ["0912456789", ["PA-PENDING", "PA-CONFIRM", "PA-PROCESS", "PA-SHIP", "PA-DONE", "PA-OLD", "PA-CANCEL"]],
   ["Đỗ Khánh Linh", ["PA-ACCOUNT"]],
   ["do khanh linh", ["PA-ACCOUNT"]],
   ["0945678901", ["PA-ACCOUNT"]],
   ["khong co", []],
  ])("finds %s", async (q, expected) => {
   expect(codes(await list({ q }))).toEqual(expected);
  });

  it("treats a lone # as no search", async () => {
   expect((await list({ q: "#" })).items).toHaveLength(10);
  });

  it("escapes regex characters, so they are never a pattern", async () => {
   expect(codes(await list({ q: "PA.SHIP" }))).toEqual([]);
   expect(codes(await list({ q: "(" }))).toEqual([]);
  });

  it("never finds a sale still being created", async () => {
   expect(codes(await list({ q: "PA-INFLIGHT" }))).toEqual([]);
  });
 });

 it("pages the rows", async () => {
  const first = await list({ pageSize: "3" });
  expect(codes(first)).toEqual(["PA-PENDING", "PA-CONFIRM", "PA-PROCESS"]);
  expect(first.pagination).toEqual({ page: 1, pageSize: 3, total: 10, totalPages: 4 });
  expect(codes(await list({ pageSize: "3", page: "4" }))).toEqual(["PA-WALKIN"]);
 });

 it("handles an empty database", async () => {
  orders = [];
  const data = await list();
  expect(data.items).toEqual([]);
  expect(data.counts).toEqual({ all: 0, processing: 0, shipping: 0, completed: 0, cancelled: 0 });
 });

 it.each([["tab", "archived"], ["status", "delivered"], ["page", "0"]])("rejects %s=%s with 400", async (name, value) => {
  const { body } = await admin.send("GET", `/api/v1/admin/orders?${name}=${value}`).expect(400);
  expect(body.error.code).toBe("VALIDATION_ERROR");
 });
});

describe("GET /api/v1/admin/orders/export", () => {
 const exportOrders = async (query = {}) => (await admin.send("GET", `/api/v1/admin/orders/export?${new URLSearchParams(query)}`).expect(200)).body.data;

 beforeEach(() => {
  vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
 });

 it("returns every visible order across pages with the export columns, and audits it", async () => {
  orders.find((item) => item.orderCode === "PA-DONE").promotionCode = "PET50K";
  Object.assign(orders.find((item) => item.orderCode === "PA-DONE"), { subtotal: 150000, discount: 50000, paymentStatus: "paid" });
  const data = await exportOrders({ pageSize: "1" });
  expect(data.items.map((item) => item.orderCode)).toEqual(["PA-PENDING", "PA-CONFIRM", "PA-PROCESS", "PA-SHIP", "PA-DONE", "PA-OLD", "PA-CANCEL", "PA-GUEST", "PA-ACCOUNT", "PA-WALKIN"]);
  expect(data).toMatchObject({ total: 10, truncated: false });
  expect(data.items.find((item) => item.orderCode === "PA-DONE")).toEqual({
   orderCode: "PA-DONE", customerName: "Trần Bảo Ngọc", phone: "0912 456 789", createdAt: "2026-10-16T03:00:00.000Z",
   total: 100000, paymentMethod: "ONLINE", status: "completed",
   channel: "online", paymentStatus: "paid", subtotal: 150000, discount: 50000, promotionCode: "PET50K",
  });
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({ action: "order.export", after: { tab: "all", rows: 10 }, result: "success" });
 });

 it("resolves names like the list: guest, account, and walk-in", async () => {
  const data = await exportOrders();
  const name = (code) => data.items.find((item) => item.orderCode === code).customerName;
  expect([name("PA-GUEST"), name("PA-ACCOUNT"), name("PA-WALKIN")]).toEqual(["Vũ Đức Long", "Đỗ Khánh Linh", "Khách lẻ"]);
  expect(data.items.find((item) => item.orderCode === "PA-WALKIN").channel).toBe("offline");
 });

 it.each([
  [{ tab: "processing" }, ["PA-PENDING", "PA-CONFIRM", "PA-PROCESS"]],
  [{ status: "cancelled" }, ["PA-CANCEL"]],
  [{ q: "#pa-guest" }, ["PA-GUEST"]],
  [{ q: "khanh linh" }, ["PA-ACCOUNT"]],
 ])("applies %j like the list", async (query, expected) => {
  expect((await exportOrders(query)).items.map((item) => item.orderCode)).toEqual(expected);
 });

 it("refuses a guest, a Customer, and Staff", async () => {
  admin.session.role = null;
  await admin.send("GET", "/api/v1/admin/orders/export").expect(401);
  for (const role of ["customer", "staff"]) {
   admin.session.role = role;
   await admin.send("GET", "/api/v1/admin/orders/export").expect(403);
  }
 });
});
