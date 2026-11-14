import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as database from "../src/config/database.js";
import * as environment from "../src/config/env.js";
import { Category } from "../src/models/category.model.js";
import { MasterData } from "../src/models/master-data.model.js";
import { Product } from "../src/models/product.model.js";
import { Promotion } from "../src/models/promotion.model.js";
import { User } from "../src/models/user.model.js";
import { migrateAdmin, migrateAdminData, migrations } from "../src/scripts/migrate-admin.js";
import { seedAdmin, seedAdminData, seedSteps } from "../src/scripts/seed-admin.js";

let nodeEnv;
beforeEach(() => {
 nodeEnv = "development";
 vi.spyOn(console, "info").mockImplementation(() => {});
 vi.spyOn(environment, "loadEnvironment").mockImplementation(() => ({ NODE_ENV: nodeEnv, MONGODB_URI: "mongodb://localhost/admin-test" }));
 vi.spyOn(database, "connectDatabase").mockResolvedValue();
 vi.spyOn(database, "disconnectDatabase").mockResolvedValue();
 vi.spyOn(User, "updateMany").mockResolvedValue({ modifiedCount: 0 });
 vi.spyOn(Category, "find").mockImplementation(() => ({ select: () => ({ sort: () => ({ lean: async () => [] }) }) }));
 vi.spyOn(Product, "distinct").mockResolvedValue([]);
 vi.spyOn(MasterData, "updateOne").mockResolvedValue({});
 vi.spyOn(Promotion, "updateMany").mockResolvedValue({ modifiedCount: 0 });
 vi.spyOn(Promotion, "updateOne").mockResolvedValue({});
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
  await expect(migrateAdmin()).resolves.toEqual({ "users.status": 0, "categories.tree": 0, "promotions.usage": 0 });
  await expect(seedAdmin()).resolves.toEqual({ masterData: 38, vouchers: 3 });
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
  await expect(migrateAdmin()).resolves.toEqual({ "users.status": 0, "categories.tree": 0, "promotions.usage": 0 });
 });

 it("backfills a missing user status once, without touching updatedAt", async () => {
  User.updateMany.mockResolvedValueOnce({ modifiedCount: 4 });
  await expect(migrateAdmin()).resolves.toEqual({ "users.status": 4, "categories.tree": 0, "promotions.usage": 0 });
  expect(User.updateMany).toHaveBeenCalledWith({ status: { $exists: false } }, { $set: { status: "active" } }, { timestamps: false });
  await expect(migrateAdmin()).resolves.toEqual({ "users.status": 0, "categories.tree": 0, "promotions.usage": 0 });
 });

 it("backfills a missing voucher count once, without touching updatedAt", async () => {
  Promotion.updateMany.mockResolvedValueOnce({ modifiedCount: 4 });
  await expect(migrateAdminData(migrations.filter((step) => step.name === "promotions.usage"))).resolves.toEqual({ "promotions.usage": 4 });
  expect(Promotion.updateMany).toHaveBeenCalledWith({ usedCount: { $exists: false } }, { $set: { usedCount: 0 } }, { timestamps: false });
 });

 it("inserts sample vouchers without overwriting an existing one", async () => {
  await seedAdminData(seedSteps.filter((step) => step.name === "vouchers"));
  expect(Promotion.updateOne).toHaveBeenCalledTimes(3);
  for (const [filter, update, options] of Promotion.updateOne.mock.calls) {
   expect(filter.code).not.toMatch(/^SEED-/);
   expect(Object.keys(update)).toEqual(["$setOnInsert"]);
   expect(update.$setOnInsert).toMatchObject({ isPublic: true, usedCount: 0 });
   expect(options).toEqual({ upsert: true });
  }
 });
});
