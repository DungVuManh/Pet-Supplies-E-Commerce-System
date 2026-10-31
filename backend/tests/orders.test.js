import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { userRepository } from "../src/models/user.model.js";
import {
  buildOrderSearchFilter,
  buildPhoneRegex,
  buildSearchRegex,
  computeDateRange,
  parseOrderId,
  parseOrderQuery,
} from "../src/validators/order.validator.js";

const config = parseEnvironment({ NODE_ENV: "test" });

describe("Staff Orders validation & query helpers", () => {
  it("parses valid query with default values", () => {
    const result = parseOrderQuery({});
    expect(result).toEqual({
      query: "",
      status: "all",
      sort: "createdAt_desc",
      page: 1,
      pageSize: 8,
    });
  });

  it("parses supported query parameters and trims values", () => {
    const result = parseOrderQuery({
      query: "  PA261012018  ",
      status: "pending",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-12",
      sort: "total_desc",
      page: "2",
      pageSize: "16",
    });
    expect(result).toEqual({
      query: "PA261012018",
      status: "pending",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-12",
      sort: "total_desc",
      page: 2,
      pageSize: 16,
    });
  });

  it("rejects unknown query parameters and invalid enums", () => {
    expect(() => parseOrderQuery({ unknown: "param" })).toThrowError();
    expect(() => parseOrderQuery({ status: "packing" })).toThrowError();
    expect(() => parseOrderQuery({ status: "delivered" })).toThrowError();
    expect(() => parseOrderQuery({ sort: "invalid_sort" })).toThrowError();
  });

  it("rejects non-calendar dates and reversed date ranges", () => {
    // 31st February does not exist
    expect(() => parseOrderQuery({ dateFrom: "2026-02-31" })).toThrowError();
    // Month 13 does not exist
    expect(() => parseOrderQuery({ dateFrom: "2026-13-01" })).toThrowError();
    // dateFrom > dateTo
    expect(() =>
      parseOrderQuery({ dateFrom: "2026-10-15", dateTo: "2026-10-10" })
    ).toThrowError();
  });

  it("rejects non-decimal integer, zero, negative or excessive numbers", () => {
    expect(() => parseOrderQuery({ page: "0" })).toThrowError();
    expect(() => parseOrderQuery({ page: "-1" })).toThrowError();
    expect(() => parseOrderQuery({ page: "1.5" })).toThrowError();
    expect(() => parseOrderQuery({ page: "1e3" })).toThrowError();
    expect(() => parseOrderQuery({ page: " 1 " })).toThrowError();
    expect(() => parseOrderQuery({ page: "10001" })).toThrowError();
    expect(() => parseOrderQuery({ pageSize: "51" })).toThrowError();
  });

  it("computes date range correctly in UTC+07", () => {
    const range = computeDateRange("2026-10-01", "2026-10-02");
    expect(range.$gte.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(range.$lt.toISOString()).toBe("2026-10-02T17:00:00.000Z");
  });

  it("builds search regex expanding Vietnamese accents and d/đ", () => {
    const regexD = buildSearchRegex("dat");
    expect(regexD.test("đạt")).toBe(true);
    expect(regexD.test("DAT")).toBe(true);

    const regexMinh = buildSearchRegex("Minh");
    expect(regexMinh.test("Mính")).toBe(true);
    expect(regexMinh.test("minh")).toBe(true);
  });

  it("builds phone regex matching numbers with spaces/dots/hyphens", () => {
    const phoneRegex = buildPhoneRegex("0901234");
    expect(phoneRegex.test("0901 234 567")).toBe(true);
    expect(phoneRegex.test("0901.234.567")).toBe(true);
    expect(phoneRegex.test("0901-234-567")).toBe(true);
    expect(phoneRegex.test("0988 111 222")).toBe(false);
  });

  it("builds compound search filter for multiple tokens", () => {
    const filter = buildOrderSearchFilter("0901 Minh");
    expect(filter).toHaveProperty("$and");
    expect(filter.$and).toHaveLength(2);
  });

  it("validates ObjectId hex 24 chars", () => {
    expect(parseOrderId({ id: "507f1f77bcf86cd799439011" })).toBe(
      "507f1f77bcf86cd799439011"
    );
    expect(() => parseOrderId({ id: "invalid-id" })).toThrowError();
    expect(() => parseOrderId({ id: "507f1f77bcf86cd79943901" })).toThrowError();
  });
});

describe("Staff Orders HTTP boundaries", () => {
  it("rejects unauthenticated requests to /api/v1/staff/orders with 401", async () => {
    const response = await request(createApp(config)).get(
      "/api/v1/staff/orders"
    );
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("rejects unauthenticated requests to /api/v1/staff/orders/:id with 401", async () => {
    const response = await request(createApp(config)).get(
      "/api/v1/staff/orders/507f1f77bcf86cd799439011"
    );
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("Customer order creation HTTP", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists guest information when creating an online order", async () => {
    const productId = "507f1f77bcf86cd799439011";
    const guestInfo = { name: "Khách mua hàng", phone: "0901234567" };
    const createdOrder = {
      _id: "607f1f77bcf86cd799439099",
      orderCode: "ORD123",
      total: 450000,
      paymentMethod: "COD",
      createdAt: new Date().toISOString(),
    };

    vi.spyOn(Product, "findById").mockResolvedValue({
      _id: productId,
      name: "Thức ăn thú cưng",
      price: 420000,
      variants: [{ sku: "PET-001", price: 420000 }],
    });
    const createOrder = vi.spyOn(Order, "create").mockResolvedValue(createdOrder);

    const response = await request(createApp(config))
      .post("/api/v1/orders")
      .send({
        items: [{ productId, variantSku: "PET-001", qty: 1 }],
        guestInfo,
        shippingAddress: {
          recipientName: guestInfo.name,
          phone: guestInfo.phone,
          province: "Hà Nội",
          district: "Cầu Giấy",
          ward: "Dịch Vọng",
          street: "Số 1",
        },
      })
      .expect(201);

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        guestInfo,
        subtotal: 420000,
        total: 420000,
      }),
    );
    expect(response.body.data.order.orderCode).toBe(createdOrder.orderCode);
  });

  it("uses the authenticated customer's profile ID instead of a client-provided ID", async () => {
    const customerId = "507f1f77bcf86cd799439099";
    const productId = "507f1f77bcf86cd799439011";
    const customer = {
      _id: customerId,
      firebaseUid: "firebase-customer",
      role: "customer",
    };
    const createdOrder = {
      _id: "607f1f77bcf86cd799439099",
      orderCode: "ORD456",
      total: 450000,
      paymentMethod: "COD",
      createdAt: new Date().toISOString(),
    };

    vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue({
      verifySessionCookie: vi.fn().mockResolvedValue({ uid: customer.firebaseUid }),
    });
    vi.spyOn(userRepository, "findByUid").mockResolvedValue(customer);
    vi.spyOn(Product, "findById").mockResolvedValue({
      _id: productId,
      name: "Thức ăn thú cưng",
      price: 420000,
      variants: [{ sku: "PET-001", price: 420000 }],
    });
    const createOrder = vi.spyOn(Order, "create").mockResolvedValue(createdOrder);

    const response = await request(createApp(config))
      .post("/api/v1/orders")
      .set("Cookie", "petly-session=signed-session")
      .send({
        customerId: "507f1f77bcf86cd799439010",
        items: [{ productId, variantSku: "PET-001", qty: 1 }],
        guestInfo: { name: "Client name", phone: "0900000000" },
        shippingAddress: {
          recipientName: "Khách hàng",
          phone: "0912345678",
          province: "Hà Nội",
          district: "Cầu Giấy",
          ward: "Dịch Vọng",
          street: "Số 1",
        },
      })
      .expect(201);

    expect(userRepository.findByUid).toHaveBeenCalledWith(customer.firebaseUid);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customerId, guestInfo: undefined }),
    );
    expect(response.body.data.order.orderCode).toBe(createdOrder.orderCode);
  });

  it("rejects order creation when a product ID does not exist", async () => {
    vi.spyOn(Product, "findById").mockResolvedValue(null);
    const createOrder = vi.spyOn(Order, "create");

    const response = await request(createApp(config))
      .post("/api/v1/orders")
      .send({
        items: [{
          productId: "507f1f77bcf86cd799439011",
          variantSku: "PET-001",
          qty: 1,
        }],
        guestInfo: { name: "Khách mua hàng", phone: "0901234567" },
      })
      .expect(404);

    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("strictly computes price from server product and rejects insufficient stock", async () => {
    const productId = "507f1f77bcf86cd799439011";
    vi.spyOn(Product, "findById").mockResolvedValue({
      _id: productId,
      name: "Thức ăn thú cưng",
      price: 500000,
      variants: [{ sku: "PET-001", price: 500000, stock: 2, reservedStock: 0 }],
    });

    // Client attempts to spoof unitPrice to 1000 and order 5 (while stock is 2)
    const response = await request(createApp(config))
      .post("/api/v1/orders")
      .send({
        items: [{
          productId,
          variantSku: "PET-001",
          qty: 5,
          unitPrice: 1000,
        }],
        guestInfo: { name: "Khách mua hàng", phone: "0901234567" },
      })
      .expect(400);

    expect(response.body.error.code).toBe("OUT_OF_STOCK");
  });

  it("does not pull items from Cart when isBuyNow is true", async () => {
    const productId = "507f1f77bcf86cd799439011";
    const createdOrder = {
      _id: "607f1f77bcf86cd799439099",
      orderCode: "ORD789",
      total: 300000,
      paymentMethod: "COD",
      createdAt: new Date().toISOString(),
    };

    vi.spyOn(Product, "findById").mockResolvedValue({
      _id: productId,
      name: "Thức ăn",
      price: 300000,
      variants: [{ sku: "PET-002", price: 300000, stock: 10, reservedStock: 0 }],
    });
    vi.spyOn(Order, "create").mockResolvedValue(createdOrder);

    const { Cart } = await import("../src/models/cart.model.js");
    const updateManySpy = vi.spyOn(Cart, "updateMany").mockResolvedValue({ modifiedCount: 0 });

    await request(createApp(config))
      .post("/api/v1/orders")
      .send({
        items: [{ productId, variantSku: "PET-002", qty: 1 }],
        guestInfo: { name: "Khách", phone: "0901234567" },
        isBuyNow: true,
      })
      .expect(201);

    expect(updateManySpy).not.toHaveBeenCalled();
  });
});

describe("Buy Now preview HTTP", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects buy-now-preview when quantity is invalid or exceeds available stock", async () => {
    const productId = "507f1f77bcf86cd799439011";
    vi.spyOn(Product, "findById").mockResolvedValue({
      _id: productId,
      name: "Hạt cho mèo",
      price: 250000,
      variants: [{ sku: "CAT-01", price: 250000, stock: 3, reservedStock: 1 }], // available 2
    });

    // Invalid quantity
    const resInvalid = await request(createApp(config))
      .post("/api/v1/orders/buy-now-preview")
      .send({ productId, variantSku: "CAT-01", quantity: -1 })
      .expect(400);
    expect(resInvalid.body.error.code).toBe("INVALID_QUANTITY");

    // Quantity exceeds available stock
    const resOutOfStock = await request(createApp(config))
      .post("/api/v1/orders/buy-now-preview")
      .send({ productId, variantSku: "CAT-01", quantity: 3 })
      .expect(400);
    expect(resOutOfStock.body.error.code).toBe("OUT_OF_STOCK");
  });

  it("returns verified server price and item details for valid buy-now request", async () => {
    const productId = "507f1f77bcf86cd799439011";
    vi.spyOn(Product, "findById").mockResolvedValue({
      _id: productId,
      name: "Hạt cho mèo",
      price: 250000,
      variants: [{ sku: "CAT-01", label: "Gói 1kg", price: 250000, stock: 10, reservedStock: 0 }],
    });

    const response = await request(createApp(config))
      .post("/api/v1/orders/buy-now-preview")
      .send({ productId, variantSku: "CAT-01", quantity: 2 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.item.price).toBe(250000);
    expect(response.body.data.item.quantity).toBe(2);
    expect(response.body.data.item.itemTotal).toBe(500000);
    expect(response.body.data.summary.subtotal).toBe(500000);
    expect(response.body.data.summary.total).toBe(500000);
  });
});
