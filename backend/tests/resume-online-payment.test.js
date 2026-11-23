import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { userRepository } from "../src/models/user.model.js";

const orderId = "a".repeat(24);
const customerId = "b".repeat(24);
const otherCustomerId = "c".repeat(24);
const staffId = "d".repeat(24);
const productId = "e".repeat(24);

function mockQuery(doc) {
  return {
    select() {
      return this;
    },
    lean() {
      return Promise.resolve(doc);
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(doc).then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return Promise.resolve(doc).catch(onRejected);
    },
  };
}

describe("Customer Resume Online Payment (/api/v1/orders/:id/payment)", () => {
  let app;
  let sampleOrder;
  let currentUser;
  let settingDoc;
  let updateSpy;

  beforeEach(() => {
    currentUser = {
      _id: customerId,
      role: "customer",
      fullName: "Nguyen Van Khach",
    };

    settingDoc = {
      _id: "global",
      bankCode: "MB",
      accountNumber: "0987654321",
      accountHolder: "PETJOY STORE",
    };

    sampleOrder = {
      _id: orderId,
      orderCode: "ORD261112001",
      customerId,
      channel: "online",
      creationState: "complete",
      orderStatus: "pending",
      paymentMethod: "ONLINE",
      paymentStatus: "unpaid",
      subtotal: 500000,
      discount: 50000,
      shippingFee: 0,
      total: 450000,
      paidAmount: 0,
      needsReview: false,
      paymentExpiredAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      items: [
        {
          productId,
          variantSku: "DOG-FOOD-1",
          name: "Hat cho cho",
          unitPrice: 250000,
          qty: 2,
        },
      ],
      shippingAddress: {
        recipientName: "Nguyen Van Khach",
        phone: "0901234567",
        province: "TP. Ho Chi Minh",
        district: "Quan 1",
        ward: "Ben Nghe",
        street: "12 Le Loi",
      },
      statusHistory: [{ to: "pending", at: new Date() }],
    };

    app = createApp(parseEnvironment({ NODE_ENV: "test" }));

    vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue({
      verifySessionCookie: vi.fn().mockResolvedValue({ uid: "firebase-user-1" }),
    });
    vi.spyOn(userRepository, "findByUid").mockImplementation(async () => currentUser);
    vi.spyOn(Setting, "findOne").mockImplementation(() => mockQuery(settingDoc));
    vi.spyOn(Product, "find").mockReturnValue(mockQuery([]));

    vi.spyOn(Order, "findById").mockImplementation((id) =>
      mockQuery(String(id) === String(sampleOrder._id) ? sampleOrder : null)
    );

    vi.spyOn(Order, "findOne").mockImplementation((filter = {}) => {
      const idMatches =
        !filter._id || String(filter._id) === String(sampleOrder._id);
      const codeMatches =
        !filter.orderCode || filter.orderCode === sampleOrder.orderCode;
      const ownerMatches =
        !filter.customerId ||
        String(filter.customerId) === String(sampleOrder.customerId);
      const creationMatches =
        !filter.creationState?.$ne ||
        sampleOrder.creationState !== filter.creationState.$ne;

      return mockQuery(
        idMatches && codeMatches && ownerMatches && creationMatches
          ? sampleOrder
          : null
      );
    });

    updateSpy = vi
      .spyOn(Order, "updateOne")
      .mockImplementation(async (filter, operation, options) => {
        expect(options).toEqual({ runValidators: true });
        const matches =
          String(filter._id) === String(sampleOrder._id) &&
          String(filter.customerId) === String(sampleOrder.customerId) &&
          filter.channel === sampleOrder.channel &&
          filter.paymentMethod === sampleOrder.paymentMethod &&
          sampleOrder.paymentStatus !== filter.paymentStatus?.$ne &&
          sampleOrder.orderStatus !== filter.orderStatus?.$ne &&
          sampleOrder.creationState !== filter.creationState?.$ne;

        if (!matches) {
          return { modifiedCount: 0 };
        }
        Object.assign(sampleOrder, operation.$set);
        return { modifiedCount: 1 };
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function authenticatedAgent() {
    const agent = request.agent(app);
    const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
    const cookie = `petly-session=valid; ${csrf.headers["set-cookie"][0].split(";")[0]}`;
    const csrfToken = csrf.body.data.csrfToken;
    return {
      cookie,
      get: (path) => agent.get(path).set("Cookie", cookie),
      post: (path, body = {}, headers = {}) =>
        agent
          .post(path)
          .set("Cookie", cookie)
          .set("Origin", "http://localhost:3000")
          .set("X-CSRF-Token", csrfToken)
          .set(headers)
          .send(body),
    };
  }

  describe("Order detail payment metadata (GET /api/v1/orders/:id)", () => {
    it("exposes accurate ONLINE payment fields and canResumeOnlinePayment = true when unpaid", async () => {
      const client = await authenticatedAgent();
      const res = await client.get(`/api/v1/orders/${orderId}`).expect(200);

      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.body.data.order).toMatchObject({
        id: orderId,
        orderCode: "ORD261112001",
        orderStatus: "pending",
        paymentMethod: "ONLINE",
        paymentMethodLabel: "Chuyển khoản trực tuyến (VietQR)",
        paymentStatus: "Chờ thanh toán",
        paymentStatusCode: "unpaid",
        paidAmount: 0,
        remainingAmount: 450000,
        canResumeOnlinePayment: true,
      });
    });

    it("surfaces partial payment progress accurately for partially paid ONLINE orders", async () => {
      sampleOrder.paymentStatus = "pending";
      sampleOrder.paidAmount = 150000;

      const client = await authenticatedAgent();
      const res = await client.get(`/api/v1/orders/${orderId}`).expect(200);

      expect(res.body.data.order).toMatchObject({
        paymentStatus: "Thanh toán một phần",
        paymentStatusCode: "pending",
        paidAmount: 150000,
        remainingAmount: 300000,
        canResumeOnlinePayment: true,
      });
    });

    it("sets canResumeOnlinePayment = false for paid, COD, cancelled, and offline orders", async () => {
      const client = await authenticatedAgent();

      for (const patch of [
        { paymentStatus: "paid", paidAmount: 450000 },
        { paymentMethod: "COD", paymentStatus: "unpaid" },
        { orderStatus: "cancelled" },
        { channel: "offline", paymentMethod: "ONLINE", paymentStatus: "unpaid" },
      ]) {
        Object.assign(sampleOrder, {
          channel: "online",
          orderStatus: "pending",
          paymentMethod: "ONLINE",
          paymentStatus: "unpaid",
          paidAmount: 0,
        }, patch);

        const res = await client.get(`/api/v1/orders/${orderId}`).expect(200);
        expect(res.body.data.order.canResumeOnlinePayment).toBe(false);
      }
    });
  });

  describe("Payment Session & Partial Payments (GET /api/v1/orders/:id/payment)", () => {
    it("returns active VietQR session with remaining countdown for eligible ONLINE orders", async () => {
      const client = await authenticatedAgent();
      const res = await client.get(`/api/v1/orders/${orderId}/payment`).expect(200);

      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.body.data.session).toMatchObject({
        orderId,
        orderCode: "ORD261112001",
        eligible: true,
        state: "eligible",
        message: null,
        total: 450000,
        paidAmount: 0,
        remainingAmount: 450000,
      });
      expect(res.body.data.session.paymentInfo.memo).toBe("PETJOY ORD261112001");
      expect(res.body.data.session.paymentInfo.qrUrl).toContain("amount=450000");
      expect(res.body.data.session.paymentInfo.isExpired).toBe(false);
      expect(res.body.data.session.paymentInfo.secondsLeft).toBeGreaterThan(0);
      expect(res.body.data.session.paymentInfo.secondsLeft).toBeLessThanOrEqual(600);
    });

    it("generates QR for exact remainingAmount on partially paid orders", async () => {
      sampleOrder.paymentStatus = "pending";
      sampleOrder.paidAmount = 200000;

      const client = await authenticatedAgent();
      const res = await client.get(`/api/v1/orders/${orderId}/payment`).expect(200);

      expect(res.body.data.session).toMatchObject({
        eligible: true,
        state: "eligible",
        paidAmount: 200000,
        remainingAmount: 250000,
      });
      expect(res.body.data.session.paymentInfo.qrUrl).toContain("amount=250000");
    });

    it("keeps expired QR state (Q3: A) instead of auto-renewing when 15m elapsed", async () => {
      sampleOrder.paymentExpiredAt = new Date(Date.now() - 60 * 1000);

      const client = await authenticatedAgent();
      const res = await client.get(`/api/v1/orders/${orderId}/payment`).expect(200);

      expect(res.body.data.session.state).toBe("eligible");
      expect(res.body.data.session.paymentInfo.isExpired).toBe(true);
      expect(res.body.data.session.paymentInfo.secondsLeft).toBe(0);
    });

    it("returns structured non-eligible state with null paymentInfo for paid, cancelled, COD, and offline orders", async () => {
      const client = await authenticatedAgent();

      sampleOrder.paymentStatus = "paid";
      let res = await client.get(`/api/v1/orders/${orderId}/payment`).expect(200);
      expect(res.body.data.session).toMatchObject({
        eligible: false,
        state: "already_paid",
        paymentInfo: null,
      });

      sampleOrder.paymentStatus = "unpaid";
      sampleOrder.orderStatus = "cancelled";
      res = await client.get(`/api/v1/orders/${orderId}/payment`).expect(200);
      expect(res.body.data.session).toMatchObject({
        eligible: false,
        state: "cancelled",
        paymentInfo: null,
      });

      sampleOrder.orderStatus = "pending";
      sampleOrder.paymentMethod = "COD";
      res = await client.get(`/api/v1/orders/${orderId}/payment`).expect(200);
      expect(res.body.data.session).toMatchObject({
        eligible: false,
        state: "not_online",
        paymentInfo: null,
      });
    });
  });

  describe("Authorization, Ownership & CSRF Guards", () => {
    it("enforces customer authentication, exact role, ownership hiding (404), and CSRF", async () => {
      // 401 when unauthenticated
      await request(app).get(`/api/v1/orders/${orderId}/payment`).expect(401);
      await request(app).post(`/api/v1/orders/${orderId}/payment/renew`).send({}).expect(401);

      const client = await authenticatedAgent();

      // 403 for non-customer roles (staff / admin)
      for (const role of ["staff", "admin"]) {
        currentUser = { _id: staffId, role, fullName: "Operator" };
        await client.get(`/api/v1/orders/${orderId}/payment`).expect(403);
        await client.post(`/api/v1/orders/${orderId}/payment/renew`).expect(403);
      }

      // 404 for another customer (never reveals existence)
      currentUser = { _id: otherCustomerId, role: "customer", fullName: "Other" };
      const otherGet = await client.get(`/api/v1/orders/${orderId}/payment`).expect(404);
      expect(otherGet.body.error.code).toBe("ORDER_NOT_FOUND");
      await client.post(`/api/v1/orders/${orderId}/payment/convert-to-cod`).expect(404);
      expect(updateSpy).not.toHaveBeenCalled();

      // 404 when creationState === "pending"
      currentUser = { _id: customerId, role: "customer", fullName: "Owner" };
      sampleOrder.creationState = "pending";
      await client.get(`/api/v1/orders/${orderId}/payment`).expect(404);

      // 400 on malformed ObjectId
      await client.get("/api/v1/orders/not-an-objectid/payment").expect(400);

      // 403 when CSRF header missing on mutation
      sampleOrder.creationState = "complete";
      await request(app)
        .post(`/api/v1/orders/${orderId}/payment/renew`)
        .set("Cookie", client.cookie)
        .send({})
        .expect(403);
    });
  });

  describe("Renew Session & Convert to COD Mutations", () => {
    it("extends paymentExpiredAt by 15 minutes for expired eligible order", async () => {
      sampleOrder.paymentExpiredAt = new Date(Date.now() - 10 * 60 * 1000);
      const client = await authenticatedAgent();

      const res = await client
        .post(`/api/v1/orders/${orderId}/payment/renew`)
        .expect(200);

      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.body.data.orderId).toBe(orderId);
      expect(res.body.data.secondsLeft).toBe(900);
      expect(new Date(sampleOrder.paymentExpiredAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("converts eligible unpaid order to COD cleanly and flags needsReview if partially paid", async () => {
      sampleOrder.paidAmount = 100000;
      sampleOrder.paymentStatus = "pending";
      const client = await authenticatedAgent();

      const res = await client
        .post(`/api/v1/orders/${orderId}/payment/convert-to-cod`)
        .expect(200);

      expect(res.body.data).toMatchObject({
        orderId,
        paymentMethod: "COD",
        paymentStatus: "unpaid",
      });
      expect(sampleOrder.paymentMethod).toBe("COD");
      expect(sampleOrder.paymentStatus).toBe("unpaid");
      expect(sampleOrder.needsReview).toBe(true);
    });

    it("rejects renew & convert-to-cod on cancelled, paid, or COD orders and handles concurrent race cleanly", async () => {
      const client = await authenticatedAgent();

      sampleOrder.orderStatus = "cancelled";
      expect(
        (await client.post(`/api/v1/orders/${orderId}/payment/renew`).expect(409)).body
          .error.code
      ).toBe("ORDER_CANCELLED");

      sampleOrder.orderStatus = "pending";
      sampleOrder.paymentStatus = "paid";
      expect(
        (
          await client
            .post(`/api/v1/orders/${orderId}/payment/convert-to-cod`)
            .expect(409)
        ).body.error.code
      ).toBe("ORDER_ALREADY_PAID");

      // Race condition: order becomes paid between read and atomic updateOne
      sampleOrder.paymentStatus = "unpaid";
      updateSpy.mockImplementationOnce(async () => {
        sampleOrder.paymentStatus = "paid";
        return { modifiedCount: 0 };
      });
      const raceRes = await client
        .post(`/api/v1/orders/${orderId}/payment/convert-to-cod`)
        .expect(409);
      expect(raceRes.body.error.code).toBe("ORDER_ALREADY_PAID");
      expect(sampleOrder.paymentMethod).toBe("ONLINE");
    });
  });

  describe("Hardened public SePay endpoints (payment.controller.js)", () => {
    it("blocks cancelled and non-ONLINE orders in GET /sepay/info, POST /renew-session, and POST /convert-to-cod", async () => {
      sampleOrder.orderStatus = "cancelled";
      expect(
        (await request(app).get(`/api/v1/payments/sepay/info/${sampleOrder.orderCode}`).expect(409))
          .body.error.code
      ).toBe("ORDER_CANCELLED");
      expect(
        (await request(app).post(`/api/v1/payments/renew-session/${sampleOrder.orderCode}`).expect(409))
          .body.error.code
      ).toBe("ORDER_CANCELLED");

      sampleOrder.orderStatus = "pending";
      sampleOrder.paymentMethod = "COD";
      expect(
        (await request(app).get(`/api/v1/payments/sepay/info/${sampleOrder.orderCode}`).expect(409))
          .body.error.code
      ).toBe("PAYMENT_METHOD_NOT_ONLINE");
      expect(
        (await request(app).post(`/api/v1/payments/convert-to-cod/${sampleOrder.orderCode}`).expect(409))
          .body.error.code
      ).toBe("PAYMENT_METHOD_NOT_ONLINE");
    });
  });
});

