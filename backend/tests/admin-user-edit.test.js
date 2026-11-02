import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Address } from "../src/models/address.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Order } from "../src/models/order.model.js";
import { User } from "../src/models/user.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`b0000000000000000000${suffix}`);
const LOADED_AT = "2026-09-05T03:00:00.000Z";

let accounts;
let admin;

const customer = () => accounts[0];
const staff = () => accounts[1];
const url = (user) => `/api/v1/admin/users/${user._id ?? user}`;
const patch = (user, body) => admin.send("PATCH", url(user), { expectedUpdatedAt: LOADED_AT, ...body });

function chain(rows) {
 const query = { sort: () => query, limit: () => query, select: () => query, populate: () => query, lean: async () => rows };
 return query;
}

// The conditional update, applied to the in-memory accounts as MongoDB would.
function updateOne(filter, update) {
 const document = accounts.find((item) => String(item._id) === String(filter._id)
  && item.updatedAt.getTime() === filter.updatedAt.getTime());
 if (document) {
  Object.assign(document, update.$set, { updatedAt: new Date("2026-10-01T03:00:00Z") });
  for (const key of Object.keys(update.$unset ?? {})) delete document[key];
 }
 return Promise.resolve({ matchedCount: document ? 1 : 0 });
}

beforeEach(() => {
 accounts = [
  {
   _id: id("3f2a"), firebaseUid: "uid-customer", role: "customer", status: "active", fullName: "Đỗ Khánh Linh", email: "linh@gmail.com",
   phone: "0945678901", createdAt: new Date("2026-09-01T03:00:00Z"), updatedAt: new Date(LOADED_AT),
  },
  {
   _id: id("7c8d"), firebaseUid: "uid-staff", role: "staff", status: "locked", fullName: "Vũ Đức Long", email: "long@petly.vn",
   phone: "0987654321", createdAt: new Date("2026-09-02T03:00:00Z"), updatedAt: new Date(LOADED_AT),
   lockedAt: new Date("2026-09-04T03:00:00Z"), lockedBy: id("00aa"), lockReason: "Nghỉ việc",
  },
  {
   _id: id("00aa"), firebaseUid: "uid-admin", role: "admin", status: "active", fullName: "Admin khác", email: "boss@petly.vn",
   phone: "0900000000", createdAt: new Date("2026-09-03T03:00:00Z"), updatedAt: new Date(LOADED_AT),
  },
 ];
 admin = createAdminTestApp();
 vi.spyOn(User, "findById").mockImplementation((value) => ({
  lean: async () => {
   const found = accounts.find((user) => String(user._id) === String(value));
   return found ? { ...found } : null;
  },
 }));
 vi.spyOn(User, "updateOne").mockImplementation(updateOne);
 vi.spyOn(Address, "findOne").mockReturnValue(chain(null));
 vi.spyOn(Order, "aggregate").mockResolvedValue([]);
 vi.spyOn(Order, "find").mockReturnValue(chain([]));
 vi.spyOn(AuditLog, "find").mockReturnValue(chain([]));
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("PATCH /api/v1/admin/users/:id", () => {
 it("saves the fields, returns the updated detail, and audits only what changed", async () => {
  const { body } = await patch(customer(), { fullName: "  Đỗ Linh  ", phone: "0945 678 902", adminNote: "Khách quen" }).expect(200);
  expect(customer()).toMatchObject({ fullName: "Đỗ Linh", phone: "0945678902", adminNote: "Khách quen" });
  expect(body.data).toMatchObject({ changed: true, fullName: "Đỗ Linh", phone: "0945678902", adminNote: "Khách quen", updatedAt: "2026-10-01T03:00:00.000Z" });
  expect(JSON.stringify(body)).not.toContain("uid-customer");
  expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   actorId: admin.user()._id,
   action: "user.update",
   target: { collectionName: "users", id: String(customer()._id) },
   before: { fullName: "Đỗ Khánh Linh", phone: "0945678901", adminNote: "" },
   after: { fullName: "Đỗ Linh", phone: "0945678902", adminNote: "Khách quen" },
   summary: "Cập nhật tài khoản KH003F2A: họ tên, số điện thoại, ghi chú",
  });
 });

 it("detects a no-op without writing, revoking, or auditing", async () => {
  const { body } = await patch(customer(), { fullName: " Đỗ Khánh Linh ", phone: "0945.678.901", role: "customer", status: "active", adminNote: "" }).expect(200);
  expect(body.data).toMatchObject({ changed: false, fullName: "Đỗ Khánh Linh" });
  expect(User.updateOne).not.toHaveBeenCalled();
  expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 describe("role", () => {
  it("changes customer to staff, overriding the immutable field, and revokes sessions", async () => {
   const { body } = await patch(customer(), { role: "staff" }).expect(200);
   expect(User.updateOne.mock.calls[0][2]).toMatchObject({ overwriteImmutable: true });
   expect(customer().role).toBe("staff");
   expect(body.data).toMatchObject({ role: "staff", code: "NV003F2A" });
   expect(admin.auth.revokeRefreshTokens).toHaveBeenCalledWith("uid-customer");
   expect(AuditLog.create.mock.calls[0][0]).toMatchObject({ before: { role: "customer" }, after: { role: "staff" } });
  });

  it("changes staff to customer", async () => {
   await patch(staff(), { role: "customer" }).expect(200);
   expect(staff().role).toBe("customer");
  });

  it("refuses a change to admin", async () => {
   const { body } = await patch(customer(), { role: "admin" }).expect(400);
   expect(body.error.fields.role).toBe("Vai trò chỉ có thể là Customer hoặc Staff.");
   expect(customer().role).toBe("customer");
   expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
  });

  it("refuses to edit another Admin, so a change from admin is impossible", async () => {
   const { body } = await patch(id("00aa"), { role: "customer" }).expect(403);
   expect(body.error.code).toBe("CANNOT_CHANGE_ADMIN");
   expect(accounts[2].role).toBe("admin");
  });

  it("refuses the caller's own account", async () => {
   const { body } = await patch(admin.user(), { fullName: "Tên mới" }).expect(403);
   expect(body.error.code).toBe("CANNOT_CHANGE_SELF");
  });

  it("leaves the account unchanged when revocation fails", async () => {
   vi.spyOn(console, "warn").mockImplementation(() => {});
   admin.auth.revokeRefreshTokens.mockRejectedValue(new Error("down"));
   const { body } = await patch(customer(), { role: "staff", fullName: "Tên mới" }).expect(503);
   expect(body.error.code).toBe("AUTH_UNAVAILABLE");
   expect(customer()).toMatchObject({ role: "customer", fullName: "Đỗ Khánh Linh" });
   expect(AuditLog.create).not.toHaveBeenCalled();
  });
 });

 describe("status", () => {
  it("locks with a reason, recording who and when, and revokes sessions", async () => {
   await patch(customer(), { status: "locked", lockReason: " Gian lận " }).expect(200);
   expect(customer()).toMatchObject({ status: "locked", lockReason: "Gian lận", lockedBy: admin.user()._id, lockedAt: expect.any(Date) });
   expect(admin.auth.revokeRefreshTokens).toHaveBeenCalledWith("uid-customer");
   expect(AuditLog.create.mock.calls[0][0]).toMatchObject({ before: { status: "active" }, after: { status: "locked", lockReason: "Gian lận" } });
  });

  it("refuses to lock without a reason", async () => {
   const { body } = await patch(customer(), { status: "locked" }).expect(400);
   expect(body.error.fields).toEqual({ lockReason: "Nhập lý do khóa, từ 3 đến 200 ký tự." });
   expect(customer().status).toBe("active");
   expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
  });

  it("unlocks, clearing every lock field", async () => {
   await patch(staff(), { status: "active" }).expect(200);
   expect(staff().status).toBe("active");
   for (const field of ["lockedAt", "lockedBy", "lockReason"]) expect(staff()).not.toHaveProperty(field);
   expect(admin.auth.revokeRefreshTokens).toHaveBeenCalledWith("uid-staff");
  });

  it("keeps the lock fields when other fields change on a locked account", async () => {
   await patch(staff(), { status: "locked", fullName: "Vũ Long" }).expect(200);
   expect(staff()).toMatchObject({ status: "locked", fullName: "Vũ Long", lockReason: "Nghỉ việc" });
   expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
  });

  it("treats a missing status as active", async () => {
   delete customer().status;
   const { body } = await patch(customer(), { status: "active" }).expect(200);
   expect(body.data.changed).toBe(false);
  });
 });

 describe("validation", () => {
  it.each([
   ["fullName", " a ", "Họ tên phải có ít nhất 2 ký tự."],
   ["fullName", "x".repeat(101), "Họ tên tối đa 100 ký tự."],
   ["fullName", 12, "Họ tên không hợp lệ."],
   ["phone", "12345", "Số điện thoại Việt Nam không hợp lệ."],
   ["phone", "1".repeat(21), "Số điện thoại không hợp lệ."],
   ["status", "banned", "Trạng thái không hợp lệ."],
   ["lockReason", "ab", "Lý do khóa phải có từ 3 đến 200 ký tự."],
   ["adminNote", "x".repeat(1001), "Ghi chú tối đa 1000 ký tự."],
  ])("rejects %s=%j with its message", async (field, value, message) => {
   const { body } = await patch(customer(), { [field]: value }).expect(400);
   expect(body).toEqual({ success: false, message: expect.any(String), error: { code: "VALIDATION_ERROR", fields: { [field]: message } } });
   expect(User.updateOne).not.toHaveBeenCalled();
  });

  it("rejects email, which Firebase owns", async () => {
   const { body } = await patch(customer(), { email: "new@gmail.com" }).expect(400);
   expect(body.error.fields).toEqual({ email: "Không được phép thay đổi trường này." });
   expect(customer().email).toBe("linh@gmail.com");
  });

  it("reports every invalid field at once", async () => {
   const { body } = await patch(customer(), { fullName: "a", phone: "1" }).expect(400);
   expect(Object.keys(body.error.fields).sort()).toEqual(["fullName", "phone"]);
  });

  it("accepts the +84 phone format and the longest note", async () => {
   await patch(customer(), { phone: "+84945678901", adminNote: "x".repeat(1000) }).expect(200);
   expect(customer().phone).toBe("+84945678901");
  });

  it.each([["missing", undefined], ["unreadable", "soon"]])("requires expectedUpdatedAt: %s", async (_name, value) => {
   const { body } = await admin.send("PATCH", url(customer()), { fullName: "Tên mới", expectedUpdatedAt: value }).expect(400);
   expect(body.error.fields).toHaveProperty("expectedUpdatedAt");
  });
 });

 describe("concurrent changes", () => {
  it("returns 409 when the form was loaded before the latest change", async () => {
   const { body } = await patch(customer(), { fullName: "Tên mới", expectedUpdatedAt: "2026-09-04T03:00:00.000Z" }).expect(409);
   expect(body.error.code).toBe("STALE_USER");
   expect(customer().fullName).toBe("Đỗ Khánh Linh");
   expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
  });

  it("returns 409 when another change lands between the read and the write", async () => {
   admin.auth.revokeRefreshTokens.mockImplementation(async () => { customer().updatedAt = new Date("2026-09-30T03:00:00Z"); });
   const { body } = await patch(customer(), { role: "staff" }).expect(409);
   expect(body.error.code).toBe("STALE_USER");
   expect(customer().role).toBe("customer");
   expect(AuditLog.create).not.toHaveBeenCalled();
  });
 });

 it.each([["unknown", () => id("ffff")], ["malformed", () => "nope"]])("returns 404 for a %s id", async (_name, target) => {
  await patch(target(), { fullName: "Tên mới" }).expect(404);
 });
});
