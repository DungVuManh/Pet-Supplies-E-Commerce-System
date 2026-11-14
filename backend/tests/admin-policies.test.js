import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Policy } from "../src/models/policy.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const id = (suffix) => new mongoose.Types.ObjectId(`a0000000000000000000${suffix}`);

const initialPolicies = [
  {
    _id: id("0001"),
    id: "return",
    code: "POL-RETURN",
    title: "Chính sách đổi trả",
    status: "published",
    effectiveDate: "01/10/2026",
    content: "Nội dung chính sách đổi trả...",
    updatedBy: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
  },
  {
    _id: id("0002"),
    id: "cancellation",
    code: "POL-CANCEL",
    title: "Chính sách hủy đơn",
    status: "published",
    effectiveDate: "01/10/2026",
    content: "Nội dung chính sách hủy đơn...",
    updatedBy: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
  },
];

describe("Admin Policies API", () => {
  let app;
  let storedPolicies;

  beforeEach(() => {
    storedPolicies = JSON.parse(JSON.stringify(initialPolicies));
    app = createAdminTestApp();

    vi.spyOn(Policy, "countDocuments").mockImplementation(async () => storedPolicies.length);

    vi.spyOn(Policy, "find").mockImplementation(() => ({
      sort: () => ({
        populate: () => ({
          lean: async () => storedPolicies,
        }),
      }),
    }));

    vi.spyOn(Policy, "findOne").mockImplementation((query) => {
      let found = null;
      if (query.$or) {
        found = storedPolicies.find((p) =>
          query.$or.some((cond) => {
            if (cond.code && p.code === cond.code) return true;
            if (cond.id && p.id === cond.id) return true;
            return false;
          })
        );
      }
      if (!found) {
        return {
          populate: () => ({
            lean: async () => null,
          }),
        };
      }
      const doc = {
        ...found,
        save: async function () {
          const idx = storedPolicies.findIndex((p) => p.code === this.code);
          if (idx !== -1) {
            storedPolicies[idx] = { ...this };
          }
          return this;
        },
        toObject: function () {
          return { ...this };
        },
      };
      return {
        ...doc,
        populate: () => ({
          lean: async () => doc,
        }),
      };
    });

    vi.spyOn(AuditLog, "create").mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Access control", () => {
    it("denies unauthenticated guests (401)", async () => {
      app.session.role = null;
      const res = await app.send("GET", "/api/v1/admin/policies");
      expect(res.status).toBe(401);
    });

    it("denies customers (403)", async () => {
      app.session.role = "customer";
      const res = await app.send("GET", "/api/v1/admin/policies");
      expect(res.status).toBe(403);
    });

    it("denies staff (403)", async () => {
      app.session.role = "staff";
      const res = await app.send("GET", "/api/v1/admin/policies");
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/admin/policies", () => {
    it("lists policies successfully", async () => {
      const res = await app.send("GET", "/api/v1/admin/policies");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toMatchObject({
        id: "return",
        code: "POL-RETURN",
        title: "Chính sách đổi trả",
        status: "Đã công bố",
      });
    });
  });

  describe("GET /api/v1/admin/policies/:code", () => {
    it("returns policy detail by code", async () => {
      const res = await app.send("GET", "/api/v1/admin/policies/POL-RETURN");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe("POL-RETURN");
      expect(res.body.data.title).toBe("Chính sách đổi trả");
    });

    it("returns 404 if policy code not found", async () => {
      const res = await app.send("GET", "/api/v1/admin/policies/POL-UNKNOWN");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PUT /api/v1/admin/policies/:code", () => {
    it("updates policy content, status and creates an audit log", async () => {
      const res = await app.send("PUT", "/api/v1/admin/policies/POL-RETURN", {
        title: "Chính sách đổi trả cập nhật",
        content: "Nội dung điều khoản mới...",
        status: "Bản nháp",
        effectiveDate: "15/10/2026",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Chính sách đổi trả cập nhật");
      expect(res.body.data.content).toBe("Nội dung điều khoản mới...");

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "policies.update",
          target: { collectionName: "policies", id: "POL-RETURN" },
          summary: "Cập nhật chính sách: Chính sách đổi trả cập nhật",
        })
      );
    });

    it("validates maximum length of content (max 20,000 characters)", async () => {
      const res = await app.send("PUT", "/api/v1/admin/policies/POL-RETURN", {
        content: "a".repeat(20001),
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
