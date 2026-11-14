import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Policy } from "../src/models/policy.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { DEFAULT_POLICIES, ensureDefaultPolicies } from "../src/controllers/admin/policy.controller.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pet_supplies";

describe("Admin Policies API (Real Backend & MongoDB)", () => {
  let app;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    await ensureDefaultPolicies();
  });

  afterAll(async () => {
    // Reset modified default policies in the database to canonical values
    for (const item of DEFAULT_POLICIES) {
      await Policy.updateOne(
        { code: item.code },
        {
          $set: {
            title: item.title,
            content: item.content,
            status: item.status,
            effectiveDate: item.effectiveDate,
          },
        }
      );
    }
    // Clean up audit logs created during test
    await AuditLog.deleteMany({ action: "policies.update", "target.id": "POL-RETURN" });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  beforeEach(() => {
    app = createAdminTestApp();
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
    it("returns real store policies from MongoDB", async () => {
      const res = await app.send("GET", "/api/v1/admin/policies");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      const codes = res.body.data.map((p) => p.code);
      expect(codes).toContain("POL-RETURN");
      expect(codes).toContain("POL-CANCEL");
      expect(codes).toContain("POL-REFUND");
      expect(codes).toContain("POL-PRIVACY");

      const returnPolicy = res.body.data.find((p) => p.code === "POL-RETURN");
      expect(returnPolicy).toMatchObject({
        id: "return",
        code: "POL-RETURN",
        title: "Chính sách đổi trả",
        status: "Đã công bố",
      });
      expect(returnPolicy.content).toContain("Điều kiện đổi trả");
    });
  });

  describe("GET /api/v1/admin/policies/:code", () => {
    it("queries and returns real policy from MongoDB by code", async () => {
      const res = await app.send("GET", "/api/v1/admin/policies/POL-RETURN");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe("POL-RETURN");
      expect(res.body.data.title).toBe("Chính sách đổi trả");
      expect(res.body.data.content).toContain("Điều kiện đổi trả");
    });

    it("queries and returns policy by canonical id (case-insensitive)", async () => {
      const res = await app.send("GET", "/api/v1/admin/policies/privacy");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe("POL-PRIVACY");
      expect(res.body.data.title).toBe("Chính sách bảo mật");
    });

    it("returns 404 if policy code not found in MongoDB", async () => {
      const res = await app.send("GET", "/api/v1/admin/policies/POL-NONEXISTENT");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Không tìm thấy");
    });
  });

  describe("PUT /api/v1/admin/policies/:code", () => {
    it("updates policy in MongoDB and records real audit log", async () => {
      const updatePayload = {
        title: "Chính sách đổi trả (Đã cập nhật)",
        content: "Nội dung quy định đổi trả mới trong 14 ngày làm việc từ máy chủ thật.",
        status: "Bản nháp",
        effectiveDate: "20/10/2026",
      };

      const res = await app.send("PUT", "/api/v1/admin/policies/POL-RETURN", updatePayload);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updatePayload.title);
      expect(res.body.data.content).toBe(updatePayload.content);
      expect(res.body.data.status).toBe("Bản nháp");

      // Verify directly from real MongoDB collection `policies`
      const dbDoc = await Policy.findOne({ code: "POL-RETURN" }).lean();
      expect(dbDoc).toBeTruthy();
      expect(dbDoc.title).toBe(updatePayload.title);
      expect(dbDoc.content).toBe(updatePayload.content);
      expect(dbDoc.status).toBe("draft");
      expect(dbDoc.effectiveDate).toBe(updatePayload.effectiveDate);

      // Verify real AuditLog created in MongoDB
      const auditEntry = await AuditLog.findOne({
        action: "policies.update",
        "target.id": "POL-RETURN",
      })
        .sort({ createdAt: -1 })
        .lean();

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.summary).toBe(`Cập nhật chính sách: ${updatePayload.title}`);
      expect(auditEntry.result).toBe("success");
    });

    it("validates maximum length of content (max 20,000 characters)", async () => {
      const res = await app.send("PUT", "/api/v1/admin/policies/POL-RETURN", {
        content: "x".repeat(20001),
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
