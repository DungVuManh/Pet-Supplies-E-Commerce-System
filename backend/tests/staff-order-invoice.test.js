import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { Setting } from "../src/models/setting.model.js";
import { User, userRepository } from "../src/models/user.model.js";

const orderId = "a".repeat(24);
const actorId = "b".repeat(24);
const customerId = "c".repeat(24);
const productId = "d".repeat(24);

const chain = (value) => ({
  select() {
    return this;
  },
  lean: async () => value,
});

let app;
let order;
let setting;
let role;
let auth;
let auditEntries;

beforeEach(() => {
  app = createApp(parseEnvironment({ NODE_ENV: "test" }));
  role = "staff";
  auditEntries = [];
  setting = {
    _id: "global",
    storeName: "Petjoy Flagship",
    address: "28 Nguyễn Thị Minh Khai, Q.1, TP. HCM",
    hotline: "1900 636 789",
    contactEmail: "hello@petjoy.vn",
  };
  order = {
    _id: orderId,
    orderCode: "ORD1794327303021111",
    channel: "online",
    orderStatus: "confirmed",
    paymentMethod: "ONLINE",
    paymentStatus: "paid",
    customerId,
    guestInfo: {
      name: "Nguyễn Văn A",
      phone: "0901234567",
      email: "khach@example.test",
    },
    shippingAddress: {
      recipientName: "Nguyễn Văn A",
      phone: "0901234567",
      province: "TP. Hồ Chí Minh",
      district: "Quận 1",
      ward: "Phường Bến Nghé",
      street: "123 Lê Lợi",
    },
    items: [
      {
        productId,
        variantSku: "RC-MA-2KG",
        name: "Thức ăn hạt Royal Canin Mini Adult",
        unitPrice: 320000,
        qty: 2,
      },
    ],
    subtotal: 640000,
    discount: 50000,
    promotionCode: "PET50K",
    shippingFee: 0,
    total: 590000,
    paidAmount: 590000,
    needsReview: false,
    createdAt: new Date("2026-11-11T08:05:21.782Z"),
  };

  auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "staff-uid" }) };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({
    _id: actorId,
    role,
    fullName: "Nhân viên Thu Ngân",
  }));
  vi.spyOn(Order, "findById").mockImplementation(() => chain(order));
  vi.spyOn(Setting, "findOne").mockImplementation(() => chain(setting));
  vi.spyOn(User, "findById").mockImplementation((lookupId) => {
    if (String(lookupId) === customerId) {
      return chain({
        _id: customerId,
        fullName: "Nguyễn Văn A",
        phone: "0901234567",
        email: "khach@example.test",
      });
    }
    return chain({ _id: actorId, fullName: "Nhân viên Quầy 1" });
  });
  vi.spyOn(AuditLog, "countDocuments").mockResolvedValue(1);
  vi.spyOn(AuditLog, "create").mockImplementation(async (doc) => {
    const entry = { _id: "e".repeat(24), ...doc };
    auditEntries.push(entry);
    return entry;
  });
  vi.spyOn(Product, "find");
  vi.spyOn(Product, "updateOne");
  vi.spyOn(Order, "updateOne");
});

afterEach(() => vi.restoreAllMocks());

async function browser() {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
  const cookie = `petly-session=test-session; ${csrf.headers["set-cookie"][0].split(";")[0]}`;
  const getInvoice = (targetId = orderId) =>
    agent
      .get(`/api/v1/staff/orders/${targetId}/invoice`)
      .set("Cookie", cookie);
  const postExport = (targetId = orderId, csrfOverride) =>
    agent
      .post(`/api/v1/staff/orders/${targetId}/invoice/exports`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", csrfOverride ?? csrf.body.data.csrfToken)
      .send({});
  return { agent, getInvoice, postExport };
}

describe("Staff Order Invoice API (/api/v1/staff/orders/:id/invoice)", () => {
  describe("Authorization & Security Guards", () => {
    it("rejects unauthenticated requests with 401 and non-staff roles with 403", async () => {
      await request(app).get(`/api/v1/staff/orders/${orderId}/invoice`).expect(401);
      await request(app)
        .post(`/api/v1/staff/orders/${orderId}/invoice/exports`)
        .send({})
        .expect(401);

      const { getInvoice, postExport } = await browser();
      for (const forbiddenRole of ["customer", "admin"]) {
        role = forbiddenRole;
        const getRes = await getInvoice().expect(403);
        expect(getRes.body.error.code).toBe("FORBIDDEN");
        const postRes = await postExport().expect(403);
        expect(postRes.body.error.code).toBe("FORBIDDEN");
      }
    });

    it("enforces Origin/CSRF protection on POST /invoice/exports", async () => {
      const { postExport } = await browser();
      const res = await postExport(orderId, "invalid-token").expect(403);
      expect(res.body.error.code).toBe("CSRF_INVALID");
      expect(auditEntries).toHaveLength(0);
    });
  });

  describe("Validation & Status Eligibility (FR-003, FR-004)", () => {
    it("rejects malformed order IDs with 400 VALIDATION_ERROR", async () => {
      const { getInvoice, postExport } = await browser();
      const resGet = await getInvoice("bad-id").expect(400);
      expect(resGet.body.error.code).toBe("VALIDATION_ERROR");
      const resPost = await postExport("bad-id").expect(400);
      expect(resPost.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 ORDER_NOT_FOUND when order does not exist or creationState is pending", async () => {
      order = null;
      const { getInvoice, postExport } = await browser();
      const resMissing = await getInvoice().expect(404);
      expect(resMissing.body.error.code).toBe("ORDER_NOT_FOUND");

      order = { _id: orderId, orderCode: "ORD999", orderStatus: "completed", creationState: "pending" };
      const resPendingCreation = await getInvoice().expect(404);
      expect(resPendingCreation.body.error.code).toBe("ORDER_NOT_FOUND");
      await postExport().expect(404);
    });

    it.each(["pending", "cancelled"])(
      "blocks %s order from invoice generation and export with 409 INVOICE_NOT_ELIGIBLE",
      async (status) => {
        order.orderStatus = status;
        const { getInvoice, postExport } = await browser();
        const getRes = await getInvoice().expect(409);
        expect(getRes.body.error.code).toBe("INVOICE_NOT_ELIGIBLE");
        expect(getRes.headers["cache-control"]).toBe("no-store");

        const postRes = await postExport().expect(409);
        expect(postRes.body.error.code).toBe("INVOICE_NOT_ELIGIBLE");
        expect(auditEntries).toHaveLength(0);
      }
    );

    it.each(["confirmed", "processing", "shipping", "completed"])(
      "allows invoice generation for eligible status %s",
      async (status) => {
        order.orderStatus = status;
        const { getInvoice } = await browser();
        const res = await getInvoice().expect(200);
        expect(res.headers["cache-control"]).toBe("no-store");
        expect(res.body.success).toBe(true);
        expect(res.body.data.invoice.order.orderStatus).toBe(status);
      }
    );
  });

  describe("Snapshot Integrity, Store Fallbacks & Financial Accuracy (US2)", () => {
    it("reads prices strictly from Order snapshot without touching Product, and keeps zero VAT fields", async () => {
      const { getInvoice } = await browser();
      const res = await getInvoice().expect(200);
      const { invoice } = res.body.data;

      expect(Product.find).not.toHaveBeenCalled();
      expect(invoice.store).toEqual({
        name: "Petjoy Flagship",
        address: "28 Nguyễn Thị Minh Khai, Q.1, TP. HCM",
        hotline: "1900 636 789",
        email: "hello@petjoy.vn",
      });
      expect(invoice.order.items).toEqual([
        {
          variantSku: "RC-MA-2KG",
          name: "Thức ăn hạt Royal Canin Mini Adult",
          unitPrice: 320000,
          qty: 2,
          lineTotal: 640000,
        },
      ]);
      expect(invoice.order.subtotal).toBe(640000);
      expect(invoice.order.discount).toBe(50000);
      expect(invoice.order.promotionCode).toBe("PET50K");
      expect(invoice.order.total).toBe(590000);
      expect(invoice.order.paidAmount).toBe(590000);
      expect(invoice.order.remainingAmount).toBe(0);
      expect(invoice.invoiceMeta.generatedBy).toBe("Nhân viên Thu Ngân");
      expect(invoice.invoiceMeta.exportCount).toBe(1);
    });

    it("applies safe defaults when Setting is missing/blank and handles offline pickup orders cleanly", async () => {
      setting = null;
      order = {
        ...order,
        channel: "offline",
        orderStatus: "completed",
        paymentMethod: "CASH",
        paymentStatus: "paid",
        createdByStaffId: actorId,
        customerId: undefined,
        guestInfo: { name: "Khách lẻ tại quầy", phone: "0988777666" },
        shippingAddress: undefined,
        paidAmount: 0,
        discount: 0,
        promotionCode: undefined,
        total: 640000,
      };

      const { getInvoice } = await browser();
      const res = await getInvoice().expect(200);
      const { invoice } = res.body.data;

      expect(invoice.store).toEqual({
        name: "Petjoy",
        address: "",
        hotline: "",
        email: "",
      });
      expect(invoice.order.shippingAddress).toBeNull();
      expect(invoice.order.customer).toEqual({
        name: "Khách lẻ tại quầy",
        phone: "0988777666",
        email: null,
      });
      expect(invoice.order.paidAmount).toBe(640000);
      expect(invoice.order.remainingAmount).toBe(0);
      expect(invoice.order.createdByStaff).toBe("Nhân viên Quầy 1");
    });

    it("calculates remainingAmount for partial/unpaid orders and surfaces needsReview", async () => {
      order.paymentMethod = "COD";
      order.paymentStatus = "unpaid";
      order.paidAmount = 100000;
      order.needsReview = true;
      order.shippingAddress = {
        recipientName: "null",
        phone: "null",
        province: "TP.HCM",
        district: "Q1",
        ward: "null",
        street: "123 Lê Lợi",
      };

      const { getInvoice } = await browser();
      const res = await getInvoice().expect(200);
      const { invoice } = res.body.data;

      expect(invoice.order.paidAmount).toBe(100000);
      expect(invoice.order.remainingAmount).toBe(490000);
      expect(invoice.order.needsReview).toBe(true);
      expect(invoice.order.shippingAddress).toEqual({
        recipientName: "Nguyễn Văn A",
        phone: "0901234567",
        province: "TP.HCM",
        district: "Q1",
        ward: "",
        street: "123 Lê Lợi",
      });
    });

    it("records AuditLog on POST /invoice/exports without modifying Order or Product stock", async () => {
      const { postExport } = await browser();
      const res = await postExport().expect(201);

      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.body.success).toBe(true);
      expect(res.body.data.exportRecord).toMatchObject({
        orderId,
        orderCode: order.orderCode,
        exportedBy: "Nhân viên Thu Ngân",
      });

      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0]).toMatchObject({
        action: "order.invoice.export",
        target: { collectionName: "orders", id: orderId },
        result: "success",
        summary: `Xuất hóa đơn đơn hàng #${order.orderCode}`,
      });
      expect(Order.updateOne).not.toHaveBeenCalled();
      expect(Product.updateOne).not.toHaveBeenCalled();
    });
  });
});

