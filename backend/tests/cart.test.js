import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import { Product } from "../src/models/product.model.js";
import { Cart } from "../src/models/cart.model.js";

describe("Cart API", () => {
  let app;
  const mockProductId = "507f1f77bcf86cd799439011";
  const mockSku = "RC-001";

  beforeEach(() => {
    app = createApp(parseEnvironment({ NODE_ENV: "test" }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/v1/cart/items adds an item to cart and saves in DB", async () => {
    const mockProduct = {
      _id: mockProductId,
      name: "Royal Canin Mini Adult",
      brand: "Royal Canin",
      images: ["/images/products/royal-canin-mini-adult.png"],
      isActive: true,
      variants: [
        { sku: mockSku, label: "2 kg", price: 420000, stock: 10, reservedStock: 2 },
      ],
    };

    vi.spyOn(Product, "findOne").mockResolvedValue(mockProduct);

    // Mock cart instance
    const savedCart = {
      _id: "607f1f77bcf86cd799439099",
      guestToken: "test-guest-token",
      items: [{ productId: mockProductId, variantSku: mockSku, quantity: 2 }],
      save: vi.fn().mockResolvedValue(this),
      populate: vi.fn().mockImplementation(async function () {
        this.items[0].productId = mockProduct;
        return this;
      }),
    };

    vi.spyOn(Cart, "findOne").mockResolvedValue(null);
    vi.spyOn(Cart.prototype, "save").mockImplementation(async function () {
      this.populate = async function () {
        this.items[0].productId = mockProduct;
        return this;
      };
      return this;
    });

    const response = await request(app)
      .post("/api/v1/cart/items")
      .send({
        productId: mockProductId,
        variantSku: mockSku,
        quantity: 2,
        guestToken: "test-guest-token",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toContain("thành công");
  });

  it("POST /api/v1/cart/items rejects when quantity exceeds available stock", async () => {
    const mockProduct = {
      _id: mockProductId,
      name: "Royal Canin Mini Adult",
      variants: [
        { sku: mockSku, label: "2 kg", price: 420000, stock: 5, reservedStock: 3 }, // available: 2
      ],
      isActive: true,
    };

    vi.spyOn(Product, "findOne").mockResolvedValue(mockProduct);
    // The cart is loaded before the stock check; a new guest has none.
    vi.spyOn(Cart, "findOne").mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/cart/items")
      .send({
        productId: mockProductId,
        variantSku: mockSku,
        quantity: 5, // Exceeds available stock (2)
        guestToken: "test-guest-token",
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("OUT_OF_STOCK");
  });
});
