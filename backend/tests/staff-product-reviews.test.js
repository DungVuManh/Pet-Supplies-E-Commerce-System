import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository } from "../src/models/user.model.js";
import { Product } from "../src/models/product.model.js";
import { Review } from "../src/models/review.model.js";

const sku = "ROYAL-MINI-1KG";
const productId = "a".repeat(24);
const orderId = "c".repeat(24);
const customerUserId = "d".repeat(24);

let app, role, auth;

const mockProduct = {
  _id: productId,
  name: "Thức ăn chó Royal Canin Mini Adult",
  ratingAvg: 4.5,
  ratingCount: 2,
  variants: [
    { sku, label: "1 kg", price: 150000, stock: 20, reservedStock: 0 },
  ],
};

const mockReviews = [
  {
    _id: "e".repeat(24),
    productId,
    orderId: {
      _id: orderId,
      orderCode: "ORD123456",
    },
    userId: {
      _id: customerUserId,
      fullName: "Nguyễn Văn Khách",
      email: "khach@example.com",
      phone: "0901234567",
    },
    rating: 5,
    comment: "Sản phẩm rất tốt, cún nhà mình ăn ngon miệng!",
    images: ["https://example.com/image1.jpg"],
    status: "published",
    createdAt: new Date("2026-11-10T08:00:00Z"),
  },
  {
    _id: "f".repeat(24),
    productId,
    orderId: null,
    userId: {
      _id: "1".repeat(24),
      fullName: "Trần Thị B",
      email: "b@example.com",
      phone: "",
    },
    rating: 4,
    comment: "Giao hàng nhanh, đóng gói cẩn thận.",
    images: [],
    status: "published",
    createdAt: new Date("2026-11-09T08:00:00Z"),
  },
];

function chainReviews(value) {
  return {
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    lean: async () => value,
  };
}

beforeEach(() => {
  app = createApp(parseEnvironment({ NODE_ENV: "test" }));
  role = "staff";

  auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "user_test" }) };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({
    _id: "b".repeat(24),
    role,
  }));

  vi.spyOn(Product, "findOne").mockImplementation((filter) => {
    if (filter["variants.sku"] === sku || filter._id === sku) {
      return { lean: async () => structuredClone(mockProduct) };
    }
    return { lean: async () => null };
  });

  vi.spyOn(Product, "findById").mockImplementation((id) => {
    if (id === productId) {
      return { lean: async () => structuredClone(mockProduct) };
    }
    return { lean: async () => null };
  });

  vi.spyOn(Review, "find").mockImplementation(() => chainReviews(structuredClone(mockReviews)));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/v1/staff/products/:sku/reviews", () => {
  it("rejects unauthenticated requests with 401", async () => {
    await request(app)
      .get(`/api/v1/staff/products/${sku}/reviews`)
      .expect(401);
  });

  it("rejects customer role with 403", async () => {
    role = "customer";
    await request(app)
      .get(`/api/v1/staff/products/${sku}/reviews`)
      .set("Cookie", "petly-session=valid-cookie")
      .expect(403);
  });

  it("rejects admin role with 403 (strict Staff-only workspace)", async () => {
    role = "admin";
    await request(app)
      .get(`/api/v1/staff/products/${sku}/reviews`)
      .set("Cookie", "petly-session=valid-cookie")
      .expect(403);
  });

  it("returns 404 when product SKU is not found", async () => {
    await request(app)
      .get("/api/v1/staff/products/NON_EXISTENT_SKU/reviews")
      .set("Cookie", "petly-session=valid-cookie")
      .expect(404);
  });

  it("allows staff and returns reviews summary, list with customer & order info, and pagination", async () => {
    const res = await request(app)
      .get(`/api/v1/staff/products/${sku}/reviews`)
      .set("Cookie", "petly-session=valid-cookie")
      .expect(200);

    expect(res.body.success).toBe(true);
    const { summary, reviews, pagination } = res.body.data;

    // Summary checks
    expect(summary.totalReviews).toBe(2);
    expect(summary.averageRating).toBe(4.5);
    expect(summary.breakdown[5]).toEqual({ count: 1, percentage: 50 });
    expect(summary.breakdown[4]).toEqual({ count: 1, percentage: 50 });

    // Review items checks
    expect(reviews.length).toBe(2);
    const r1 = reviews[0];
    expect(r1.author.fullName).toBe("Nguyễn Văn Khách");
    expect(r1.author.email).toBe("khach@example.com");
    expect(r1.order).toEqual({ id: orderId, orderCode: "ORD123456" });
    expect(r1.images).toEqual(["https://example.com/image1.jpg"]);

    // Pagination checks
    expect(pagination.currentPage).toBe(1);
    expect(pagination.totalReviews).toBe(2);
  });

  it("filters reviews by rating", async () => {
    const res = await request(app)
      .get(`/api/v1/staff/products/${sku}/reviews?rating=5`)
      .set("Cookie", "petly-session=valid-cookie")
      .expect(200);

    expect(res.body.data.reviews.length).toBe(1);
    expect(res.body.data.reviews[0].rating).toBe(5);
  });

  it("filters reviews with images", async () => {
    const res = await request(app)
      .get(`/api/v1/staff/products/${sku}/reviews?hasImages=true`)
      .set("Cookie", "petly-session=valid-cookie")
      .expect(200);

    expect(res.body.data.reviews.length).toBe(1);
    expect(res.body.data.reviews[0].images.length).toBe(1);
  });
});

