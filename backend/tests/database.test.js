import mongoose from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
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
});
