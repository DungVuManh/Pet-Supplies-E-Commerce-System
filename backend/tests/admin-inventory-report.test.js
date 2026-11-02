import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository } from "../src/models/user.model.js";
import { Product } from "../src/models/product.model.js";
import { Order } from "../src/models/order.model.js";
import { Category } from "../src/models/category.model.js";
import { Setting } from "../src/models/setting.model.js";

const cookie = "petly-session=test-session";
let role, app;

beforeEach(() => {
  role = "admin";
  app = createApp(parseEnvironment({ NODE_ENV: "test" }));

  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue({
    verifySessionCookie: vi.fn().mockResolvedValue({ uid: "admin-uid" }),
  });

  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => ({
    _id: "a".repeat(24),
    role,
    fullName: "Admin test",
    email: "admin@example.test",
    phone: "0912345678",
  }));

  vi.spyOn(Setting, "findById").mockReturnValue({
    lean: async () => ({ lowStockThreshold: 10 }),
  });

  vi.spyOn(Category, "find").mockReturnValue({
    select: () => ({
      sort: () => ({
        lean: async () => [
          { name: "Thức ăn cho chó" },
          { name: "Thức ăn cho mèo" },
        ],
      }),
    }),
  });

  vi.spyOn(Order, "aggregate").mockResolvedValue([
    { _id: "SKU-01", outQty: 5, orderIds: ["ord1", "ord2"] },
  ]);

  vi.spyOn(Product, "aggregate").mockResolvedValue([
    {
      sku: "SKU-01",
      name: "Sản phẩm A",
      category: "Thức ăn cho chó",
      closing: 20,
    },
    {
      sku: "SKU-02",
      name: "Sản phẩm B",
      category: "Thức ăn cho mèo",
      closing: 5,
    },
  ]);
});

afterEach(() => vi.restoreAllMocks());

describe("Admin Inventory Report API", () => {
  const url = "/api/v1/admin/reports/inventory?dateFrom=2026-10-01&dateTo=2026-10-31";

  it("rejects unauthenticated requests with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get(url).expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects non-admin roles (customer, staff) with 403 FORBIDDEN", async () => {
    for (const testRole of ["customer", "staff"]) {
      role = testRole;
      const res = await request(app).get(url).set("Cookie", cookie).expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
  });

  it("returns inventory KPIs, categories, paginated items and enforces closing = opening + in - out", async () => {
    const res = await request(app).get(url).set("Cookie", cookie).expect(200);
    expect(res.body.success).toBe(true);

    const { kpis, items, pagination, categories } = res.body.data;

    // Check KPIs
    expect(kpis.catalogSkus).toBe(2);
    expect(kpis.closingTotal).toBe(25);
    expect(kpis.lowStockCount).toBe(1); // SKU-02 has closing 5 <= threshold 10
    expect(kpis.outTotal).toBe(5);
    expect(kpis.outOrders).toBe(2);

    // Check Categories
    expect(categories).toContain("Tất cả danh mục");
    expect(categories).toContain("Thức ăn cho chó");

    // Check Pagination
    expect(pagination.total).toBe(2);
    expect(pagination.page).toBe(1);

    // Check formula: closing = opening + inQty - outQty for every row
    expect(items).toHaveLength(2);
    for (const row of items) {
      expect(row.closing).toBe(row.opening + row.inQty - row.outQty);
    }

    // Check SKU-01 specific numbers
    const sku1 = items.find((i) => i.sku === "SKU-01");
    expect(sku1.closing).toBe(20);
    expect(sku1.outQty).toBe(5);
    expect(sku1.opening).toBe(25); // 20 - 0 + 5 = 25
    expect(sku1.warning).toBe("Đủ hàng");

    // Check SKU-02 specific numbers (low stock)
    const sku2 = items.find((i) => i.sku === "SKU-02");
    expect(sku2.closing).toBe(5);
    expect(sku2.warning).toBe("Sắp hết");
  });

  it("filters by query keyword and category", async () => {
    // Filter by query 'SKU-02'
    const resQ = await request(app)
      .get(`${url}&q=SKU-02`)
      .set("Cookie", cookie)
      .expect(200);

    expect(resQ.body.data.items).toHaveLength(1);
    expect(resQ.body.data.items[0].sku).toBe("SKU-02");

    // Filter by category 'Thức ăn cho chó'
    const resCat = await request(app)
      .get(`${url}&category=${encodeURIComponent("Thức ăn cho chó")}`)
      .set("Cookie", cookie)
      .expect(200);

    expect(resCat.body.data.items).toHaveLength(1);
    expect(resCat.body.data.items[0].sku).toBe("SKU-01");
  });
});

