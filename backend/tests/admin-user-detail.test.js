import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Address } from "../src/models/address.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Order } from "../src/models/order.model.js";
import { User, userRepository } from "../src/models/user.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`b0000000000000000000${suffix}`);
const url = (user, action = "") => `/api/v1/admin/users/${user._id ?? user}${action && `/${action}`}`;

let accounts;
let audits;
let admin;

const customer = () => accounts.find((user) => user.role === "customer");
const staff = () => accounts.find((user) => user.role === "staff");

// A small in-memory User collection, so the conditional updates are really exercised.
function matches(document, filter) {
 return Object.entries(filter).every(([key, condition]) => {
  if (key === "_id") return String(document._id) === String(condition);
  return condition?.$ne !== undefined ? document[key] !== condition.$ne : document[key] === condition;
 });
}
function findOneAndUpdate(filter, update) {
 const document = accounts.find((item) => matches(item, filter));
 if (document) {
  Object.assign(document, update.$set);
  for (const key of Object.keys(update.$unset ?? {})) delete document[key];
 }
 return { lean: async () => (document ? { ...document } : null) };
}

function chain(rows) {
 const query = {
  sort: () => query, limit: () => query, select: () => query, populate: () => query, lean: async () => rows,
 };
 return query;
}

const order = (suffix, day, fields = {}) => ({
 _id: id(suffix),
 orderCode: `PA${suffix}`,
 total: 450000,
 orderStatus: "completed",
 items: [{ name: "Royal Canin", qty: 2 }],
 createdAt: new Date(`2026-10-${day}T03:00:00Z`),
 ...fields,
});

beforeEach(() => {
 accounts = [
  {
   _id: id("3f2a"), firebaseUid: "uid-customer", role: "customer", status: "active", fullName: "Đỗ Khánh Linh",
   email: "linh@gmail.com", phone: "0945678901", createdAt: new Date("2026-09-01T03:00:00Z"), adminNote: "Khách quen",
  },
  {
   _id: id("7c8d"), firebaseUid: "uid-staff", role: "staff", fullName: "Vũ Đức Long",
   email: "long@petly.vn", phone: "0987654321", createdAt: new Date("2026-09-02T03:00:00Z"),
  },
  {
   _id: id("00aa"), firebaseUid: "uid-admin", role: "admin", status: "active", fullName: "Admin khác",
   email: "boss@petly.vn", phone: "0900000000", createdAt: new Date("2026-09-03T03:00:00Z"),
  },
 ];
 audits = [];
 admin = createAdminTestApp();
 vi.spyOn(User, "findById").mockImplementation((value) => ({
  lean: async () => {
   const found = accounts.find((user) => String(user._id) === String(value));
   return found ? { ...found } : null;
  },
 }));
 vi.spyOn(User, "findOneAndUpdate").mockImplementation(findOneAndUpdate);
 vi.spyOn(Address, "findOne").mockReturnValue(chain(null));
 vi.spyOn(Order, "aggregate").mockResolvedValue([]);
 vi.spyOn(Order, "find").mockReturnValue(chain([]));
 vi.spyOn(AuditLog, "find").mockImplementation(() => chain(audits));
 vi.spyOn(AuditLog, "create").mockImplementation(async (entry) => entry);
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/users/:id", () => {
 it("returns the profile without any Firebase identifier", async () => {
  admin.auth.getUser.mockResolvedValue({ metadata: { lastSignInTime: "Mon, 12 Oct 2026 03:40:00 GMT" } });
  const { body } = await admin.send("GET", url(customer())).expect(200);
  expect(body.data).toEqual({
   id: String(customer()._id), code: "KH003F2A", role: "customer", fullName: "Đỗ Khánh Linh",
   email: "linh@gmail.com", phone: "0945678901", joinedAt: "2026-09-01T03:00:00.000Z", status: "active",
   lockedAt: null, lockReason: null, adminNote: "Khách quen", lastSignInAt: "2026-10-12T03:40:00.000Z",
   defaultAddress: null, completedOrders: 0, totalSpent: 0, activity: [],
  });
  expect(JSON.stringify(body)).not.toContain("uid-customer");
  expect(admin.auth.getUser).toHaveBeenCalledWith("uid-customer");
 });

 it("returns the default address fields only", async () => {
  const address = {
   _id: id("aaaa"), userId: customer()._id, recipientName: "Linh", phone: "0945678901",
   street: "28 Lê Lợi", ward: "Đa Kao", district: "Quận 1", province: "TP. Hồ Chí Minh", isDefault: true,
  };
  Address.findOne.mockReturnValue(chain(address));
  const { body } = await admin.send("GET", url(customer())).expect(200);
  expect(Address.findOne).toHaveBeenCalledWith({ userId: customer()._id, isDefault: true });
  expect(body.data.defaultAddress).toEqual({
   recipientName: "Linh", phone: "0945678901", street: "28 Lê Lợi", ward: "Đa Kao", district: "Quận 1", province: "TP. Hồ Chí Minh",
  });
 });

 it("counts completed orders and sums only the paid ones", async () => {
  Order.aggregate.mockResolvedValue([{ completedOrders: 3, totalSpent: 900000 }]);
  const { body } = await admin.send("GET", url(customer())).expect(200);
  expect(body.data).toMatchObject({ completedOrders: 3, totalSpent: 900000 });
  const [match, group] = Order.aggregate.mock.calls[0][0];
  expect(match.$match).toEqual({ creationState: { $ne: "pending" }, customerId: customer()._id, orderStatus: { $in: ["completed", "delivered"] } });
  expect(group.$group.totalSpent.$sum.$cond[0]).toEqual({ $eq: ["$paymentStatus", "paid"] });
 });

 it("credits a Staff member with the sales they created", async () => {
  await admin.send("GET", url(staff())).expect(200);
  expect(Order.aggregate.mock.calls[0][0][0].$match).toMatchObject({ createdByStaffId: staff()._id });
  expect(Order.find.mock.calls[0][0]).toEqual({ creationState: { $ne: "pending" }, createdByStaffId: staff()._id });
 });

 it("treats a missing status as active", async () => {
  expect((await admin.send("GET", url(staff())).expect(200)).body.data.status).toBe("active");
 });

 it.each([
  ["a Firebase failure", () => admin.auth.getUser.mockRejectedValue(new Error("down"))],
  ["no recorded sign-in", () => admin.auth.getUser.mockResolvedValue({ metadata: { lastSignInTime: null } })],
  ["an unreadable date", () => admin.auth.getUser.mockResolvedValue({ metadata: { lastSignInTime: "never" } })],
 ])("reports the last sign-in as null on %s", async (_name, arrange) => {
  arrange();
  expect((await admin.send("GET", url(customer())).expect(200)).body.data.lastSignInAt).toBeNull();
 });

 it("merges orders and audit entries, newest first, keeping 10", async () => {
  Order.find.mockReturnValue(chain(Array.from({ length: 10 }, (_, index) => order(`10${index}0`, String(index + 10)))));
  audits = [
   { _id: id("a001"), at: new Date("2026-10-30T03:00:00Z"), action: "user.lock", summary: "Khóa tài khoản", result: "success", actorId: { fullName: "Quản trị viên" } },
   { _id: id("a002"), at: new Date("2026-10-09T03:00:00Z"), action: "user.unlock", result: "success", actorId: null },
  ];
  const { activity } = (await admin.send("GET", url(customer())).expect(200)).body.data;
  expect(activity).toHaveLength(10);
  expect(activity[0]).toEqual({
   id: `audit-${id("a001")}`, at: "2026-10-30T03:00:00.000Z", title: "Khóa tài khoản", detail: "Thực hiện bởi Quản trị viên",
   amount: null, status: "success", href: "/admin/system/audit-log",
  });
  expect(activity[1]).toEqual({
   id: `order-${id("1090")}`, at: "2026-10-19T03:00:00.000Z", title: "Tạo đơn #PA1090", detail: "Royal Canin · Số lượng 2",
   amount: 450000, status: "completed", href: "/admin/orders?q=PA1090",
  });
  // The oldest entry falls outside the newest 10.
  expect(activity.map((item) => item.id)).not.toContain(`audit-${id("a002")}`);
  expect(AuditLog.find).toHaveBeenCalledWith({ "target.collectionName": "users", "target.id": String(customer()._id) });
 });

 it("reports a legacy delivered order as completed", async () => {
  Order.find.mockReturnValue(chain([order("3000", "21", { orderStatus: "delivered" })]));
  const { activity } = (await admin.send("GET", url(customer())).expect(200)).body.data;
  expect(activity[0].status).toBe("completed");
 });

 it("summarizes an order with several items and an audit entry with no summary or actor", async () => {
  Order.find.mockReturnValue(chain([order("2000", "20", { items: [{ name: "Pate", qty: 1 }, { name: "Cát", qty: 1 }, { name: "Bát", qty: 1 }] })]));
  audits = [{ _id: id("a003"), at: new Date("2026-10-01T03:00:00Z"), action: "user.unlock", actorId: null }];
  const { activity } = (await admin.send("GET", url(customer())).expect(200)).body.data;
  expect(activity[0].detail).toBe("Pate · Số lượng 1 và 2 sản phẩm khác");
  expect(activity[1]).toMatchObject({ title: "user.unlock", detail: "Thực hiện bởi tài khoản không xác định", status: "success" });
 });

 it.each([
  ["an unknown id", () => id("ffff")],
  ["an Admin id", () => id("00aa")],
  ["a malformed id", () => "not-an-id"],
  ["a 12-character id mongoose would accept", () => "abcdefghijkl"],
 ])("returns 404 for %s", async (_name, target) => {
  const { body } = await admin.send("GET", url(target())).expect(404);
  expect(body.error.code).toBe("NOT_FOUND");
 });
});

describe("POST /api/v1/admin/users/:id/lock", () => {
 const reason = "Gian lận thanh toán";

 it("locks the account, revokes its sessions, and records who did it", async () => {
  const { body } = await admin.send("POST", url(customer(), "lock"), { reason: `  ${reason}  ` }).expect(200);
  expect(admin.auth.revokeRefreshTokens).toHaveBeenCalledWith("uid-customer");
  expect(customer()).toMatchObject({ status: "locked", lockReason: reason, lockedBy: admin.user()._id, lockedAt: expect.any(Date) });
  expect(body.data).toEqual({ id: String(customer()._id), status: "locked", lockedAt: expect.any(String), lockReason: reason });
 });

 it("writes an audit entry", async () => {
  await admin.send("POST", url(customer(), "lock"), { reason }).expect(200);
  expect(AuditLog.create).toHaveBeenCalledTimes(1);
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   actorId: admin.user()._id,
   action: "user.lock",
   target: { collectionName: "users", id: String(customer()._id) },
   before: { status: "active" },
   after: { status: "locked", lockReason: reason },
   result: "success",
   summary: `Khóa tài khoản KH003F2A: ${reason}`,
  });
 });

 it("locks a legacy document that has no status", async () => {
  await admin.send("POST", url(staff(), "lock"), { reason }).expect(200);
  expect(staff().status).toBe("locked");
 });

 it.each([
  ["missing", {}], ["too short", { reason: " ab " }], ["too long", { reason: "x".repeat(201) }], ["not text", { reason: 123 }],
  ["sent with extra fields", { reason, role: "admin" }],
 ])("rejects a reason that is %s", async (_name, payload) => {
  const { body } = await admin.send("POST", url(customer(), "lock"), payload).expect(400);
  expect(body.error.code).toBe("VALIDATION_ERROR");
  expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
  expect(customer().status).toBe("active");
 });

 it("accepts a reason at each length limit", async () => {
  await admin.send("POST", url(customer(), "lock"), { reason: "abc" }).expect(200);
  await admin.send("POST", url(staff(), "lock"), { reason: "x".repeat(200) }).expect(200);
 });

 it("refuses the caller's own account", async () => {
  accounts.push({ ...admin.user(), role: "admin", status: "active" });
  const { body } = await admin.send("POST", url(admin.user(), "lock"), { reason }).expect(403);
  expect(body.error.code).toBe("CANNOT_CHANGE_SELF");
  expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
 });

 it("refuses another Admin account", async () => {
  const { body } = await admin.send("POST", url(id("00aa"), "lock"), { reason }).expect(403);
  expect(body.error.code).toBe("CANNOT_CHANGE_ADMIN");
  expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
 });

 it.each([["unknown", () => id("ffff")], ["malformed", () => "nope"]])("returns 404 for a %s id", async (_name, target) => {
  await admin.send("POST", url(target(), "lock"), { reason }).expect(404);
 });

 it("returns 409 for an account that is already locked", async () => {
  customer().status = "locked";
  const { body } = await admin.send("POST", url(customer(), "lock"), { reason }).expect(409);
  expect(body.error.code).toBe("ALREADY_LOCKED");
  expect(admin.auth.revokeRefreshTokens).not.toHaveBeenCalled();
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("returns 409 when a concurrent request locks the account first", async () => {
  // Both requests read `active`; the second loses the conditional update.
  admin.auth.revokeRefreshTokens.mockImplementation(async () => { customer().status = "locked"; customer().lockReason = "Trước đó"; });
  const { body } = await admin.send("POST", url(customer(), "lock"), { reason }).expect(409);
  expect(body.error.code).toBe("ALREADY_LOCKED");
  expect(customer().lockReason).toBe("Trước đó");
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("leaves the status unchanged when revocation fails", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  admin.auth.revokeRefreshTokens.mockRejectedValue(Object.assign(new Error("down"), { code: "auth/internal-error" }));
  const { body } = await admin.send("POST", url(customer(), "lock"), { reason }).expect(503);
  expect(body.error.code).toBe("AUTH_UNAVAILABLE");
  expect(customer().status).toBe("active");
  expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("still locks an account that was deleted from Firebase, without ending the Admin's session", async () => {
  admin.auth.revokeRefreshTokens.mockRejectedValue(Object.assign(new Error("gone"), { code: "auth/user-not-found" }));
  const response = await admin.send("POST", url(customer(), "lock"), { reason }).expect(200);
  expect(response.headers["set-cookie"]).toBeUndefined();
  expect(customer().status).toBe("locked");
 });

 it("still answers when the audit entry cannot be written", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  AuditLog.create.mockRejectedValue(new Error("down"));
  await admin.send("POST", url(customer(), "lock"), { reason }).expect(200);
  expect(customer().status).toBe("locked");
 });
});

describe("POST /api/v1/admin/users/:id/unlock", () => {
 beforeEach(() => {
  Object.assign(customer(), { status: "locked", lockedAt: new Date(), lockedBy: admin.user()._id, lockReason: "Gian lận" });
 });

 it("clears every lock field and audits the change", async () => {
  const { body } = await admin.send("POST", url(customer(), "unlock")).expect(200);
  expect(body.data).toEqual({ id: String(customer()._id), status: "active", lockedAt: null, lockReason: null });
  expect(customer().status).toBe("active");
  for (const field of ["lockedAt", "lockedBy", "lockReason"]) expect(customer()).not.toHaveProperty(field);
  expect(admin.auth.revokeRefreshTokens).toHaveBeenCalledWith("uid-customer");
  expect(AuditLog.create.mock.calls[0][0]).toMatchObject({
   action: "user.unlock",
   target: { collectionName: "users", id: String(customer()._id) },
   before: { status: "locked", lockReason: "Gian lận" },
   after: { status: "active" },
   summary: "Mở khóa tài khoản KH003F2A",
  });
 });

 it("returns 409 for an account that is not locked", async () => {
  customer().status = "active";
  const { body } = await admin.send("POST", url(customer(), "unlock")).expect(409);
  expect(body.error.code).toBe("NOT_LOCKED");
  expect(AuditLog.create).not.toHaveBeenCalled();
 });

 it("treats a missing status as not locked", async () => {
  await admin.send("POST", url(staff(), "unlock")).expect(409);
 });

 it("refuses the caller's own account and other Admins", async () => {
  const own = await admin.send("POST", url(admin.user(), "unlock")).expect(403);
  expect(own.body.error.code).toBe("CANNOT_CHANGE_SELF");
  const other = await admin.send("POST", url(id("00aa"), "unlock")).expect(403);
  expect(other.body.error.code).toBe("CANNOT_CHANGE_ADMIN");
 });

 it("leaves the account locked when revocation fails", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  admin.auth.revokeRefreshTokens.mockRejectedValue(new Error("down"));
  await admin.send("POST", url(customer(), "unlock")).expect(503);
  expect(customer().status).toBe("locked");
 });
});

describe("a locked account", () => {
 const reason = "Gian lận thanh toán";
 let revokedAfterSignIn;

 // The target signs in with its own Firebase identity, against the same in-memory accounts.
 const asTarget = () => admin.auth.verifySessionCookie.mockImplementation(async () => {
  if (revokedAfterSignIn) throw Object.assign(new Error("revoked"), { code: "auth/session-cookie-revoked" });
  return { uid: "uid-customer" };
 });
 const asAdmin = () => admin.auth.verifySessionCookie.mockImplementation(async () => ({ uid: admin.user().firebaseUid }));
 const signIn = () => admin.send("POST", "/api/v1/auth/session", { idToken: "fresh-token" });

 beforeEach(() => {
  revokedAfterSignIn = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const lookup = userRepository.findByUid.getMockImplementation();
  userRepository.findByUid.mockImplementation(async (uid) => {
   const account = accounts.find((user) => user.firebaseUid === uid);
   return account ? { ...account } : lookup(uid);
  });
  admin.auth.revokeRefreshTokens.mockImplementation(async () => { revokedAfterSignIn = true; });
  admin.auth.verifyIdToken = vi.fn(async () => ({
   uid: "uid-customer", email: "linh@gmail.com", auth_time: Date.now() / 1000 - 1, firebase: { sign_in_provider: "password" },
  }));
  admin.auth.createSessionCookie = vi.fn(async () => "new-session");
 });

 it("loses its existing session as soon as it is locked", async () => {
  asTarget();
  await admin.send("GET", "/api/v1/auth/me").expect(200);
  asAdmin();
  await admin.send("POST", url(customer(), "lock"), { reason }).expect(200);
  asTarget();
  const response = await admin.send("GET", "/api/v1/auth/me").expect(401);
  expect(response.headers["set-cookie"].join()).toContain("petly-session=;");
 });

 it("is refused with ACCOUNT_LOCKED even if its session was not revoked, and the cookie is cleared", async () => {
  customer().status = "locked";
  asTarget();
  const response = await admin.send("GET", "/api/v1/auth/me").expect(403);
  expect(response.body).toEqual({ success: false, message: "Tài khoản đang bị khóa.", error: { code: "ACCOUNT_LOCKED" } });
  expect(response.headers["set-cookie"].join()).toContain("petly-session=;");
 });

 it("is refused on sign-in before a session cookie is created", async () => {
  customer().status = "locked";
  const response = await signIn().expect(403);
  expect(response.body.error.code).toBe("ACCOUNT_LOCKED");
  expect(admin.auth.createSessionCookie).not.toHaveBeenCalled();
  expect(response.headers["set-cookie"]?.join() ?? "").not.toContain("petly-session=new-session");
 });

 it("cannot get a session through the registration retry either", async () => {
  customer().status = "locked";
  vi.spyOn(userRepository, "createIfMissing").mockImplementation(async () => ({ ...customer() }));
  const response = await admin.send("POST", "/api/v1/auth/register", {
   idToken: "fresh-token", fullName: "Đỗ Khánh Linh", phone: "0945678901", terms: true,
  }).expect(403);
  expect(response.body.error.code).toBe("ACCOUNT_LOCKED");
  expect(admin.auth.createSessionCookie).not.toHaveBeenCalled();
 });

 it("can sign in and use a new session after it is unlocked", async () => {
  asAdmin();
  await admin.send("POST", url(customer(), "lock"), { reason }).expect(200);
  expect((await signIn().expect(403)).body.error.code).toBe("ACCOUNT_LOCKED");
  await admin.send("POST", url(customer(), "unlock")).expect(200);

  const response = await signIn().expect(200);
  expect(response.headers["set-cookie"].join()).toContain("petly-session=new-session");
  revokedAfterSignIn = false; // The new session was created after the revocation.
  asTarget();
  await admin.send("GET", "/api/v1/auth/me").expect(200);
 });
});
