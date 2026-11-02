import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { loadEnvironment } from "../config/env.js";
import { Category } from "../models/category.model.js";
import { User } from "../models/user.model.js";

/**
 * Idempotent migrations of existing documents for the Admin backend, run in
 * order. Each `run()` resolves to the number of documents it changed, so a
 * second run reports zero everywhere. Later phases append their steps here.
 */
export const migrations = [
 {
  name: "users.status",
  // `timestamps: false` leaves `updatedAt` alone, because Admin edits compare it to detect conflicts.
  async run() {
   const result = await User.updateMany({ status: { $exists: false } }, { $set: { status: "active" } }, { timestamps: false });
   return result.modifiedCount;
  },
 },
 {
  name: "categories.tree",
  // Existing categories stay roots. Codes follow creation order and display order follows the name.
  async run() {
   const categories = await Category.find().select("name code parentId displayOrder createdAt").sort({ createdAt: 1, _id: 1 }).lean();
   const updates = new Map();
   const change = (category, field, value) => updates.set(category._id, { ...updates.get(category._id), [field]: value });

   let lastCode = Math.max(0, ...categories.map((category) => Number(category.code?.slice(2)) || 0));
   for (const category of categories) {
    if (!category.code) change(category, "code", `DM${String(++lastCode).padStart(3, "0")}`);
   }

   const siblings = Map.groupBy(categories, (category) => String(category.parentId ?? "root"));
   for (const group of siblings.values()) {
    let lastOrder = Math.max(0, ...group.map((category) => category.displayOrder ?? 0));
    const unordered = group.filter((category) => !category.displayOrder).sort((a, b) => a.name.localeCompare(b.name, "vi"));
    for (const category of unordered) change(category, "displayOrder", ++lastOrder);
   }

   for (const [_id, $set] of updates) await Category.updateOne({ _id }, { $set }, { timestamps: false });
   return updates.size;
  },
 },
];

export async function migrateAdminData(steps = migrations) {
 const changes = {};
 for (const step of steps) {
  changes[step.name] = await step.run();
  console.info(`${step.name}: ${changes[step.name]} bản ghi được cập nhật.`);
 }
 if (steps.length === 0) console.info("Không có bước migration nào.");
 return changes;
}

/** Runs in every environment, production included; it never creates users. */
export async function migrateAdmin() {
 const config = loadEnvironment();
 try {
  await connectDatabase(config.MONGODB_URI);
  return await migrateAdminData();
 } finally {
  await disconnectDatabase();
 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 migrateAdmin().catch((error) => {
  console.error(error?.message?.startsWith("Unable to connect to MongoDB") ? error.message : "Migration thất bại; kiểm tra MongoDB và dữ liệu hiện có.");
  process.exitCode = 1;
 });
}
