import mongoose from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { CustomerVoucher } from "../src/models/customer-voucher.model.js";
import { Promotion } from "../src/models/promotion.model.js";
import { PromotionRedemption } from "../src/models/promotion-redemption.model.js";
import { userRepository } from "../src/models/user.model.js";

const now = new Date("2026-11-15T12:00:00Z");
const claims = {
  uid: "firebase-customer-voucher-test",
  email: "customer-voucher@example.com",
  auth_time: now.getTime() / 1000,
  firebase: { sign_in_provider: "password" },
};

const customerUser = {
  _id: new mongoose.Types.ObjectId("650000000000000000000001"),
  firebaseUid: claims.uid,
  email: claims.email,
  fullName: "Nguyen Van A",
  role: "customer",
};

const promoPercent = {
  _id: new mongoose.Types.ObjectId("650000000000000000000010"),
  code: "PETJOY10",
  name: "Giảm 10% đơn từ 200k",
  type: "percent",
  value: 10,
  maxDiscount: 50000,
  minOrderAmount: 200000,
  startAt: new Date("2026-11-01T00:00:00Z"),
  endAt: new Date("2026-11-30T00:00:00Z"),
  isActive: true,
  usageLimit: 100,
  usedCount: 5,
};

const promoExpired = {
  _id: new mongoose.Types.ObjectId("650000000000000000000020"),
  code: "EXPIRED50",
  name: "Mã hết hạn",
  type: "fixed",
  value: 50000,
  minOrderAmount: 100000,
  startAt: new Date("2026-10-01T00:00:00Z"),
  endAt: new Date("2026-10-31T00:00:00Z"),
  isActive: true,
  usageLimit: 100,
  usedCount: 10,
};

const config = parseEnvironment({ NODE_ENV: "test" });
let admin, app;

afterEach(() => {
  vi.restoreAllMocks();
});

async function authenticatedAgent(target = app) {
  const agent = request.agent(target);
  const sessionName = "petly-session";
  agent.set("Cookie", `${sessionName}=valid-session-cookie`);

  const call = (method, path, body = undefined) => {
    const req = agent[method](`/api/v1/customer/vouchers${path}`)
      .set("Origin", "http://localhost:3000");
    if (method !== "get" && method !== "delete") {
      req.set("Content-Type", "application/json").send(body ?? {});
    }
    return req;
  };

  return { agent, call };
}

describe("Customer Voucher Wallet API (/api/v1/customer/vouchers)", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(now);

    admin = {
      verifySessionCookie: vi.fn().mockResolvedValue(claims),
    };
    vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(admin);
    vi.spyOn(userRepository, "findByUid").mockResolvedValue(customerUser);

    app = createApp(config);
  });

  describe("Authentication Guard", () => {
    it("rejects unauthenticated requests with HTTP 401", async () => {
      const response = await request(app).get("/api/v1/customer/vouchers");
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("POST /api/v1/customer/vouchers (Save Voucher)", () => {
    it("rejects non-existent voucher code with 404", async () => {
      vi.spyOn(Promotion, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const { call } = await authenticatedAgent();
      const res = await call("post", "", { code: "NONEXISTENT" });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("VOUCHER_NOT_FOUND");
    });

    it("saves a valid voucher into wallet successfully (201)", async () => {
      vi.spyOn(Promotion, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(promoPercent),
      });
      vi.spyOn(CustomerVoucher, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      vi.spyOn(PromotionRedemption, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      vi.spyOn(CustomerVoucher, "countDocuments").mockResolvedValue(5);
      vi.spyOn(CustomerVoucher, "create").mockResolvedValue({
        _id: new mongoose.Types.ObjectId("650000000000000000000099"),
        userId: customerUser._id,
        voucherId: promoPercent._id,
        code: promoPercent.code,
        savedAt: now,
      });

      const { call } = await authenticatedAgent();
      const res = await call("post", "", { code: "petjoy10" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe("PETJOY10");
      expect(res.body.data.state).toBe("ready");
    });

    it("handles duplicate save idempotently without error (200)", async () => {
      vi.spyOn(Promotion, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(promoPercent),
      });
      vi.spyOn(CustomerVoucher, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId("650000000000000000000099"),
          userId: customerUser._id,
          voucherId: promoPercent._id,
          code: promoPercent.code,
          savedAt: now,
        }),
      });
      vi.spyOn(PromotionRedemption, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const { call } = await authenticatedAgent();
      const res = await call("post", "", { code: "PETJOY10" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("đã có trong ví");
    });

    it("enforces maximum wallet capacity of 50 active vouchers (400)", async () => {
      vi.spyOn(Promotion, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(promoPercent),
      });
      vi.spyOn(CustomerVoucher, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      vi.spyOn(CustomerVoucher, "countDocuments").mockResolvedValue(50);

      const { call } = await authenticatedAgent();
      const res = await call("post", "", { code: "PETJOY10" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("WALLET_CAPACITY_EXCEEDED");
    });
  });

  describe("DELETE /api/v1/customer/vouchers/:code (Disallowed Unsave)", () => {
    it("rejects unsave requests with 400 VOUCHER_CANNOT_BE_UNSAVED", async () => {
      const { call } = await authenticatedAgent();
      const res = await call("delete", "/PETJOY10");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VOUCHER_CANNOT_BE_UNSAVED");
      expect(res.body.message).toContain("không thể hủy bỏ");
    });
  });

  describe("GET /api/v1/customer/vouchers/ids (Saved Codes List)", () => {
    it("returns array of saved voucher codes", async () => {
      vi.spyOn(CustomerVoucher, "find").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { code: "PETJOY10" },
            { code: "FREESHIP" },
          ]),
        }),
      });

      const { call } = await authenticatedAgent();
      const res = await call("get", "/ids");
      expect(res.status).toBe(200);
      expect(res.body.data.savedCodes).toEqual(["PETJOY10", "FREESHIP"]);
    });
  });

  describe("POST /api/v1/customer/vouchers/sync (Guest Sync)", () => {
    it("bulk upserts guest vouchers into customer account", async () => {
      vi.spyOn(Promotion, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([promoPercent]),
      });
      vi.spyOn(CustomerVoucher, "countDocuments").mockResolvedValue(10);
      vi.spyOn(CustomerVoucher, "updateOne").mockResolvedValue({
        upsertedCount: 1,
      });

      const { call } = await authenticatedAgent();
      const res = await call("post", "/sync", { codes: ["PETJOY10", "OTHER"] });
      expect(res.status).toBe(200);
      expect(res.body.data.syncedCount).toBe(1);
    });
  });

  describe("GET /api/v1/customer/vouchers (List Wallet Vouchers)", () => {
    it("calculates dynamic state correctly: ready, used, expired", async () => {
      const savedVouchers = [
        {
          _id: new mongoose.Types.ObjectId("650000000000000000000101"),
          userId: customerUser._id,
          voucherId: promoPercent,
          code: promoPercent.code,
          savedAt: new Date("2026-11-10T00:00:00Z"),
        },
        {
          _id: new mongoose.Types.ObjectId("650000000000000000000102"),
          userId: customerUser._id,
          voucherId: promoExpired,
          code: promoExpired.code,
          savedAt: new Date("2026-11-10T00:00:00Z"),
        },
      ];

      vi.spyOn(CustomerVoucher, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(savedVouchers),
          }),
        }),
      });

      // No redemptions
      vi.spyOn(PromotionRedemption, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const { call } = await authenticatedAgent();
      const res = await call("get", "?status=all");
      expect(res.status).toBe(200);
      expect(res.body.data.counts.all).toBe(2);
      expect(res.body.data.counts.ready).toBe(1);
      expect(res.body.data.counts.expired).toBe(1);
      expect(res.body.data.items[0].state).toBe("ready");
      expect(res.body.data.items[1].state).toBe("expired");
    });

    it("marks voucher as 'used' when active redemption exists for customer", async () => {
      const savedVouchers = [
        {
          _id: new mongoose.Types.ObjectId("650000000000000000000101"),
          userId: customerUser._id,
          voucherId: promoPercent,
          code: promoPercent.code,
          savedAt: new Date("2026-11-10T00:00:00Z"),
        },
      ];

      vi.spyOn(CustomerVoucher, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(savedVouchers),
          }),
        }),
      });

      // User has redeemed promoPercent
      vi.spyOn(PromotionRedemption, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            promotionId: promoPercent._id,
            customerKey: `user:${customerUser._id}`,
            status: "active",
            createdAt: new Date("2026-11-12T00:00:00Z"),
          },
        ]),
      });

      const { call } = await authenticatedAgent();
      const res = await call("get", "?status=used");
      expect(res.status).toBe(200);
      expect(res.body.data.counts.used).toBe(1);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].state).toBe("used");
    });
  });

  describe("Voucher Lifecycle Transitions (US4)", () => {
    it("transitions state from ready -> used after order placement, and used -> ready after order cancellation", async () => {
      const savedVouchers = [
        {
          _id: new mongoose.Types.ObjectId("650000000000000000000101"),
          userId: customerUser._id,
          voucherId: promoPercent,
          code: promoPercent.code,
          savedAt: new Date("2026-11-10T00:00:00Z"),
        },
      ];

      vi.spyOn(CustomerVoucher, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(savedVouchers),
          }),
        }),
      });

      // 1. Initial state: No redemption -> 'ready'
      const redemptionMock = vi.spyOn(PromotionRedemption, "find");
      redemptionMock.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const { call } = await authenticatedAgent();
      let res = await call("get", "?status=all");
      expect(res.body.data.items[0].state).toBe("ready");

      // 2. Order placed: Active redemption created -> transitions to 'used'
      redemptionMock.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            promotionId: promoPercent._id,
            customerKey: `user:${customerUser._id}`,
            status: "active",
            createdAt: now,
          },
        ]),
      });

      res = await call("get", "?status=all");
      expect(res.body.data.items[0].state).toBe("used");

      // 3. Order cancelled: Redemption released (or no active redemptions) -> returns to 'ready'
      // Note: PromotionRedemption query in controller has { status: 'active' }, so released items aren't returned
      redemptionMock.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      res = await call("get", "?status=all");
      expect(res.body.data.items[0].state).toBe("ready");
    });
  });
});
