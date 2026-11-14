import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { Cart } from "../src/models/cart.model.js";
import { Order } from "../src/models/order.model.js";
import { Product } from "../src/models/product.model.js";
import { userRepository } from "../src/models/user.model.js";

const orderId = "a".repeat(24);
const customerId = "b".repeat(24);
const anotherCustomerId = "c".repeat(24);
const prodId1 = "d".repeat(24);
const prodId2 = "e".repeat(24);

const chain = (value) => ({
  lean: async () => value,
  populate: async () => value,
});

let app;
let sampleOrder;
let currentUserId;
let sampleCart;
let sampleProducts;

beforeEach(() => {
  app = createApp(parseEnvironment({ NODE_ENV: "test" }));
  currentUserId = customerId;

  sampleOrder = {
    _id: orderId,
    orderCode: "PA261012018",
    customerId,
    orderStatus: "completed",
    channel: "online",
    creationState: "complete",
    items: [
      {
        productId: prodId1,
        variantSku: "SKU-FOOD-1",
        name: "Hạt cho chó",
        unitPrice: 180000,
        qty: 2,
      },
      {
        productId: prodId2,
        variantSku: "SKU-PATE-1",
        name: "Pate cho mèo",
        unitPrice: 35000,
        qty: 3,
      },
    ],
  };

  sampleProducts = [
    {
      _id: prodId1,
      name: "Hạt cho chó cao cấp",
      price: 200000,
      isActive: true,
      variants: [
        {
          sku: "SKU-FOOD-1",
          price: 200000,
          stock: 10,
          reservedStock: 0,
        },
      ],
    },
    {
      _id: prodId2,
      name: "Pate cho mèo thơm ngon",
      price: 40000,
      isActive: true,
      variants: [
        {
          sku: "SKU-PATE-1",
          price: 40000,
          stock: 5,
          reservedStock: 1, // available: 4
        },
      ],
    },
  ];

  sampleCart = {
    userId: customerId,
    items: [],
    save: vi.fn().mockResolvedValue(true),
  };

  const auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "customer" }) };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({
    _id: currentUserId,
    role: "customer",
    fullName: "Customer",
  }));

  vi.spyOn(Order, "findOne").mockImplementation((filter) => {
    if (filter._id === orderId && String(filter.customerId) === String(sampleOrder.customerId)) {
      return chain(sampleOrder);
    }
    return chain(null);
  });

  vi.spyOn(Product, "find").mockImplementation((filter) => {
    const ids = filter._id?.$in?.map(String) || [];
    const matched = sampleProducts.filter((p) => ids.includes(String(p._id)) && p.isActive);
    return chain(matched);
  });

  vi.spyOn(Cart, "findOne").mockImplementation((filter) => {
    if (String(filter.userId) === String(currentUserId)) {
      return Promise.resolve(sampleCart);
    }
    return Promise.resolve(null);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function browser() {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
  const cookie = `petly-session=test; ${csrf.headers["set-cookie"][0].split(";")[0]}`;
  const reorder = (target = orderId) =>
    agent
      .post(`/api/v1/orders/${target}/reorder`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", csrf.body.data.csrfToken)
      .send({});
  return { reorder, cookie };
}

describe("Customer Reorder Completed Order", () => {
  it("successfully adds all available items to cart with current prices for a completed order", async () => {
    const { reorder } = await browser();
    const response = await reorder().expect(200);

    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.success).toBe(true);
    expect(response.body.data.addedCount).toBe(2);
    expect(response.body.data.unavailableCount).toBe(0);

    // Verify cart was saved with added items
    expect(sampleCart.save).toHaveBeenCalled();
    expect(sampleCart.items).toHaveLength(2);
    expect(sampleCart.items[0]).toEqual({
      productId: prodId1,
      variantSku: "SKU-FOOD-1",
      quantity: 2,
    });
    expect(sampleCart.items[1]).toEqual({
      productId: prodId2,
      variantSku: "SKU-PATE-1",
      quantity: 3,
    });

    // Verify current product prices were reported
    expect(response.body.data.addedItems[0].price).toBe(200000);
    expect(response.body.data.addedItems[1].price).toBe(40000);
  });

  it("rejects reordering when order status is not completed", async () => {
    sampleOrder.orderStatus = "shipping";
    const { reorder } = await browser();
    const response = await reorder().expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("ORDER_NOT_COMPLETED");
    expect(sampleCart.save).not.toHaveBeenCalled();
  });

  it("returns 404 ORDER_NOT_FOUND when attempting to reorder another customer's order", async () => {
    currentUserId = anotherCustomerId;
    const { reorder } = await browser();
    const response = await reorder().expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
    expect(sampleCart.save).not.toHaveBeenCalled();
  });

  it("handles partial availability: adds in-stock items and reports unavailable items", async () => {
    // Product 2 is out of stock (available: 0)
    sampleProducts[1].variants[0].stock = 1;
    sampleProducts[1].variants[0].reservedStock = 1;

    const { reorder } = await browser();
    const response = await reorder().expect(200);

    expect(response.body.data.addedCount).toBe(1);
    expect(response.body.data.unavailableCount).toBe(1);
    expect(response.body.data.addedItems[0].variantSku).toBe("SKU-FOOD-1");
    expect(response.body.data.unavailableItems[0].variantSku).toBe("SKU-PATE-1");
    expect(response.body.data.unavailableItems[0].reason).toBe("OUT_OF_STOCK");

    expect(sampleCart.save).toHaveBeenCalled();
    expect(sampleCart.items).toHaveLength(1);
  });

  it("clamps quantity to remaining available stock if order qty exceeds available stock", async () => {
    // Product 1 only has available 1 (stock 2, reserved 1), but order wanted 2
    sampleProducts[0].variants[0].stock = 2;
    sampleProducts[0].variants[0].reservedStock = 1;

    const { reorder } = await browser();
    const response = await reorder().expect(200);

    expect(sampleCart.items[0].quantity).toBe(1);
    expect(response.body.data.addedItems[0].quantity).toBe(1);
  });

  it("merges into existing cart items without duplicating SKUs", async () => {
    // User already has 1 SKU-FOOD-1 in cart
    sampleCart.items.push({
      productId: prodId1,
      variantSku: "SKU-FOOD-1",
      quantity: 1,
    });

    const { reorder } = await browser();
    const response = await reorder().expect(200);

    // SKU-FOOD-1 quantity should be 1 + 2 = 3
    const foodItem = sampleCart.items.find((i) => i.variantSku === "SKU-FOOD-1");
    expect(foodItem.quantity).toBe(3);
    expect(sampleCart.items).toHaveLength(2);
  });

  it("rejects with 400 ALL_ITEMS_UNAVAILABLE when all products in order are out of stock or inactive", async () => {
    // Make both products inactive
    sampleProducts[0].isActive = false;
    sampleProducts[1].isActive = false;

    const { reorder } = await browser();
    const response = await reorder().expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("ALL_ITEMS_UNAVAILABLE");
    expect(response.body.message).toContain("hết hàng hoặc ngừng kinh doanh");
    expect(sampleCart.save).not.toHaveBeenCalled();
  });
});
