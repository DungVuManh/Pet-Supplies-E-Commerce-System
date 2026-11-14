import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Product } from "../src/models/product.model.js";
import { Review } from "../src/models/review.model.js";
import { User } from "../src/models/user.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const URL = "/api/v1/admin/reviews";
const id = (suffix) => new mongoose.Types.ObjectId(`f0000000000000000000${suffix}`);

const bowl = { _id: id("0101"), name: "Bát ăn inox", variants: [{ sku: "SP-BOWL-S" }, { sku: "SP-BOWL-L" }], images: ["https://res.cloudinary.com/demo/bowl.jpg"] };
const leash = { _id: id("0102"), name: "Dây dắt chó", variants: [], images: [] };
const linh = { _id: id("0201"), fullName: "Đỗ Khánh Linh", avatarUrl: "https://example.test/linh.jpg" };
const minh = { _id: id("0202"), fullName: "Trần Minh", avatarUrl: "data:image/png;base64,AAAA" };

const at = (day) => new Date(`2026-11-${day}T03:00:00Z`);
const seed = () => [
 { _id: id("0001"), productId: bowl._id, userId: linh._id, rating: 5, comment: "Bát rất đẹp", images: ["https://res.cloudinary.com/demo/r1.jpg"], status: "published", createdAt: at("10"), updatedAt: at("10") },
 { _id: id("0002"), productId: bowl._id, userId: minh._id, rating: 1, comment: "Đồ tệ hại", images: [], status: "published", createdAt: at("11"), updatedAt: at("12") },
 { _id: id("0003"), productId: leash._id, userId: linh._id, rating: 4, comment: "", images: [], status: "published", createdAt: at("12"), updatedAt: at("12") },
 // The product was deleted after the review.
 { _id: id("0004"), productId: id("0199"), userId: minh._id, rating: 3, comment: "Tạm được", images: [], status: "published", createdAt: at("09"), updatedAt: at("09") },
];

let reviews;
let products;
let users;
let admin;

const get = (document, path) => path.split(".").reduce((value, key) => value?.[key], document);

// A small in-memory stand-in for the MongoDB filter semantics the screen relies on.
function matches(document, filter) {
 return Object.entries(filter).every(([key, condition]) => {
  if (key === "$and") return condition.every((part) => matches(document, part));
  if (key === "$or") return condition.some((part) => matches(document, part));
  const value = get(document, key);
  if (condition instanceof RegExp) return condition.test(value ?? "");
  if (condition?.$in) return condition.$in.some((item) => String(item) === String(value));
  return String(value) === String(condition);
 });
}

function fakeFind(rows, filter) {
 const state = { skip: 0, limit: Infinity };
 const chain = {
  sort: () => chain, select: () => chain,
  skip: (value) => { state.skip = value; return chain; },
  limit: (value) => { state.limit = value; return chain; },
  lean: async () => rows().filter((item) => matches(item, filter)).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(state.skip, state.skip + state.limit),
 };
 return chain;
}

const findOne = (rows, wanted) => {
 const chain = { select: () => chain, lean: async () => rows().find((row) => String(row._id) === String(wanted)) ?? null };
 return chain;
};

const list = async (query = {}) => (await admin.send("GET", `${URL}?${new URLSearchParams({ pageSize: "100", ...query })}`).expect(200)).body.data;
const ids = (data) => data.items.map((row) => row.id);

beforeEach(() => {
 reviews = seed();
 products = [bowl, leash];
 users = [linh, minh];
 admin = createAdminTestApp();
 vi.spyOn(Review, "find").mockImplementation((filter) => fakeFind(() => reviews, filter));
 vi.spyOn(Review, "countDocuments").mockImplementation(async (filter) => reviews.filter((item) => matches(item, filter)).length);
 vi.spyOn(Review, "findById").mockImplementation((wanted) => findOne(() => reviews, wanted));
 vi.spyOn(Review, "deleteOne").mockImplementation(async (filter) => {
  const before = reviews.length;
  reviews = reviews.filter((item) => String(item._id) !== String(filter._id));
  return { deletedCount: before - reviews.length };
 });
 vi.spyOn(Product, "find").mockImplementation((filter) => fakeFind(() => products, filter));
 vi.spyOn(Product, "findById").mockImplementation((wanted) => findOne(() => products, wanted));
 vi.spyOn(Product, "updateOne").mockImplementation(async () => ({ matchedCount: 1 }));
 vi.spyOn(User, "find").mockImplementation((filter) => fakeFind(() => users, filter));
 vi.spyOn(User, "findById").mockImplementation((wanted) => findOne(() => users, wanted));
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/reviews", () => {
 it("lists every review newest first with its customer and product", async () => {
  const data = await list();
  expect(ids(data)).toEqual([id("0003"), id("0002"), id("0001"), id("0004")].map(String));
  expect(data.pagination).toMatchObject({ page: 1, total: 4 });
  expect(data.items.find((row) => row.id === String(id("0001")))).toEqual({
   id: String(id("0001")), rating: 5, comment: "Bát rất đẹp", images: ["https://res.cloudinary.com/demo/r1.jpg"],
   createdAt: at("10").toISOString(), edited: false,
   customer: { name: "Đỗ Khánh Linh", avatarUrl: "https://example.test/linh.jpg" },
   product: { sku: "SP-BOWL-S", name: "Bát ăn inox", image: "https://res.cloudinary.com/demo/bowl.jpg" },
  });
 });

 it("marks edits, hides base64 avatars, and handles a deleted product", async () => {
  const data = await list();
  const edited = data.items.find((row) => row.id === String(id("0002")));
  expect(edited.edited).toBe(true);
  expect(edited.customer).toEqual({ name: "Trần Minh", avatarUrl: null });
  expect(data.items.find((row) => row.id === String(id("0004"))).product).toBeNull();
  expect(data.items.find((row) => row.id === String(id("0003"))).product).toEqual({ sku: null, name: "Dây dắt chó", image: null });
 });

 it("defaults to ten rows a page", async () => {
  const { body } = await admin.send("GET", URL).expect(200);
  expect(body.data.pagination.pageSize).toBe(10);
 });

 it.each([
  ["comment text without accents", { q: "te hai" }, ["0002"]],
  ["product name", { q: "day dat" }, ["0003"]],
  ["customer name", { q: "linh" }, ["0003", "0001"]],
  ["star rating", { rating: "1" }, ["0002"]],
  ["search and stars together", { q: "linh", rating: "5" }, ["0001"]],
  ["text with no searchable word", { q: "(" }, ["0003", "0002", "0001", "0004"]],
 ])("filters by %s", async (_label, query, expected) => {
  expect(ids(await list(query))).toEqual(expected.map((suffix) => String(id(suffix))));
 });

 it("rejects an unknown star filter", async () => {
  const { body } = await admin.send("GET", `${URL}?rating=6`).expect(400);
  expect(body.error.code).toBe("VALIDATION_ERROR");
 });
});

describe("DELETE /api/v1/admin/reviews/:id", () => {
 it("deletes the review, recalculates the product rating, and audits the whole review", async () => {
  const { body } = await admin.send("DELETE", `${URL}/${id("0002")}`).expect(200);
  expect(body.data).toEqual({ id: String(id("0002")) });
  expect(reviews.map((row) => row._id)).not.toContainEqual(id("0002"));
  // Only the five-star review is left on the bowl.
  expect(Product.updateOne).toHaveBeenCalledWith({ _id: bowl._id }, { $set: { ratingAvg: 5, ratingCount: 1 } });
  expect(AuditLog.create).toHaveBeenCalledTimes(1);
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   action: "review.delete",
   target: { collectionName: "reviews", id: String(id("0002")) },
   before: { productSku: "SP-BOWL-S", productName: "Bát ăn inox", customerName: "Trần Minh", rating: 1, comment: "Đồ tệ hại" },
   summary: "Xóa đánh giá 1 sao của Trần Minh về Bát ăn inox",
  });
 });

 it("sets the rating to zero when the last review goes", async () => {
  await admin.send("DELETE", `${URL}/${id("0003")}`).expect(200);
  expect(Product.updateOne).toHaveBeenCalledWith({ _id: leash._id }, { $set: { ratingAvg: 0, ratingCount: 0 } });
 });

 it.each([["a missing review", id("0999")], ["an invalid id", "not-an-id"]])("returns 404 for %s", async (_label, wanted) => {
  const { body } = await admin.send("DELETE", `${URL}/${wanted}`).expect(404);
  expect(body.error.code).toBe("REVIEW_NOT_FOUND");
  expect(Review.deleteOne).not.toHaveBeenCalled();
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("returns 404 when the customer deleted it first", async () => {
  Review.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });
  await admin.send("DELETE", `${URL}/${id("0001")}`).expect(404);
  expect(Product.updateOne).not.toHaveBeenCalled();
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("refuses a delete without the CSRF pair", async () => {
  await admin.send("DELETE", `${URL}/${id("0001")}`, undefined, { csrf: false }).expect(403);
  expect(Review.deleteOne).not.toHaveBeenCalled();
 });
});

describe("access", () => {
 it.each([["GET", URL], ["DELETE", `${URL}/${id("0001")}`]])("refuses %s %s to a guest, a Customer, and Staff", async (method, path) => {
  admin.session.role = null;
  await admin.send(method, path).expect(401);
  for (const role of ["customer", "staff"]) {
   admin.session.role = role;
   await admin.send(method, path).expect(403);
  }
  expect(Review.deleteOne).not.toHaveBeenCalled();
 });
});
