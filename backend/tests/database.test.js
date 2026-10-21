import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { connectDatabase, createModelIndexes, disconnectDatabase } from "../src/config/database.js";
import * as models from "../src/models/index.js";
afterEach(() => vi.restoreAllMocks());
describe("database lifecycle", () => {
 it("connects with bounded timeouts and no automatic indexing", async () => {
  const connect = vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
  await connectDatabase("mongodb://127.0.0.1:27017/pet_supplies");
  expect(connect).toHaveBeenCalledWith(
   "mongodb://127.0.0.1:27017/pet_supplies",
   expect.objectContaining({
    serverSelectionTimeoutMS: 5000,
    autoIndex: false,
    bufferCommands: false,
   }),
  );
 });
 it("reports connection failures without leaking driver details", async () => {
  vi.spyOn(mongoose, "connect").mockRejectedValue(new Error("secret URI"));
  await expect(connectDatabase("mongodb://localhost/db")).rejects.toThrow(
   "Unable to connect to MongoDB; check configuration and availability",
  );
 });
 it("closes Mongoose connections", async () => {
  const disconnect = vi.spyOn(mongoose, "disconnect").mockResolvedValue();
  await disconnectDatabase();
  expect(disconnect).toHaveBeenCalledOnce();
 });
 it("explicitly creates indexes for every registered model", async () => {
  const spies = Object.values(models).map((model) => vi.spyOn(model, "createIndexes").mockResolvedValue([]));
  await createModelIndexes();
  for (const spy of spies) expect(spy).toHaveBeenCalledOnce();
 });
 it("propagates index creation failures so startup cannot ignore missing constraints", async () => {
  for (const model of Object.values(models)) vi.spyOn(model, "createIndexes").mockResolvedValue([]);
  vi.spyOn(models.User, "createIndexes").mockRejectedValue(new Error("index failure"));
  await expect(createModelIndexes()).rejects.toThrow("index failure");
 });
});
