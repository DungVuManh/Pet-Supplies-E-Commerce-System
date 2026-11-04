import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { Order } from "../src/models/order.model.js";
import { Payment } from "../src/models/payment.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { User, userRepository } from "../src/models/user.model.js";

const TEST_API_KEY = "test_sepay_secret_key_123";
const orderId = "a".repeat(24);
const staffId = "b".repeat(24);
const productId = "c".repeat(24);

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

describe("SePay VietQR Payment Integration", () => {
  let app;
  let sampleOrder;
  let paymentStore;
  let auth;

  beforeEach(() => {
    paymentStore = [];
    sampleOrder = {
      _id: orderId,
      orderCode: "ORD173000999",
      channel: "online",
      orderStatus: "pending",
      paymentMethod: "ONLINE",
      paymentStatus: "pending",
      total: 200000,
      subtotal: 200000,
      paidAmount: 0,
      needsReview: false,
      paymentExpiredAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
      statusHistory: [],
      guestInfo: { name: "Nguyễn Văn A", phone: "0901234567" },
      items: [{ productId, variantSku: "SKU-1", name: "Thức ăn mèo", qty: 2, unitPrice: 100000 }],
      shippingAddress: {
        recipientName: "Nguyễn Văn A",
        phone: "0901234567",
        province: "TP. Hồ Chí Minh",
        district: "Quận 1",
        ward: "Phường Bến Nghé",
        street: "123 Lê Lợi",
      },
    };

    const config = parseEnvironment({
      NODE_ENV: "test",
      SEPAY_API_KEY: TEST_API_KEY,
      SEPAY_BANK_CODE: "MB",
      SEPAY_ACCOUNT_NUMBER: "0345678999",
      SEPAY_ACCOUNT_HOLDER: "PETLY TEST STORE",
    });
    app = createApp(config);

    // Mock Setting
    vi.spyOn(Setting, "findOne").mockReturnValue({
      lean: async () => ({
        bankCode: "MB",
        accountNumber: "0345678999",
        accountHolder: "PETLY TEST STORE",
      }),
    });

    // Mock Order.findOne
    vi.spyOn(Order, "findOne").mockImplementation((filter) => {
      if (filter.orderCode && filter.orderCode !== sampleOrder.orderCode) {
        return mockQuery(null);
      }
      const doc = {
        ...sampleOrder,
        save: vi.fn().mockImplementation(async function () {
          Object.assign(sampleOrder, this);
          return this;
        }),
      };
      return mockQuery(doc);
    });

    // Mock Order.updateOne
    vi.spyOn(Order, "updateOne").mockImplementation(async (filter, updateDoc) => {
      if (updateDoc.$set) {
        Object.assign(sampleOrder, updateDoc.$set);
      }
      if (updateDoc.$push?.statusHistory) {
        sampleOrder.statusHistory.push(updateDoc.$push.statusHistory);
      }
      return { modifiedCount: 1 };
    });

    // Mock Payment.findOne
    vi.spyOn(Payment, "findOne").mockImplementation((filter) => {
      const match = paymentStore.find((p) => p.transactionRef === filter.transactionRef);
      return mockQuery(match || null);
    });

    // Mock Payment.create
    vi.spyOn(Payment, "create").mockImplementation(async (paymentData) => {
      paymentStore.push(paymentData);
      return paymentData;
    });

    // Mock Firebase & User for staff operations
    auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "staff-uid" }) };
    vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
    vi.spyOn(userRepository, "findByUid").mockResolvedValue({ _id: staffId, role: "staff", fullName: "Nhân viên kho" });
    vi.spyOn(Order, "findById").mockImplementation(() => mockQuery(sampleOrder));
    vi.spyOn(Product, "find").mockReturnValue(mockQuery([{
      _id: productId,
      isActive: true,
      variants: [{ sku: "SKU-1", stock: 10, reservedStock: 1 }],
    }]));
    vi.spyOn(User, "find").mockReturnValue(mockQuery([{ _id: staffId, fullName: "Nhân viên kho" }]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Webhook Authentication & Security (CR-08 & T006)
  // =========================================================================
  describe("Webhook Authentication & Security", () => {
    it("rejects webhook request without Authorization header when API key is set", async () => {
      const response = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .send({
          id: 101,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:00:00",
          accountNumber: "0345678999",
          content: "PETLY ORD173000999",
          transferType: "in",
          transferAmount: 200000,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects webhook request with invalid API key token", async () => {
      const response = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", "Apikey wrong_secret_token")
        .send({
          id: 102,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:00:00",
          accountNumber: "0345678999",
          content: "PETLY ORD173000999",
          transferType: "in",
          transferAmount: 200000,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("accepts webhook request with valid Authorization header", async () => {
      const response = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send({
          id: 103,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:00:00",
          accountNumber: "0345678999",
          content: "PETLY ORD173000999",
          transferType: "in",
          transferAmount: 200000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isPaid).toBe(true);
    });
  });

  // =========================================================================
  // 2. Webhook Processing, Idempotency & Regex (T019, BR-15, BR-16)
  // =========================================================================
  describe("Webhook Processing & Idempotency", () => {
    it("skips out-going transaction (transferType = 'out')", async () => {
      const response = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send({
          id: 104,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:00:00",
          accountNumber: "0345678999",
          content: "Rút tiền PETLY ORD173000999",
          transferType: "out",
          transferAmount: 50000,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Bỏ qua giao dịch tiền ra");
      expect(paymentStore).toHaveLength(0);
    });

    it("handles memo without order code gracefully without error", async () => {
      const response = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send({
          id: 105,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:00:00",
          accountNumber: "0345678999",
          content: "Chuyen tien an trua",
          transferType: "in",
          transferAmount: 50000,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Không trích xuất được mã đơn hàng");
      expect(paymentStore).toHaveLength(0);
    });

    it("verifies idempotency: duplicate webhook with same id is not reprocessed (BR-16)", async () => {
      const payload = {
        id: 2001,
        gateway: "MBBank",
        transactionDate: "2026-11-04 10:00:00",
        accountNumber: "0345678999",
        content: "PETLY ORD173000999",
        transferType: "in",
        transferAmount: 200000,
      };

      // Delivery 1
      const res1 = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send(payload);

      expect(res1.status).toBe(200);
      expect(paymentStore).toHaveLength(1);
      expect(sampleOrder.paymentStatus).toBe("paid");
      expect(sampleOrder.paidAmount).toBe(200000);

      // Delivery 2 (Duplicate / Retry)
      const res2 = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.message).toContain("Idempotent");
      expect(paymentStore).toHaveLength(1); // No new Payment created
      expect(sampleOrder.paidAmount).toBe(200000); // Not incremented again
    });

    it("handles partial payments accumulation until full total is met", async () => {
      // Step 1: Transfer partial 100,000 / 200,000 VND
      const res1 = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send({
          id: 3001,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:00:00",
          accountNumber: "0345678999",
          content: "PETLY ORD173000999 dot 1",
          transferType: "in",
          transferAmount: 100000,
        });

      expect(res1.status).toBe(200);
      expect(sampleOrder.paidAmount).toBe(100000);
      expect(sampleOrder.paymentStatus).toBe("pending"); // Not yet paid

      // Step 2: Transfer remainder 100,000 VND
      const res2 = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send({
          id: 3002,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:05:00",
          accountNumber: "0345678999",
          content: "PETLY ORD173000999 dot 2",
          transferType: "in",
          transferAmount: 100000,
        });

      expect(res2.status).toBe(200);
      expect(sampleOrder.paidAmount).toBe(200000);
      expect(sampleOrder.paymentStatus).toBe("paid"); // Fully paid
    });
  });

  // =========================================================================
  // 3. Excess Transfer & Late After COD (T025, T027, US4)
  // =========================================================================
  describe("Excess & Out-of-order Payments", () => {
    it("flags needsReview = true when customer transfers excess amount", async () => {
      const response = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send({
          id: 4001,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:00:00",
          accountNumber: "0345678999",
          content: "PETLY ORD173000999",
          transferType: "in",
          transferAmount: 300000, // Total is 200,000
        });

      expect(response.status).toBe(200);
      expect(sampleOrder.paidAmount).toBe(300000);
      expect(sampleOrder.paymentStatus).toBe("paid");
      expect(sampleOrder.needsReview).toBe(true);
      expect(response.body.data.needsReview).toBe(true);
    });

    it("flags needsReview = true when transfer arrives after order converted to COD", async () => {
      sampleOrder.paymentMethod = "COD";

      const response = await request(app)
        .post("/api/v1/payments/sepay/webhook")
        .set("Authorization", `Apikey ${TEST_API_KEY}`)
        .send({
          id: 4002,
          gateway: "MBBank",
          transactionDate: "2026-11-04 10:00:00",
          accountNumber: "0345678999",
          content: "PETLY ORD173000999",
          transferType: "in",
          transferAmount: 200000,
        });

      expect(response.status).toBe(200);
      expect(sampleOrder.needsReview).toBe(true);
    });
  });

  // =========================================================================
  // 4. Query Endpoints (Payment Info & Real-time Status Polling)
  // =========================================================================
  describe("Payment Info & Real-Time Status Polling", () => {
    it("returns VietQR payload, URL, and dynamic remaining amount", async () => {
      sampleOrder.paidAmount = 50000;

      const response = await request(app)
        .get(`/api/v1/payments/sepay/info/${sampleOrder.orderCode}`);

      expect(response.status).toBe(200);
      expect(response.body.data.orderCode).toBe(sampleOrder.orderCode);
      expect(response.body.data.total).toBe(200000);
      expect(response.body.data.paidAmount).toBe(50000);
      expect(response.body.data.remainingAmount).toBe(150000);
      expect(response.body.data.bankCode).toBe("MB");
      expect(response.body.data.qrUrl).toContain("qr.sepay.vn");
      expect(response.body.data.qrPayload).toContain("vietqr://");
      expect(response.body.data.isPaid).toBe(false);
    });

    it("polls payment status for real-time frontend sync", async () => {
      sampleOrder.paymentStatus = "paid";
      sampleOrder.paidAmount = 200000;

      const response = await request(app)
        .get(`/api/v1/payments/status/${sampleOrder.orderCode}`);

      expect(response.status).toBe(200);
      expect(response.body.data.paymentStatus).toBe("paid");
      expect(response.body.data.isPaid).toBe(true);
      expect(response.body.data.remainingAmount).toBe(0);
    });

    it("returns 404 for unknown order code", async () => {
      const response = await request(app)
        .get("/api/v1/payments/status/UNKNOWN_ORDER_CODE");

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
    });
  });

  // =========================================================================
  // 5. Session Renewal & COD Conversion (T020, T021, T023, US3)
  // =========================================================================
  describe("Session Renewal & COD Conversion", () => {
    it("extends payment session expiration time by 15 minutes", async () => {
      const response = await request(app)
        .post(`/api/v1/payments/renew-session/${sampleOrder.orderCode}`);

      expect(response.status).toBe(200);
      expect(response.body.data.secondsLeft).toBe(900);
      expect(new Date(sampleOrder.paymentExpiredAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("rejects session renewal if order is already paid", async () => {
      sampleOrder.paymentStatus = "paid";

      const response = await request(app)
        .post(`/api/v1/payments/renew-session/${sampleOrder.orderCode}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("ORDER_ALREADY_PAID");
    });

    it("converts payment method to COD when QR expires", async () => {
      const response = await request(app)
        .post(`/api/v1/payments/convert-to-cod/${sampleOrder.orderCode}`);

      expect(response.status).toBe(200);
      expect(sampleOrder.paymentMethod).toBe("COD");
      expect(sampleOrder.paymentStatus).toBe("unpaid");
    });

    it("rejects COD conversion if order is already paid", async () => {
      sampleOrder.paymentStatus = "paid";

      const response = await request(app)
        .post(`/api/v1/payments/convert-to-cod/${sampleOrder.orderCode}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("ORDER_ALREADY_PAID");
    });
  });

  // =========================================================================
  // 6. Business Rule BR-18: Staff Order Confirmation Guard (T024, T027, US4)
  // =========================================================================
  describe("BR-18: Staff Order Confirmation Guard", () => {
    async function getStaffAgent() {
      const agent = request.agent(app);
      const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
      const cookie = `petly-session=test; ${csrf.headers["set-cookie"][0].split(";")[0]}`;
      const sendStatus = (body = { expectedStatus: "pending", orderStatus: "confirmed" }) =>
        agent
          .patch(`/api/v1/staff/orders/${sampleOrder._id}/status`)
          .set("Cookie", cookie)
          .set("Origin", "http://localhost:3000")
          .set("X-CSRF-Token", csrf.body.data.csrfToken)
          .send(body);
      return { sendStatus };
    }

    it("strictly blocks staff from confirming online order when paymentStatus is not 'paid' (BR-18)", async () => {
      sampleOrder.paymentMethod = "ONLINE";
      sampleOrder.paymentStatus = "pending";

      const { sendStatus } = await getStaffAgent();
      const response = await sendStatus();

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("PAYMENT_NOT_VERIFIED");
    });

    it("allows staff to confirm online order once paymentStatus is 'paid'", async () => {
      sampleOrder.paymentMethod = "ONLINE";
      sampleOrder.paymentStatus = "paid";

      vi.spyOn(Order, "updateOne").mockResolvedValue({ modifiedCount: 1 });

      const { sendStatus } = await getStaffAgent();
      const response = await sendStatus();

      expect(response.status).toBe(200);
      expect(response.body.data.order.orderStatus).toBe("confirmed");
    });
  });
});
