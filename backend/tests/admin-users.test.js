import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { User } from "../src/models/user.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const account = (suffix, day, fields) => ({
 _id: new mongoose.Types.ObjectId(`b0000000000000000000${suffix}`),
 firebaseUid: `uid-${suffix}`,
 createdAt: new Date(`2026-09-${day}T03:00:00Z`),
 role: "customer",
 status: "active",
 ...fields,
});

const adminAccount = account("00aa", "30", { role: "admin", fullName: "Quản trị viên", email: "boss@petly.vn", phone: "0900000000" });
const linh = account("3f2a", "01", { fullName: "Đỗ Khánh Linh", email: "khanhlinh.do@gmail.com", phone: "0945678901" });
const huy = account("1b2c", "02", { fullName: "Lê Quang Huy", email: "quanghuy.le@gmail.com", phone: "0923456780", status: "locked", lockReason: "Gian lận", adminNote: "Nội bộ" });
// A document from before `status` existed.
const anh = account("4d5e", "03", { fullName: "Nguyễn Minh Anh", email: "minhanh@gmail.com", phone: "0901234567", status: undefined });
const long = account("7c8d", "04", { role: "staff", fullName: "Vũ Đức Long", email: "duclong@petly.vn", phone: "0987654321" });
const khoa = account("9e0f", "05", { role: "staff", fullName: "Đặng Văn Khoa", email: "vankhoa@petly.vn", phone: "0919220331", status: "locked" });
const accounts = [adminAccount, linh, huy, anh, long, khoa];

// Evaluates the aggregation operators the account code uses.
function evaluate(expression, document) {
 if (typeof expression !== "object") {
  return typeof expression === "string" && expression.startsWith("$") ? document[expression.slice(1)] : expression;
 }
 const [[operator, args]] = Object.entries(expression);
 if (operator === "$concat") return args.map((arg) => evaluate(arg, document)).join("");
 if (operator === "$cond") return evaluate(args[evaluate(args[0], document) ? 1 : 2], document);
 if (operator === "$eq") return evaluate(args[0], document) === evaluate(args[1], document);
 if (operator === "$toUpper") return evaluate(args, document).toUpperCase();
 if (operator === "$toString") return String(evaluate(args, document));
 if (operator === "$substrCP") return evaluate(args[0], document).substr(args[1], args[2]);
 throw new Error(`Unexpected operator ${operator}`);
}

// A small in-memory stand-in for the MongoDB filter semantics the list relies on.
function matches(document, filter) {
 return Object.entries(filter).every(([key, condition]) => {
  if (key === "$and") return condition.every((part) => matches(document, part));
  if (key === "$or") return condition.some((part) => matches(document, part));
  if (key === "$expr") return condition.$regexMatch.regex.test(evaluate(condition.$regexMatch.input, document));
  if (condition instanceof RegExp) return condition.test(document[key] ?? "");
  if (typeof condition !== "object") return document[key] === condition;
  return condition.$in ? condition.$in.includes(document[key]) : document[key] !== condition.$ne;
 });
}

function fakeFind(filter) {
 const query = { skip: 0, limit: Infinity, fields: [] };
 const chain = {
  sort: () => chain,
  skip: (value) => { query.skip = value; return chain; },
  limit: (value) => { query.limit = value; return chain; },
  select: (value) => { query.fields = value.split(" "); return chain; },
  lean: async () => accounts
   .filter((document) => matches(document, filter))
   .sort((a, b) => b.createdAt - a.createdAt)
   .slice(query.skip, query.skip + query.limit)
   .map((document) => Object.fromEntries(["_id", ...query.fields].map((field) => [field, document[field]]))),
 };
 return chain;
}

let admin;
const list = async (query = {}) => (await admin.send("GET", `/api/v1/admin/users?${new URLSearchParams(query)}`).expect(200)).body.data;
const names = (data) => data.items.map((row) => row.fullName);

beforeEach(() => {
 admin = createAdminTestApp();
 vi.spyOn(User, "find").mockImplementation(fakeFind);
 vi.spyOn(User, "countDocuments").mockImplementation(async (filter) => accounts.filter((document) => matches(document, filter)).length);
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/users", () => {
 it("lists Customer and Staff accounts newest first, never Admin", async () => {
  const data = await list();
  expect(names(data)).toEqual(["Đặng Văn Khoa", "Vũ Đức Long", "Nguyễn Minh Anh", "Lê Quang Huy", "Đỗ Khánh Linh"]);
  expect(data.pagination).toEqual({ page: 1, pageSize: 6, total: 5, totalPages: 1 });
  expect(data.counts).toEqual({ all: 5, customer: 3, staff: 2 });
 });

 it("returns only the row fields, with the derived code", async () => {
  const { items } = await list();
  expect(items.find((row) => row.fullName === "Lê Quang Huy")).toEqual({
   id: String(huy._id), code: "KH001B2C", role: "customer", fullName: "Lê Quang Huy",
   email: "quanghuy.le@gmail.com", phone: "0923456780", joinedAt: "2026-09-02T03:00:00.000Z", status: "locked",
  });
  expect(items.find((row) => row.fullName === "Vũ Đức Long").code).toBe("NV007C8D");
  expect(items.find((row) => row.fullName === "Nguyễn Minh Anh").status).toBe("active");
 });

 it("filters by tab and role, keeping the tab counts", async () => {
  expect(names(await list({ tab: "staff" }))).toEqual(["Đặng Văn Khoa", "Vũ Đức Long"]);
  expect(names(await list({ role: "customer" }))).toEqual(["Nguyễn Minh Anh", "Lê Quang Huy", "Đỗ Khánh Linh"]);
  const conflicting = await list({ tab: "customer", role: "staff" });
  expect(conflicting.items).toEqual([]);
  expect(conflicting.pagination.total).toBe(0);
  expect(conflicting.counts).toEqual({ all: 5, customer: 3, staff: 2 });
 });

 it("filters by status, treating a missing status as active", async () => {
  expect(names(await list({ status: "active" }))).toEqual(["Vũ Đức Long", "Nguyễn Minh Anh", "Đỗ Khánh Linh"]);
  expect(names(await list({ status: "locked" }))).toEqual(["Đặng Văn Khoa", "Lê Quang Huy"]);
  expect(names(await list({ tab: "staff", status: "locked" }))).toEqual(["Đặng Văn Khoa"]);
 });

 it.each([
  ["do khanh linh", ["Đỗ Khánh Linh"]],
  ["duc", ["Vũ Đức Long"]],
  ["DUC LONG", ["Vũ Đức Long"]],
  ["Đức", ["Vũ Đức Long"]],
  ["quanghuy.le@gmail", ["Lê Quang Huy"]],
  ["0987654321", ["Vũ Đức Long"]],
  ["0987 654 321", ["Vũ Đức Long"]],
  ["KH001B2C", ["Lê Quang Huy"]],
  ["kh001b2c", ["Lê Quang Huy"]],
  ["001b2c", ["Lê Quang Huy"]],
  ["NV", ["Đặng Văn Khoa", "Vũ Đức Long"]],
  ["KH001B2C huy", ["Lê Quang Huy"]],
  ["NV001B2C", []],
  ["quản trị", []],
  // A literal dot: as a regex wildcard it would match "Nguyễn Minh".
  ["n.m", []],
 ])("searches %s across name, email, phone, and code", async (q, expected) => {
  expect(names(await list({ q }))).toEqual(expected);
 });

 it("combines search with the other filters", async () => {
  expect(names(await list({ q: "khoa", status: "active" }))).toEqual([]);
  expect(names(await list({ q: "gmail", tab: "customer", status: "locked" }))).toEqual(["Lê Quang Huy"]);
 });

 it("pages the results", async () => {
  const first = await list({ pageSize: "2" });
  expect(names(first)).toEqual(["Đặng Văn Khoa", "Vũ Đức Long"]);
  expect(first.pagination).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
  const last = await list({ page: "3", pageSize: "2" });
  expect(names(last)).toEqual(["Đỗ Khánh Linh"]);
  expect(last.pagination.page).toBe(3);
  expect((await list({ page: "4", pageSize: "2" })).items).toEqual([]);
 });

 it.each([
  ["tab", "admin"], ["role", "admin"], ["status", "banned"], ["page", "0"], ["pageSize", "101"], ["q", "x".repeat(101)],
 ])("rejects %s=%s with 400", async (name, value) => {
  const response = await admin.send("GET", `/api/v1/admin/users?${new URLSearchParams({ [name]: value })}`).expect(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
  expect(User.find).not.toHaveBeenCalled();
 });

 it("returns an empty page for an empty database", async () => {
  User.find.mockImplementation(() => fakeFind({ role: "none" }));
  User.countDocuments.mockResolvedValue(0);
  const data = await list();
  expect(data).toEqual({ items: [], pagination: { page: 1, pageSize: 6, total: 0, totalPages: 0 }, counts: { all: 0, customer: 0, staff: 0 } });
 });
});
