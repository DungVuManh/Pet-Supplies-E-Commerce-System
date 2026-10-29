import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as database from "../src/config/database.js";
import * as environment from "../src/config/env.js";
import { migrateAdmin, migrateAdminData } from "../src/scripts/migrate-admin.js";
import { seedAdmin, seedAdminData } from "../src/scripts/seed-admin.js";

let nodeEnv;
beforeEach(() => {
 nodeEnv = "development";
 vi.spyOn(console, "info").mockImplementation(() => {});
 vi.spyOn(environment, "loadEnvironment").mockImplementation(() => ({ NODE_ENV: nodeEnv, MONGODB_URI: "mongodb://localhost/admin-test" }));
 vi.spyOn(database, "connectDatabase").mockResolvedValue();
 vi.spyOn(database, "disconnectDatabase").mockResolvedValue();
});
afterEach(() => vi.restoreAllMocks());

describe("Admin migration and seed scripts", () => {
 it("run their steps in order and report each count", async () => {
  const order = [];
  const steps = [{ name: "a", run: async () => order.push("a") && 2 }, { name: "b", run: async () => order.push("b") && 0 }];
  await expect(migrateAdminData(steps)).resolves.toEqual({ a: 2, b: 0 });
  await expect(seedAdminData(steps)).resolves.toEqual({ a: 2, b: 0 });
  expect(order).toEqual(["a", "b", "a", "b"]);
 });

 it("connect, run, and always disconnect", async () => {
  await expect(migrateAdmin()).resolves.toEqual({});
  await expect(seedAdmin()).resolves.toEqual({});
  expect(database.connectDatabase).toHaveBeenCalledWith("mongodb://localhost/admin-test");
  expect(database.disconnectDatabase).toHaveBeenCalledTimes(2);
 });

 it("fail when MongoDB is unreachable", async () => {
  database.connectDatabase.mockRejectedValue(new Error("Unable to connect to MongoDB; check configuration and availability"));
  await expect(migrateAdmin()).rejects.toThrow("Unable to connect to MongoDB");
  await expect(seedAdmin()).rejects.toThrow("Unable to connect to MongoDB");
  expect(database.disconnectDatabase).toHaveBeenCalledTimes(2);
 });

 it("refuse to seed in production, while the migration still runs", async () => {
  nodeEnv = "production";
  await expect(seedAdmin()).rejects.toThrow("không chạy trong production");
  expect(database.connectDatabase).not.toHaveBeenCalled();
  await expect(migrateAdmin()).resolves.toEqual({});
 });
});
