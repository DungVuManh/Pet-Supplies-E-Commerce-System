import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Policy } from "../src/models/policy.model.js";
import { DEFAULT_POLICIES, ensureDefaultPolicies } from "../src/controllers/admin/policy.controller.js";
import { createAdminTestApp } from "./helpers/admin-app.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pet_supplies";

describe("Public Store Policies API (Guest & Customer Flow)", () => {
  let app;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    await ensureDefaultPolicies();
    app = createAdminTestApp();
  });

  afterAll(async () => {
    // Restore all default policies in database to published state and canonical contents
    for (const item of DEFAULT_POLICIES) {
      await Policy.updateOne(
        { code: item.code },
        {
          $set: {
            title: item.title,
            content: item.content,
            status: "published",
            effectiveDate: item.effectiveDate,
            slug: item.slug,
          },
        }
      );
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe("GET /api/v1/policies (Guest listing)", () => {
    it("allows unauthenticated guests to list all published policies", async () => {
      app.session.role = null;
      const res = await app.send("GET", "/api/v1/policies");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      const codes = res.body.data.map((p) => p.code);
      expect(codes).toContain("POL-RETURN");
      expect(codes).toContain("POL-CANCEL");
      expect(codes).toContain("POL-REFUND");
      expect(codes).toContain("POL-PRIVACY");

      // Verify public data structure
      const returnPolicy = res.body.data.find((p) => p.code === "POL-RETURN");
      expect(returnPolicy).toMatchObject({
        code: "POL-RETURN",
        id: "return",
        slug: "chinh-sach-doi-tra-hang",
        title: "Chính sách đổi trả",
        status: "published",
      });
      expect(returnPolicy.content).toContain("Điều kiện đổi trả");
    });
  });

  describe("GET /api/v1/policies/:slug (Guest detail view)", () => {
    it("allows guest to view policy by slug", async () => {
      app.session.role = null;
      const res = await app.send("GET", "/api/v1/policies/chinh-sach-doi-tra-hang");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe("chinh-sach-doi-tra-hang");
      expect(res.body.data.code).toBe("POL-RETURN");
      expect(res.body.data.title).toBe("Chính sách đổi trả");
      expect(res.body.data.content).toContain("Điều kiện đổi trả");
    });

    it("allows guest to view policy by code or id", async () => {
      app.session.role = null;
      const byCode = await app.send("GET", "/api/v1/policies/POL-PRIVACY");
      expect(byCode.status).toBe(200);
      expect(byCode.body.data.code).toBe("POL-PRIVACY");

      const byId = await app.send("GET", "/api/v1/policies/privacy");
      expect(byId.status).toBe(200);
      expect(byId.body.data.id).toBe("privacy");
    });

    it("returns 404 for non-existent policy", async () => {
      app.session.role = null;
      const res = await app.send("GET", "/api/v1/policies/chinh-sach-khong-ton-tai");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("End-to-end Save & Publish Flow (Admin saves -> Guest sees update)", () => {
    it("updates policy as admin, sets draft -> guest cannot see; sets published -> guest sees new content", async () => {
      // 1. Admin updates policy to 'draft' (Bản nháp)
      app.session.role = "admin";
      const draftRes = await app.send("PUT", "/api/v1/admin/policies/POL-RETURN", {
        title: "Chính sách đổi trả (Đang cập nhật)",
        content: "Nội dung đang trong quá trình soạn thảo và chưa công bố.",
        status: "Bản nháp",
        effectiveDate: "01/11/2026",
      });
      expect(draftRes.status).toBe(200);

      // 2. Guest attempts to view draft policy -> receives 404 (not published)
      app.session.role = null;
      const guestDraftRes = await app.send("GET", "/api/v1/policies/chinh-sach-doi-tra-hang");
      expect(guestDraftRes.status).toBe(404);
      expect(guestDraftRes.body.message).toContain("chưa được công bố");

      // 3. Draft policy is excluded from guest list
      const guestListDraft = await app.send("GET", "/api/v1/policies");
      expect(guestListDraft.body.data.some((p) => p.code === "POL-RETURN")).toBe(false);

      // 4. Admin saves & publishes the policy ("Đã công bố")
      app.session.role = "admin";
      const publishedRes = await app.send("PUT", "/api/v1/admin/policies/POL-RETURN", {
        title: "Chính sách đổi trả chính thức 2026",
        content: "1. Quy định đổi trả mới\nKhách hàng được đổi trả miễn phí trong 14 ngày làm việc.",
        status: "Đã công bố",
        effectiveDate: "15/11/2026",
      });
      expect(publishedRes.status).toBe(200);

      // 5. Guest immediately views the published policy with new content!
      app.session.role = null;
      const guestPublishedRes = await app.send("GET", "/api/v1/policies/chinh-sach-doi-tra-hang");
      expect(guestPublishedRes.status).toBe(200);
      expect(guestPublishedRes.body.success).toBe(true);
      expect(guestPublishedRes.body.data.title).toBe("Chính sách đổi trả chính thức 2026");
      expect(guestPublishedRes.body.data.content).toContain("Khách hàng được đổi trả miễn phí trong 14 ngày làm việc.");
      expect(guestPublishedRes.body.data.effectiveDate).toBe("15/11/2026");

      // 6. Guest list now includes the newly published policy
      const guestListPublished = await app.send("GET", "/api/v1/policies");
      expect(guestListPublished.body.data.some((p) => p.code === "POL-RETURN")).toBe(true);
    });
  });
});
