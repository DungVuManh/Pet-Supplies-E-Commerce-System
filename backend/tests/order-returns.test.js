import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository } from "../src/models/user.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import * as cloudinaryUpload from "../src/common/cloudinary-upload.js";
import { isShippingOrderOverdue } from "../src/common/order-auto-complete.js";

const orderId = "a".repeat(24);
const customerId = "b".repeat(24);
const otherCustomerId = "c".repeat(24);
const staffId = "d".repeat(24);
const productId = "e".repeat(24);

const chain = (value) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  populate() {
    return this;
  },
  lean: async () => value,
});

let app;
let order;
let currentRole;
let currentUserId;
let auth;

beforeEach(() => {
  app = createApp(parseEnvironment({ NODE_ENV: "test" }));
  currentRole = "customer";
  currentUserId = customerId;

  order = {
    _id: orderId,
    orderCode: "ORD-123456",
    customerId,
    channel: "online",
    orderStatus: "shipping",
    creationState: "complete",
    paymentMethod: "ONLINE",
    paymentStatus: "paid",
    total: 250000,
    subtotal: 250000,
    shippingFee: 0,
    discount: 0,
    shippingAddress: {
      recipientName: "Nguyễn Văn A",
      phone: "0901234567",
      province: "TP.HCM",
      district: "Q1",
      ward: "P1",
      street: "1 Lê Lợi",
    },
    items: [
      {
        productId,
        variantSku: "SKU-DOG-01",
        name: "Thức ăn hạt cho chó",
        unitPrice: 125000,
        qty: 2,
        totalPrice: 250000,
      },
    ],
    statusHistory: [],
    createdAt: new Date(),
  };

  auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "user-test" }) };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({
    _id: currentUserId,
    role: currentRole,
    fullName: currentRole === "customer" ? "Nguyễn Văn A" : "Nhân viên B",
    email: `${currentRole}@petjoy.vn`,
  }));

  vi.spyOn(Order, "findById").mockImplementation(() => chain(order));
  vi.spyOn(Order, "findOne").mockImplementation((filter) => {
    if (filter._id && String(filter._id) !== orderId) return chain(null);
    if (filter.customerId && String(filter.customerId) !== String(order.customerId)) return chain(null);
    return chain(order);
  });
  vi.spyOn(Product, "find").mockImplementation(() =>
    chain([
      {
        _id: productId,
        isActive: true,
        variants: [{ sku: "SKU-DOG-01", stock: 10, reservedStock: 0 }],
      },
    ])
  );
  vi.spyOn(Product, "updateOne").mockResolvedValue({ modifiedCount: 1 });
  vi.spyOn(AuditLog, "create").mockResolvedValue({ _id: "audit-1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function makeBrowser(role = "customer", userId = customerId) {
  currentRole = role;
  currentUserId = userId;
  const agent = request.agent(app);
  const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
  const cookie = `petly-session=test; ${csrf.headers["set-cookie"][0].split(";")[0]}`;
  const csrfToken = csrf.body.data.csrfToken;
  return { agent, cookie, csrfToken };
}

describe("Order Returns Feature", () => {
  describe("Customer Return Image Upload (POST /api/v1/orders/:id/return/upload)", () => {
    it("rejects unauthenticated requests with 401", async () => {
      await request(app)
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .expect(401);
    });

    it("rejects staff role with 403 FORBIDDEN", async () => {
      const { agent, cookie, csrfToken } = await makeBrowser("staff", staffId);
      await agent
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .attach("images", Buffer.from("fake-image"), "test.jpg")
        .expect(403);
    });

    it("rejects non-multipart requests with 415 UNSUPPORTED_MEDIA_TYPE", async () => {
      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      await agent
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .type("json")
        .send({})
        .expect(415);
    });

    it("rejects upload when order does not belong to customer with 404", async () => {
      const { agent, cookie, csrfToken } = await makeBrowser("customer", otherCustomerId);
      await agent
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .attach("images", Buffer.from("fake-image"), "test.jpg")
        .expect(404);
    });

    it("rejects upload when order is not in shipping status with 400", async () => {
      order.orderStatus = "completed";
      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .attach("images", Buffer.from("fake-image"), "test.jpg")
        .expect(400);

      expect(res.body.error.code).toBe("INVALID_ORDER_STATUS");
    });

    it("rejects upload when order already has a return request with 409", async () => {
      order.returnRequest = { status: "pending" };
      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .attach("images", Buffer.from("fake-image"), "test.jpg")
        .expect(409);

      expect(res.body.error.code).toBe("DUPLICATE_RETURN_REQUEST");
    });

    it("rejects upload without any files with 400", async () => {
      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .field("dummy", "1")
        .expect(400);

      expect(res.body.error.code).toBe("NO_FILES");
    });

    it("rejects invalid MIME type with 400", async () => {
      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .attach("images", Buffer.from("plain-text-data"), {
          filename: "test.txt",
          contentType: "text/plain",
        })
        .expect(400);

      expect(res.body.error.code).toBe("INVALID_FILE_TYPE");
    });

    it("uploads valid images to Cloudinary and returns URLs", async () => {
      vi.spyOn(cloudinaryUpload, "uploadImageBuffersToCloudinary").mockResolvedValue([
        "https://res.cloudinary.com/petjoy/image/upload/v1/petjoy/returns/img1.jpg",
      ]);

      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return/upload`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .attach("images", Buffer.from("fake-jpg-binary"), {
          filename: "damage.jpg",
          contentType: "image/jpeg",
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.urls).toEqual([
        "https://res.cloudinary.com/petjoy/image/upload/v1/petjoy/returns/img1.jpg",
      ]);
    });
  });

  describe("Customer Return Submission (POST /api/v1/orders/:id/return)", () => {
    const validBankAccount = {
      bankName: "Vietcombank",
      accountNumber: "1234567890",
      accountHolder: "NGUYEN VAN A",
    };

    it("rejects return submission without bank account with 400", async () => {
      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({
          reason: "damaged_or_missing",
          description: "Sản phẩm bị vỡ và thiếu phụ kiện",
          images: ["https://res.cloudinary.com/petjoy/image/upload/v1/petjoy/returns/torn.png"],
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("enforces Q1: A image requirement - rejects damaged_or_defective without images", async () => {
      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({
          reason: "damaged_or_defective",
          bankAccount: validBankAccount,
          description: "Hàng bị bể vỡ khi vận chuyển đến nơi",
          images: [],
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.message).toContain("hình ảnh minh chứng");
    });

    it("enforces image requirement - rejects damaged_or_missing without images", async () => {
      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({
          reason: "damaged_or_missing",
          bankAccount: validBankAccount,
          description: "Sản phẩm bị nứt và thiếu quà tặng kèm",
          images: [],
        })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.message).toContain("hình ảnh minh chứng");
    });

    it("allows not_received reason without images", async () => {
      vi.spyOn(Order, "updateOne").mockResolvedValue({ modifiedCount: 1 });

      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({
          reason: "not_received",
          bankAccount: validBankAccount,
          description: "Đơn hàng báo giao thành công nhưng tôi chưa nhận được",
          images: [],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.returnRequest.reason).toBe("not_received");
      expect(res.body.data.returnRequest.bankAccount.bankName).toBe("Vietcombank");
      expect(res.body.data.returnRequest.status).toBe("pending");
    });

    it("submits valid return request with merged reason and Cloudinary images", async () => {
      vi.spyOn(Order, "updateOne").mockResolvedValue({ modifiedCount: 1 });

      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({
          reason: "damaged_or_missing",
          bankAccount: validBankAccount,
          description: "Túi thức ăn hạt bị rách bao bì và rơi vãi",
          images: ["https://res.cloudinary.com/petjoy/image/upload/v1/petjoy/returns/torn.png"],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.returnRequest.reason).toBe("damaged_or_missing");
      expect(res.body.data.returnRequest.bankAccount.accountNumber).toBe("1234567890");
      expect(res.body.data.returnRequest.status).toBe("pending");
      expect(res.body.data.returnRequest.refundRequired).toBe(false);
    });

    it("rejects duplicate return submission with 409 DUPLICATE_RETURN_REQUEST", async () => {
      vi.spyOn(Order, "updateOne").mockResolvedValue({ modifiedCount: 0 });
      order.returnRequest = { status: "pending" };

      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .post(`/api/v1/orders/${orderId}/return`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({
          reason: "not_received",
          bankAccount: validBankAccount,
          description: "Đơn hàng báo giao thành công nhưng tôi chưa nhận được",
          images: [],
        })
        .expect(409);

      expect(res.body.error.code).toBe("DUPLICATE_RETURN_REQUEST");
    });
  });

  describe("Receipt Confirmation Guard with Return Request", () => {
    it("blocks customer confirmation when return request is pending", async () => {
      order.returnRequest = { status: "pending" };

      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .patch(`/api/v1/orders/${orderId}/receipt-confirmation`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({})
        .expect(409);

      expect(res.body.error.code).toBe("RETURN_REQUEST_ACTIVE");
    });

    it("allows customer confirmation after return request was rejected", async () => {
      order.returnRequest = { status: "rejected", rejectionReason: "Không đủ bằng chứng" };
      vi.spyOn(Order, "updateOne").mockResolvedValue({ modifiedCount: 1 });

      const { agent, cookie, csrfToken } = await makeBrowser("customer", customerId);
      const res = await agent
        .patch(`/api/v1/orders/${orderId}/receipt-confirmation`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderStatus).toBe("completed");
    });
  });

  describe("Staff Returns Management (GET /staff/returns & GET /staff/returns/:id)", () => {
    it("refuses GET /staff/returns to customer role with 403", async () => {
      const { agent, cookie } = await makeBrowser("customer", customerId);
      await agent.get("/api/v1/staff/returns").set("Cookie", cookie).expect(403);
    });

    it("returns paginated list and tab counts for staff", async () => {
      order.returnRequest = {
        reason: "damaged_or_defective",
        description: "Hàng bể vỡ",
        images: ["https://res.cloudinary.com/petjoy/image/upload/v1/petjoy/returns/box.jpg"],
        status: "pending",
        requestedAt: new Date(),
      };

      vi.spyOn(Order, "countDocuments").mockResolvedValue(1);
      vi.spyOn(Order, "find").mockImplementation(() => chain([order]));
      vi.spyOn(Order, "aggregate").mockResolvedValue([{ _id: "pending", count: 1 }]);

      const { agent, cookie } = await makeBrowser("staff", staffId);
      const res = await agent
        .get("/api/v1/staff/returns?status=all")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.counts.pending).toBe(1);
      expect(res.body.data.counts.all).toBe(1);
    });

    it("returns staff return detail with products and proof images", async () => {
      order.returnRequest = {
        reason: "damaged_or_defective",
        description: "Hàng bể vỡ",
        images: ["https://res.cloudinary.com/petjoy/image/upload/v1/petjoy/returns/box.jpg"],
        status: "pending",
        requestedAt: new Date(),
      };

      const { agent, cookie } = await makeBrowser("staff", staffId);
      const res = await agent
        .get(`/api/v1/staff/returns/${orderId}`)
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orderCode).toBe("ORD-123456");
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.returnRequest.images).toHaveLength(1);
    });
  });

  describe("Staff Return Decision (POST /staff/returns/:id/decision)", () => {
    it("approves return: sets status returned, restocks items, flags refund for online paid", async () => {
      order.returnRequest = { status: "pending" };
      order.paymentMethod = "ONLINE";
      order.paymentStatus = "paid";

      let updateOperation = null;
      vi.spyOn(Order, "updateOne").mockImplementation(async (_filter, op) => {
        updateOperation = op;
        return { modifiedCount: 1 };
      });
      const restockSpy = vi.spyOn(Product, "updateOne").mockResolvedValue({ modifiedCount: 1 });
      const auditSpy = vi.spyOn(AuditLog, "create").mockResolvedValue({ _id: "audit-1" });

      const { agent, cookie, csrfToken } = await makeBrowser("staff", staffId);
      const res = await agent
        .post(`/api/v1/staff/returns/${orderId}/decision`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({ decision: "approve" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.orderStatus).toBe("returned");
      expect(res.body.data.refundRequired).toBe(true);
      expect(res.body.data.refundStatus).toBe("pending_refund");

      // Verify atomic update fields
      expect(updateOperation.$set.orderStatus).toBe("returned");
      expect(updateOperation.$set["returnRequest.status"]).toBe("approved");
      expect(updateOperation.$set["returnRequest.refundRequired"]).toBe(true);

      // Verify stock restoration
      expect(restockSpy).toHaveBeenCalledWith(
        { _id: productId, "variants.sku": "SKU-DOG-01" },
        { $inc: { "variants.$.stock": 2 } }
      );

      // Verify AuditLog
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "order.return.approve",
          actorId: staffId,
          target: { collectionName: "orders", id: orderId },
        })
      );
    });

    it("approves COD return: no refundRequired flag", async () => {
      order.returnRequest = { status: "pending" };
      order.paymentMethod = "COD";
      order.paymentStatus = "unpaid";

      vi.spyOn(Order, "updateOne").mockResolvedValue({ modifiedCount: 1 });

      const { agent, cookie, csrfToken } = await makeBrowser("staff", staffId);
      const res = await agent
        .post(`/api/v1/staff/returns/${orderId}/decision`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({ decision: "approve" })
        .expect(200);

      expect(res.body.data.refundRequired).toBe(false);
      expect(res.body.data.refundStatus).toBe("none");
    });

    it("rejects return: enforces rejectionReason 5..500 chars and records AuditLog", async () => {
      order.returnRequest = { status: "pending" };

      const { agent, cookie, csrfToken } = await makeBrowser("staff", staffId);

      // Too short reason (< 5 chars)
      await agent
        .post(`/api/v1/staff/returns/${orderId}/decision`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({ decision: "reject", rejectionReason: "ko" })
        .expect(400);

      // Valid rejection
      vi.spyOn(Order, "updateOne").mockResolvedValue({ modifiedCount: 1 });
      const auditSpy = vi.spyOn(AuditLog, "create").mockResolvedValue({ _id: "audit-1" });

      const res = await agent
        .post(`/api/v1/staff/returns/${orderId}/decision`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({
          decision: "reject",
          rejectionReason: "Ảnh minh chứng không đúng sản phẩm của Petjoy",
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("rejected");
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "order.return.reject",
          actorId: staffId,
        })
      );
    });

    it("concurrency race: second decision fails with 409 conflict without double restock", async () => {
      order.returnRequest = { status: "pending" };
      vi.spyOn(Order, "updateOne").mockResolvedValue({ modifiedCount: 0 });
      const restockSpy = vi.spyOn(Product, "updateOne");

      const { agent, cookie, csrfToken } = await makeBrowser("staff", staffId);
      const res = await agent
        .post(`/api/v1/staff/returns/${orderId}/decision`)
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .set("X-CSRF-Token", csrfToken)
        .send({ decision: "approve" })
        .expect(409);

      expect(res.body.error.code).toBe("RETURN_DECISION_CONFLICT");
      expect(restockSpy).not.toHaveBeenCalled();
    });
  });

  describe("Auto-Complete Overdue Shipping Orders Rules", () => {
    it("excludes order with pending return request even after 72 hours", () => {
      const now = new Date("2026-11-15T00:00:00.000Z");
      const testOrder = {
        channel: "online",
        orderStatus: "shipping",
        creationState: "complete",
        createdAt: new Date("2026-11-10T00:00:00.000Z"),
        returnRequest: { status: "pending" },
      };

      expect(isShippingOrderOverdue(testOrder, now)).toBe(false);
    });

    it("excludes order with approved return request", () => {
      const now = new Date("2026-11-15T00:00:00.000Z");
      const testOrder = {
        channel: "online",
        orderStatus: "shipping",
        creationState: "complete",
        createdAt: new Date("2026-11-10T00:00:00.000Z"),
        returnRequest: { status: "approved" },
      };

      expect(isShippingOrderOverdue(testOrder, now)).toBe(false);
    });

    it("enforces 24-hour grace period after rejection before auto-completing", () => {
      const shippedAt = new Date("2026-11-10T00:00:00.000Z");
      const reviewedAt = new Date("2026-11-14T00:00:00.000Z"); // rejected 4 days after shipping

      const testOrder = {
        channel: "online",
        orderStatus: "shipping",
        creationState: "complete",
        createdAt: shippedAt,
        statusHistory: [{ to: "shipping", at: shippedAt }],
        returnRequest: { status: "rejected", reviewedAt },
      };

      // 12 hours after rejection: should NOT be overdue despite being 4.5 days after shipping
      const twelveHoursLater = new Date("2026-11-14T12:00:00.000Z");
      expect(isShippingOrderOverdue(testOrder, twelveHoursLater)).toBe(false);

      // 25 hours after rejection: should BE overdue
      const twentyFiveHoursLater = new Date("2026-11-15T01:00:00.000Z");
      expect(isShippingOrderOverdue(testOrder, twentyFiveHoursLater)).toBe(true);
    });
  });
});

