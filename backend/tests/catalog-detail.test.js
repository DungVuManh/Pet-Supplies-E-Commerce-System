import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import { Product } from "../src/models/product.model.js";

describe("Catalog Product Detail API", () => {
  let app;
  const mockProductId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    app = createApp(parseEnvironment({ NODE_ENV: "test" }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns product detail matching what DetailProduct frontend component needs", async () => {
    const mockProduct = {
      _id: mockProductId,
      name: "Royal Canin Mini Adult",
      brand: "Royal Canin",
      description: "Thức ăn cho chó trưởng thành",
      petType: "dog",
      categoryId: { name: "Thức ăn cho chó", slug: "thuc-an-cho-cho" },
      images: ["/images/products/royal-canin-mini-adult.png"],
      isActive: true,
      variants: [
        { sku: "RC-001", label: "2 kg", price: 420000, stock: 24, reservedStock: 0 },
        { sku: "RC-002", label: "8 kg", price: 1250000, stock: 10, reservedStock: 2 },
      ],
      ratingAvg: 4.9,
      ratingCount: 128,
    };

    const chain = (value) => ({
      populate: () => ({
        lean: async () => value,
      }),
    });

    vi.spyOn(Product, "findOne").mockImplementation(() => chain(mockProduct));

    const response = await request(app)
      .get(`/api/v1/catalog/products/${mockProductId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    const p = response.body.data.product;
    expect(p.name).toBe("Royal Canin Mini Adult");
    expect(p.brand).toBe("Royal Canin");
    expect(p.price).toBe(420000);
    expect(p.variants).toHaveLength(2);
    expect(p.variants[0].label).toBe("2 kg");
    expect(p.variants[0].availableStock).toBe(24);
    expect(p.variants[1].label).toBe("8 kg");
    expect(p.variants[1].availableStock).toBe(8);
    expect(p.inStock).toBe(true);
  });

  it("returns 404 when product is not found or inactive", async () => {
    const chain = (value) => ({
      populate: () => ({
        lean: async () => value,
      }),
    });

    vi.spyOn(Product, "findOne").mockImplementation(() => chain(null));

    const response = await request(app)
      .get("/api/v1/catalog/products/non-existent-id")
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
