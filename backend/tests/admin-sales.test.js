import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository, User } from "../src/models/user.model.js";
import { Order } from "../src/models/order.model.js";

const cookie = "petly-session=test-session";
let role, app, aggregateSpy;

const mockAggregationResult = () => [
  {
    overview: [{ totalOrders: 10, totalRevenue: 5000000 }],
    dailyVolume: [
      { _id: "2026-10-01", qty: 4 },
      { _id: "2026-10-02", qty: 6 },
    ],
    byProduct: [
      {
        _id: "SKU-01",
        sku: "SKU-01",
        name: "Sản phẩm A",
        quantity: 10,
        revenue: 5000000,
        orderIds: ["order1", "order2"],
        staffIds: [],
        channels: ["online"],
      },
    ],
    byStaff: [
      {
        _id: null,
        orders: 10,
        revenue: 5000000,
        items: [[{ name: "Sản phẩm A", qty: 10 }]],
      },
    ],
    byOrderTime: [
      { createdAt: new Date("2026-10-01T10:00:00Z"), total: 2000000, itemQty: 4 },
      { createdAt: new Date("2026-10-02T10:00:00Z"), total: 3000000, itemQty: 6 },
    ],
  },
];

const mockCategoryResult = () => [
  {
    _id: "Thức ăn cho chó",
    category: "Thức ăn cho chó",
    revenue: 5000000,
    quantity: 10,
    orderIds: ["order1", "order2"],
  },
];

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

  vi.spyOn(User, "find").mockReturnValue({
    select: () => ({
      lean: async () => [],
    }),
  });

  let callCount = 0;
  aggregateSpy = vi.spyOn(Order, "aggregate").mockImplementation(() => {
    callCount += 1;
    return {
      option: async () => (callCount % 2 === 1 ? mockAggregationResult() : mockCategoryResult()),
    };
  });
});

afterEach(() => vi.restoreAllMocks());

describe("Admin Sales Summary API", () => {
  const url = "/api/v1/admin/reports/sales/summary?dateFrom=2026-10-01&dateTo=2026-10-12";

  it("rejects unauthenticated requests with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get(url).expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(aggregateSpy).not.toHaveBeenCalled();
  });

  it("rejects non-admin roles (customer, staff) with 403 FORBIDDEN", async () => {
    for (const testRole of ["customer", "staff"]) {
      role = testRole;
      const res = await request(app).get(url).set("Cookie", cookie).expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
    expect(aggregateSpy).not.toHaveBeenCalled();
  });

  it("validates required dateFrom and dateTo queries", async () => {
    await request(app)
      .get("/api/v1/admin/reports/sales/summary?dateFrom=2026-10-01")
      .set("Cookie", cookie)
      .expect(400);

    await request(app)
      .get("/api/v1/admin/reports/sales/summary?dateFrom=invalid&dateTo=2026-10-12")
      .set("Cookie", cookie)
      .expect(400);

    await request(app)
      .get("/api/v1/admin/reports/sales/summary?dateFrom=2026-10-15&dateTo=2026-10-10")
      .set("Cookie", cookie)
      .expect(400);
  });

  it("calculates KPIs, daily volume, products, categories, staff and time sales", async () => {
    const res = await request(app)
      .get(url)
      .set("Cookie", cookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // Check KPIs
    expect(data.kpis.itemsSold).toBe(10);
    expect(data.kpis.averageOrderValue).toBe(500000); // 5,000,000 / 10 orders
    expect(data.kpis.topCategory).toBe("Thức ăn cho chó");

    // Check Bar Chart daily sales volume
    expect(Array.isArray(data.dailySalesVolume)).toBe(true);
    expect(data.dailySalesVolume.length).toBe(12); // Oct 01 to Oct 12
    const oct1 = data.dailySalesVolume.find((d) => d.label === "01/10");
    expect(oct1?.value).toBe(4);

    // Check productSales
    expect(data.productSales).toHaveLength(1);
    expect(data.productSales[0].sku).toBe("SKU-01");
    expect(data.productSales[0].revenue).toBe(5000000);

    // Check categorySales
    expect(data.categorySales).toHaveLength(1);
    expect(data.categorySales[0].category).toBe("Thức ăn cho chó");

    // Check staffSales
    expect(data.staffSales).toHaveLength(1);
    expect(data.staffSales[0].staff).toBe("Website (Trực tuyến)");

    // Check timeSales
    expect(Array.isArray(data.timeSales)).toBe(true);
    expect(data.timeSales.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty period gracefully with zeroed statistics", async () => {
    aggregateSpy.mockImplementation(() => ({
      option: async () => [],
    }));

    const res = await request(app)
      .get(url)
      .set("Cookie", cookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis.itemsSold).toBe(0);
    expect(res.body.data.kpis.averageOrderValue).toBe(0);
    expect(res.body.data.productSales).toEqual([]);
    expect(res.body.data.categorySales).toEqual([]);
    expect(res.body.data.staffSales).toEqual([]);
  });
});

