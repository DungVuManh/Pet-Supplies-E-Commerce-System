import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { loadEnvironment } from "../config/env.js";

class SeedAdminError extends Error {}

/**
 * Admin sample data on top of `npm run seed`, applied in order. Each step is
 * idempotent and resolves to the number of records it ensured. Later phases
 * append their steps here. Users are never created.
 */
export const seedSteps = [];

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
