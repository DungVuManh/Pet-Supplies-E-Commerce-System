import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MasterData } from "../src/models/master-data.model.js";
import { Product } from "../src/models/product.model.js";
import { seedSteps } from "../src/scripts/seed-admin.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const row = (kind, code, name, fields = {}) => ({ kind, code, name, description: `Mô tả ${name}`, updatedAt: new Date("2026-10-10T03:00:00Z"), ...fields });

let documents;
let products;
let admin;

function matches(document, filter) {
 return Object.entries(filter).every(([key, condition]) => {
  if (key === "$and") return condition.every((part) => matches(document, part));
  if (key === "$or") return condition.some((part) => matches(document, part));
  if (condition instanceof RegExp) return condition.test(document[key] ?? "");
  if (condition?.$in) return condition.$in.includes(document[key]);
  if (condition && typeof condition === "object" && "$ne" in condition) return document[key] !== condition.$ne;
  return document[key] === condition;
 });
}

function fakeFind(filter) {
 const state = { skip: 0, limit: Infinity };
 const chain = {
  sort: () => chain, select: () => chain,
  skip: (value) => { state.skip = value; return chain; },
  limit: (value) => { state.limit = value; return chain; },
  lean: async () => documents.filter((item) => matches(item, filter)).slice(state.skip, state.skip + state.limit),
 };
 return chain;
}

const groupBy = (rows, [{ $match }, { $group }]) => {
 const field = $group._id.slice(1);
 const groups = new Map();
 for (const item of rows.filter((value) => matches(value, $match))) groups.set(item[field], (groups.get(item[field]) ?? 0) + 1);
 return [...groups].map(([_id, count]) => ({ _id, count }));
};

const list = async (query = {}) => (await admin.send("GET", `/api/v1/admin/master-data?${new URLSearchParams(query)}`).expect(200)).body.data;

beforeEach(() => {
 documents = [
  row("petType", "PET-DOG", "Chó"),
  row("petType", "PET-CAT", "Mèo"),
  row("petType", "PET-FISH", "Cá cảnh", { isActive: false }),
  row("breed", "BR-001", "Poodle", { petTypeCode: "PET-DOG" }),
  row("breed", "BR-002", "Corgi", { petTypeCode: "PET-DOG" }),
  row("breed", "BR-003", "Mèo ta", { petTypeCode: "PET-CAT" }),
  row("brand", "BRD-KONG", "KONG"),
  row("brand", "BRD-OLD", "Thương hiệu cũ", { isActive: false }),
  row("unit", "UNIT-TUI", "Túi"),
  row("unit", "UNIT-OFF", "Thùng", { isActive: false }),
  row("shippingMethod", "SHIP-STD", "Tiêu chuẩn", { fee: 30000 }),
 ];
 products = [{ brand: "KONG", unit: "Túi" }, { brand: "KONG" }, { brand: "Whiskas", unit: "Túi" }];
 admin = createAdminTestApp();
 vi.spyOn(MasterData, "find").mockImplementation(fakeFind);
 vi.spyOn(MasterData, "countDocuments").mockImplementation(async (filter) => documents.filter((item) => matches(item, filter)).length);
 vi.spyOn(MasterData, "aggregate").mockImplementation(async (pipeline) => groupBy(documents, pipeline));
 vi.spyOn(Product, "aggregate").mockImplementation(async (pipeline) => groupBy(products, pipeline));
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/master-data", () => {
 it("lists one kind, with the counts of every kind", async () => {
  const data = await list();
  expect(data.items.map((item) => item.code)).toEqual(["PET-DOG", "PET-CAT", "PET-FISH"]);
  expect(data.counts).toEqual({ petType: 3, breed: 3, brand: 2, unit: 2, shippingMethod: 1 });
  expect(data.items[0]).toEqual({
   code: "PET-DOG", name: "Chó", description: "Mô tả Chó", metric: 2, status: "active", updatedAt: "2026-10-10T03:00:00.000Z",
  });
  expect(data.items[2].status).toBe("inactive");
 });

 it.each([
  ["petType", "PET-CAT", 1],
  ["petType", "PET-FISH", 0],
  ["breed", "BR-001", "Chó"],
  ["brand", "BRD-KONG", 2],
  ["brand", "BRD-OLD", 0],
  ["unit", "UNIT-TUI", 2],
  ["unit", "UNIT-OFF", 0],
  ["shippingMethod", "SHIP-STD", 30000],
 ])("computes the %s metric of %s", async (kind, code, metric) => {
  const { items } = await list({ kind });
  expect(items.find((item) => item.code === code).metric).toBe(metric);
 });

 it("shows a breed whose pet type is missing without inventing one", async () => {
  documents.push(row("breed", "BR-009", "Lạc", { petTypeCode: "PET-NONE" }));
  const { items } = await list({ kind: "breed" });
  expect(items.find((item) => item.code === "BR-009").metric).toBe("—");
 });

 it("filters by status and keeps the counts", async () => {
  const data = await list({ status: "inactive" });
  expect(data.items.map((item) => item.code)).toEqual(["PET-FISH"]);
  expect(data.counts.petType).toBe(3);
  expect((await list({ status: "active" })).items.map((item) => item.code)).toEqual(["PET-DOG", "PET-CAT"]);
 });

 it("searches code, name, and description without accents", async () => {
  expect((await list({ q: "cho" })).items.map((item) => item.code)).toEqual(["PET-DOG"]);
  expect((await list({ q: "pet-cat" })).items.map((item) => item.code)).toEqual(["PET-CAT"]);
  expect((await list({ kind: "breed", q: "meo ta" })).items.map((item) => item.code)).toEqual(["BR-003"]);
  expect((await list({ q: "khong co" })).items).toEqual([]);
 });

 it("treats a missing isActive as active", async () => {
  documents = [row("unit", "UNIT-A", "A", { isActive: undefined })];
  expect((await list({ kind: "unit", status: "active" })).items[0].status).toBe("active");
 });

 it("pages the results", async () => {
  const data = await list({ pageSize: "2" });
  expect(data.items).toHaveLength(2);
  expect(data.pagination).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
 });

 it("handles an empty collection", async () => {
  documents = [];
  const data = await list();
  expect(data.items).toEqual([]);
  expect(data.counts).toEqual({ petType: 0, breed: 0, brand: 0, unit: 0, shippingMethod: 0 });
 });

 it.each([["kind", "colour"], ["status", "archived"], ["page", "0"]])("rejects %s=%s with 400", async (name, value) => {
  const { body } = await admin.send("GET", `/api/v1/admin/master-data?${name}=${value}`).expect(400);
  expect(body.error.code).toBe("VALIDATION_ERROR");
 });
});

describe("GET /api/v1/admin/master-data/options", () => {
 it("returns only active pet types, brands, and units", async () => {
  const { body } = await admin.send("GET", "/api/v1/admin/master-data/options").expect(200);
  expect(body.data).toEqual({
   petTypes: [{ code: "PET-DOG", name: "Chó" }, { code: "PET-CAT", name: "Mèo" }],
   brands: [{ code: "BRD-KONG", name: "KONG" }],
   units: [{ code: "UNIT-TUI", name: "Túi" }],
  });
 });
});

describe("the masterData seed", () => {
 const step = seedSteps.find((item) => item.name === "masterData");

 beforeEach(() => {
  documents = [];
  vi.spyOn(Product, "distinct").mockResolvedValue(["KONG", "Thương hiệu Mới", "", null]);
  vi.spyOn(MasterData, "updateOne").mockImplementation(async ({ kind, code }, { $setOnInsert }) => {
   if (!documents.some((item) => item.kind === kind && item.code === code)) documents.push({ kind, code, ...$setOnInsert });
   return { acknowledged: true };
  });
 });

 it("creates the designed rows, with brands from the products", async () => {
  await step.run();
  const count = (kind) => documents.filter((item) => item.kind === kind).length;
  expect([count("petType"), count("breed"), count("unit"), count("shippingMethod"), count("brand")]).toEqual([5, 24, 6, 3, 2]);
  expect(documents.find((item) => item.name === "KONG")).toMatchObject({ code: "BRD-KONG", description: "Mỹ · Đồ chơi cao su bền" });
  expect(documents.find((item) => item.name === "Thương hiệu Mới")).toMatchObject({ code: "BRD-THUONG-HIEU-MOI", description: "" });
  expect(documents.find((item) => item.name === "Poodle")).toMatchObject({ code: "BR-001", petTypeCode: "PET-DOG" });
  expect(documents.find((item) => item.code === "PET-FISH").isActive).toBe(false);
  expect(documents.find((item) => item.code === "SHIP-STD").fee).toBe(30000);
 });

 it("adds nothing on a second run, and never overwrites an existing row", async () => {
  const first = await step.run();
  const created = documents.length;
  expect(await step.run()).toBe(first);
  expect(documents).toHaveLength(created);
  expect(Object.keys(MasterData.updateOne.mock.calls[0][1])).toEqual(["$setOnInsert"]);
 });
});
