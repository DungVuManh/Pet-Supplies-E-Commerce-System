import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLog } from "../src/models/audit-log.model.js";
import { User } from "../src/models/user.model.js";
import { auditTargetHref } from "../src/controllers/admin/audit-log.controller.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`a0000000000000000000${suffix}`);

const adminUser = { _id: id("0001"), fullName: "Quản trị viên", email: "admin@petly.vn", role: "admin" };
const staffUser = { _id: id("0002"), fullName: "Vũ Đức Long", email: "duclong@petly.vn", role: "staff" };
const customerUser = { _id: id("0003"), fullName: "Phạm Thu Hà", email: "thuha@gmail.com", role: "customer" };
const users = [adminUser, staffUser, customerUser];

const sampleLogs = [
  {
    _id: id("0101"),
    actorId: adminUser,
    action: "user.lock",
    target: { collectionName: "users", id: String(customerUser._id) },
    summary: "Khóa tài khoản Phạm Thu Hà",
    ip: "14.161.28.10",
    result: "success",
    at: new Date("2026-10-12T10:15:00.000Z"),
    createdAt: new Date("2026-10-12T10:15:00.000Z"),
  },
  {
    _id: id("0102"),
    actorId: staffUser,
    action: "admin.cancellation.approve",
    target: { collectionName: "orders", id: "PA261011009" },
    summary: "Duyệt yêu cầu hủy đơn hàng PA261011009",
    ip: "14.161.28.12",
    result: "success",
    at: new Date("2026-10-11T16:30:00.000Z"),
    createdAt: new Date("2026-10-11T16:30:00.000Z"),
  },
  {
    _id: id("0103"),
    actorId: staffUser,
    action: "product.delete",
    target: { collectionName: "products", id: "RC-IN-2KG" },
    summary: "Xóa sản phẩm RC-IN-2KG bị từ chối",
    ip: "14.161.28.10",
    result: "denied",
    at: new Date("2026-10-10T11:08:00.000Z"),
    createdAt: new Date("2026-10-10T11:08:00.000Z"),
  },
  {
    _id: id("0104"),
    actorId: adminUser,
    action: "settings.update",
    target: { collectionName: "settings", id: "store-settings" },
    summary: "Cập nhật cấu hình cửa hàng",
    ip: "14.161.28.10",
    result: "success",
    at: new Date("2026-10-09T08:45:00.000Z"),
    createdAt: new Date("2026-10-09T08:45:00.000Z"),
  },
  {
    _id: id("0105"),
    actorId: null,
    action: "category.create",
    target: { collectionName: "categories", id: "CAT-DOG-FOOD" },
    summary: "Tạo danh mục Thức ăn cho chó",
    ip: "127.0.0.1",
    result: "success",
    at: new Date("2026-10-08T09:00:00.000Z"),
    createdAt: new Date("2026-10-08T09:00:00.000Z"),
  },
];

function matchesFilter(item, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  if (filter.$and) return filter.$and.every((sub) => matchesFilter(item, sub));
  if (filter.$or) return filter.$or.some((sub) => matchesFilter(item, sub));
  if (filter.action) {
    if (filter.action.$in) {
      if (!filter.action.$in.includes(item.action)) return false;
    } else if (item.action !== filter.action) {
      return false;
    }
  }
  if (filter.result && item.result !== filter.result) return false;
  return true;
}

function fakeAuditFind(filter) {
  const query = { skip: 0, limit: Infinity };
  const chain = {
    sort: () => chain,
    skip: (value) => { query.skip = value; return chain; },
    limit: (value) => { query.limit = value; return chain; },
    populate: () => chain,
    lean: async () => {
      return sampleLogs.filter((item) => matchesFilter(item, filter)).slice(query.skip, query.skip + query.limit);
    },
  };
  return chain;
}

let admin;
beforeEach(() => {
  admin = createAdminTestApp();
  vi.spyOn(AuditLog, "find").mockImplementation(fakeAuditFind);
  vi.spyOn(AuditLog, "countDocuments").mockImplementation(async (filter) => {
    return sampleLogs.filter((item) => matchesFilter(item, filter)).length;
  });
  vi.spyOn(User, "find").mockImplementation(() => ({
    select: () => ({
      lean: async () => users,
    }),
  }));
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/admin/audit-logs", () => {
  it("rejects guest with 401", async () => {
    admin.session.role = null;
    const response = await admin.send("GET", "/api/v1/admin/audit-logs").expect(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects customer with 403", async () => {
    admin.session.role = "customer";
    const response = await admin.send("GET", "/api/v1/admin/audit-logs").expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects staff with 403", async () => {
    admin.session.role = "staff";
    const response = await admin.send("GET", "/api/v1/admin/audit-logs").expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows admin and returns audit log rows with pagination and computed targetHref", async () => {
    const response = await admin.send("GET", "/api/v1/admin/audit-logs").expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 6,
      total: sampleLogs.length,
    });
    expect(response.body.data.items).toHaveLength(sampleLogs.length);

    const first = response.body.data.items[0];
    expect(first).toMatchObject({
      actor: "Quản trị viên",
      actorRole: "admin",
      action: "Khóa tài khoản",
      actionCode: "user.lock",
      target: String(customerUser._id),
      targetHref: `/admin/users/${customerUser._id}`,
      result: "Thành công",
      rawResult: "success",
      ip: "14.161.28.10",
    });
    expect(first.time).toBeDefined();
    expect(first.fullTime).toBeDefined();
  });

  it("handles audit log with missing or null actor as system", async () => {
    const response = await admin.send("GET", "/api/v1/admin/audit-logs").expect(200);
    const systemRow = response.body.data.items.find((item) => item.actionCode === "category.create");
    expect(systemRow).toBeDefined();
    expect(systemRow.actor).toBe("Hệ thống");
    expect(systemRow.actorRole).toBe("system");
    expect(systemRow.targetHref).toBe("/admin/categories");
  });

  it("filters by result (denied)", async () => {
    const response = await admin.send("GET", "/api/v1/admin/audit-logs?result=denied").expect(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].rawResult).toBe("denied");
    expect(response.body.data.items[0].result).toBe("Bị từ chối");
  });

  it("filters by action", async () => {
    const response = await admin.send("GET", "/api/v1/admin/audit-logs?action=settings.update").expect(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].actionCode).toBe("settings.update");
  });

  it("is read-only: rejects POST, PUT, DELETE under /audit-logs", async () => {
    await admin.send("POST", "/api/v1/admin/audit-logs").expect(404);
    await admin.send("PUT", "/api/v1/admin/audit-logs").expect(404);
    await admin.send("DELETE", "/api/v1/admin/audit-logs").expect(404);
  });
});

describe("auditTargetHref helper", () => {
  it("computes links correctly for different collections and formats", () => {
    expect(auditTargetHref("users", "123456789012345678901234")).toBe("/admin/users/123456789012345678901234");
    expect(auditTargetHref("", "KH0001")).toBe("/admin/users/KH0001");
    expect(auditTargetHref("orders", "PA261011009")).toBe("/admin/orders?q=PA261011009");
    expect(auditTargetHref("", "PA261011009")).toBe("/admin/orders?q=PA261011009");
    expect(auditTargetHref("categories", "CAT-01")).toBe("/admin/categories");
    expect(auditTargetHref("policies", "POL-RETURN")).toBe("/admin/system/policies");
    expect(auditTargetHref("", "POL-RETURN")).toBe("/admin/system/policies");
    expect(auditTargetHref("settings", "store-settings")).toBe("/admin/system/settings");
    expect(auditTargetHref("", "CFG-SHIP")).toBe("/admin/system/settings");
    expect(auditTargetHref("masterdata", "petType/dog")).toBe("/admin/master-data");
    expect(auditTargetHref("routes", "GET /admin/orders")).toBe("/admin/system/audit-log");
    expect(auditTargetHref("products", "RC-MA-2KG")).toBe("/admin/products/RC-MA-2KG");
  });
});
