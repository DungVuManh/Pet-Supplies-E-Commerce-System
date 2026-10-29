import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { loadEnvironment } from "../config/env.js";

/**
 * Idempotent migrations of existing documents for the Admin backend, run in
 * order. Each `run()` resolves to the number of documents it changed, so a
 * second run reports zero everywhere. Later phases append their steps here.
 */
export const migrations = [];

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
