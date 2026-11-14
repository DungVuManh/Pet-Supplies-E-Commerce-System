import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Address } from "../src/models/address.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Order } from "../src/models/order.model.js";
import { User } from "../src/models/user.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const URL = "/api/v1/admin/users";
const valid = (patch = {}) => ({ fullName: " Trần Thu Hà ", email: " Thuha@PetJoy.vn ", phone: "0912 345 678", adminNote: "Ca sáng", ...patch });

let users;
let admin;
let createError;

const query = (rows) => {
 const chain = { select: () => chain, sort: () => chain, limit: () => chain, populate: () => chain, lean: async () => rows };
 return chain;
};

beforeEach(() => {
 users = [{ _id: new mongoose.Types.ObjectId(), email: "existing@petjoy.vn" }];
 createError = null;
 admin = createAdminTestApp();
 admin.auth.createUser = vi.fn(async () => ({ uid: "new-firebase-uid" }));
 admin.auth.deleteUser = vi.fn(async () => undefined);
 vi.spyOn(User, "exists").mockImplementation(async ({ email }) => (users.some((user) => user.email === email) ? { _id: "x" } : null));
 vi.spyOn(User, "create").mockImplementation(async (values) => {
  if (createError) throw createError;
  const document = { _id: new mongoose.Types.ObjectId(), ...values, status: "active", createdAt: new Date(), updatedAt: new Date() };
  users.push(document);
  return { toObject: () => document };
 });
 vi.spyOn(Address, "findOne").mockImplementation(() => query(null));
 vi.spyOn(Order, "aggregate").mockResolvedValue([]);
 vi.spyOn(Order, "find").mockImplementation(() => query([]));
 vi.spyOn(AuditLog, "find").mockImplementation(() => query([]));
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

const create = (body) => admin.send("POST", URL, body);

describe("POST /api/v1/admin/users", () => {
 it("creates a Staff account in Firebase and MongoDB, and returns its detail", async () => {
  const { body } = await create(valid()).expect(201);
  expect(admin.auth.createUser).toHaveBeenCalledWith({
   email: "thuha@petjoy.vn", password: expect.any(String), displayName: "Trần Thu Hà", emailVerified: false,
  });
  expect(User.create.mock.calls[0][0]).toEqual({
   firebaseUid: "new-firebase-uid", email: "thuha@petjoy.vn", fullName: "Trần Thu Hà", phone: "0912345678", role: "staff",
   termsAcceptedAt: expect.any(Date), adminNote: "Ca sáng",
  });
  expect(body.data).toMatchObject({ role: "staff", status: "active", email: "thuha@petjoy.vn", adminNote: "Ca sáng" });
  expect(body.data.code).toMatch(/^NV[0-9A-F]{6}$/);
 });

 it("uses a long random password that is never returned or audited", async () => {
  const { body } = await create(valid()).expect(201);
  await create(valid({ email: "other@petjoy.vn" })).expect(201);
  const [first, second] = admin.auth.createUser.mock.calls.map(([input]) => input.password);
  expect(first.length).toBeGreaterThanOrEqual(32);
  expect(first).not.toBe(second);
  expect(JSON.stringify(body)).not.toContain(first);
  const entry = AuditLog.create.mock.calls[0][0];
  expect(JSON.stringify(entry)).not.toContain(first);
  expect(entry).toMatchObject({ action: "user.create", after: { email: "thuha@petjoy.vn", role: "staff" }, result: "success" });
  expect(entry.summary).toMatch(/^Tạo tài khoản nhân viên NV[0-9A-F]{6}: Trần Thu Hà$/);
 });

 it("makes a Staff account whatever role the body asks for", async () => {
  const { body } = await create(valid({ role: "admin" })).expect(400);
  expect(body.error.fields).toEqual({ role: "Không được phép thay đổi trường này." });
  expect(admin.auth.createUser).not.toHaveBeenCalled();
 });

 it.each([["in MongoDB", "existing@petjoy.vn", null], ["in Firebase", "new@petjoy.vn", "auth/email-already-exists"]])(
  "refuses an email already %s and never touches that account", async (_where, email, code) => {
   if (code) admin.auth.createUser.mockRejectedValueOnce(Object.assign(new Error("exists"), { code }));
   const { body } = await create(valid({ email })).expect(409);
   expect(body.error).toEqual({ code: "DUPLICATE_VALUE", fields: { email: "Email này đã có tài khoản." } });
   expect(User.create).not.toHaveBeenCalled();
   expect(admin.auth.deleteUser).not.toHaveBeenCalled();
  });

 it("removes the Firebase account when the profile cannot be saved", async () => {
  createError = new Error("database down");
  const { body } = await create(valid()).expect(503);
  expect(body.error.code).toBe("DATABASE_UNAVAILABLE");
  expect(admin.auth.deleteUser).toHaveBeenCalledWith("new-firebase-uid");
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("logs, without personal data, when the clean-up fails too", async () => {
  createError = new Error("database down");
  admin.auth.deleteUser.mockRejectedValueOnce(Object.assign(new Error("down"), { code: "auth/internal-error" }));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await create(valid()).expect(503);
  expect(JSON.stringify(log.mock.calls)).toContain("new-firebase-uid");
  expect(JSON.stringify(log.mock.calls)).not.toContain("thuha@petjoy.vn");
 });

 it("reports Firebase being unavailable, with nothing created", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  admin.auth.createUser.mockRejectedValueOnce(Object.assign(new Error("down"), { code: "app/network-error" }));
  const { body } = await create(valid()).expect(503);
  expect(body.error.code).toBe("AUTH_UNAVAILABLE");
  expect(User.create).not.toHaveBeenCalled();
 });

 it("reports an address Firebase rejects on the email field", async () => {
  admin.auth.createUser.mockRejectedValueOnce(Object.assign(new Error("bad"), { code: "auth/invalid-email" }));
  expect((await create(valid()).expect(400)).body.error.fields).toEqual({ email: "Email không hợp lệ." });
 });

 it.each([
  [{ fullName: "A" }, "fullName", "Họ tên phải có ít nhất 2 ký tự."],
  [{ email: "not-an-email" }, "email", "Email không hợp lệ."],
  [{ phone: "12345" }, "phone", "Số điện thoại Việt Nam không hợp lệ."],
  [{ adminNote: "x".repeat(1001) }, "adminNote", "Ghi chú tối đa 1000 ký tự."],
  [{ password: "secret123" }, "password", "Không được phép thay đổi trường này."],
 ])("rejects %j on %s before calling Firebase", async (patch, field, message) => {
  const { body } = await create(valid(patch)).expect(400);
  expect(body.error).toEqual({ code: "VALIDATION_ERROR", fields: { [field]: message } });
  expect(admin.auth.createUser).not.toHaveBeenCalled();
 });

 it("refuses a guest, a Customer, Staff, and a request without the CSRF pair", async () => {
  admin.session.role = null;
  await create(valid()).expect(401);
  for (const role of ["customer", "staff"]) {
   admin.session.role = role;
   await create(valid()).expect(403);
  }
  admin.session.role = "admin";
  await admin.send("POST", URL, valid(), { csrf: false }).expect(403);
  expect(admin.auth.createUser).not.toHaveBeenCalled();
 });
});
