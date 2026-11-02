import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { loadEnvironment } from "../config/env.js";
import { Category } from "../models/category.model.js";
import { MasterData } from "../models/master-data.model.js";
import { Product } from "../models/product.model.js";
import { brandOrigins, breedsByPetType, petTypes, shippingMethods, units } from "./data/admin-master-data.js";

class SeedAdminError extends Error {}

/** "Thương hiệu Mới" → "THUONG-HIEU-MOI" */
function codeFrom(name) {
 return name.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "D").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Every master data row: the designed ones, plus one brand per brand name used by a product. */
async function masterDataRows() {
 const brands = (await Product.distinct("brand")).filter(Boolean);
 let breedNumber = 0;
 return [
  ...petTypes.map((row) => ({ kind: "petType", ...row })),
  ...Object.entries(breedsByPetType).flatMap(([petTypeCode, names]) => names.map((name) => {
   breedNumber += 1;
   const petName = petTypes.find((pet) => pet.code === petTypeCode).name.toLowerCase();
   return { kind: "breed", code: `BR-${String(breedNumber).padStart(3, "0")}`, name, petTypeCode, description: `Giống ${petName}` };
  })),
  ...brands.map((name) => ({ kind: "brand", code: `BRD-${codeFrom(name)}`, name, description: brandOrigins[name] ?? "" })),
  ...units.map((row) => ({ kind: "unit", code: `UNIT-${codeFrom(row.name)}`, ...row })),
  ...shippingMethods.map((row) => ({ kind: "shippingMethod", ...row })),
 ];
}

/**
 * Admin sample data on top of `npm run seed`, applied in order. Each step is
 * idempotent and resolves to the number of records it ensured. Later phases
 * append their steps here. Users are never created.
 */
export const seedSteps = [
 {
  name: "categories.tree",
  // Nests existing sample categories, so the tree has two levels. Addressed by slug, because the
  // base seed keeps the name of a category that already exists. Slugs an older seed lacks are skipped.
  async run() {
   const tree = {
    "thuc-an-cho-cho": ["hat-cho-cho", "pate-cho"],
    "thuc-an-cho-meo": ["hat-cho-meo", "pate-meo"],
   };
   let ensured = 0;
   for (const [parentSlug, childSlugs] of Object.entries(tree)) {
    const parent = await Category.findOne({ slug: parentSlug }).select("_id").lean();
    if (!parent) continue;
    const result = await Category.updateMany({ slug: { $in: childSlugs } }, { $set: { parentId: parent._id } });
    ensured += result.matchedCount;
   }
   return ensured;
  },
 },
 {
  name: "masterData",
  // Insert-only, so an existing row is never overwritten.
  async run() {
   const rows = await masterDataRows();
   for (const { kind, code, ...fields } of rows) {
    await MasterData.updateOne({ kind, code }, { $setOnInsert: fields }, { upsert: true, setDefaultsOnInsert: true });
   }
   return rows.length;
  },
 },
];

export async function seedAdminData(steps = seedSteps) {
 const counts = {};
 for (const step of steps) {
  counts[step.name] = await step.run();
  console.info(`${step.name}: đã bảo đảm ${counts[step.name]} bản ghi mẫu.`);
 }
 if (steps.length === 0) console.info("Chưa có dữ liệu mẫu quản trị nào.");
 return counts;
}

export async function seedAdmin() {
 const config = loadEnvironment();
 if (config.NODE_ENV === "production") {
  throw new SeedAdminError("Seed quản trị chỉ dành cho development/test, không chạy trong production.");
 }
 try {
  await connectDatabase(config.MONGODB_URI);
  return await seedAdminData();
 } finally {
  await disconnectDatabase();
 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 seedAdmin().catch((error) => {
  const known = error instanceof SeedAdminError || error?.message?.startsWith("Unable to connect to MongoDB");
  console.error(known ? error.message : "Seed quản trị thất bại; kiểm tra MongoDB và dữ liệu mẫu.");
  process.exitCode = 1;
 });
}
