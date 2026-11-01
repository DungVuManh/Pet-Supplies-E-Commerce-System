import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository } from "../src/models/user.model.js";
import { Order } from "../src/models/order.model.js";

const cookie = "petly-session=test-session";
let role, app, aggregateSpy;

const mockAggregationResult = () => [
  {
    gross: [{ revenue: 132650000, orders: 286 }],
    cancelledPaid: [{ amount: 4200000, orders: 8 }],
    onlinePending: [{ amount: 5000000, orders: 10 }],
    codPending: [{ amount: 3450000, orders: 9 }],
    dailyGross: [{ _id: "2026-10-01", value: 50000000 }],
    dailyRefund: [{ _id: "2026-10-02", value: 2000000 }],
    byMethod: [
      { _id: "ONLINE", transactions: 150, income: 90000000, refund: 2000000, pending: 10 },
      { _id: "COD", transactions: 100, income: 40000000, refund: 2000000, pending: 9 },
      { _id: "CASH", transactions: 36, income: 2650000, refund: 0, pending: 0 },
    ],
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

  aggregateSpy = vi.spyOn(Order, "aggregate").mockImplementation(() => ({
    option: async () => mockAggregationResult(),
  }));
});

afterEach(() => vi.restoreAllMocks());

describe("Admin Finance Summary API", () => {
  const url = "/api/v1/admin/reports/finance/summary?dateFrom=2026-10-01&dateTo=2026-10-12";

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
    // Missing dateTo
    let res = await request(app)
      .get("/api/v1/admin/reports/finance/summary?dateFrom=2026-10-01")
      .set("Cookie", cookie)
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");

    // Invalid date format
    res = await request(app)
      .get("/api/v1/admin/reports/finance/summary?dateFrom=invalid&dateTo=2026-10-12")
      .set("Cookie", cookie)
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");

    // dateFrom > dateTo
    res = await request(app)
      .get("/api/v1/admin/reports/finance/summary?dateFrom=2026-10-15&dateTo=2026-10-10")
      .set("Cookie", cookie)
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");

    // date range > 366 days
    res = await request(app)
      .get("/api/v1/admin/reports/finance/summary?dateFrom=2024-01-01&dateTo=2025-02-15")
      .set("Cookie", cookie)
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns calculated finance metrics, chart series, payment channels and sets Cache-Control: no-store", async () => {
    const res = await request(app).get(url).set("Cookie", cookie).expect(200);

    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.success).toBe(true);

    const { data } = res.body;
    expect(data.period).toEqual({ dateFrom: "2026-10-01", dateTo: "2026-10-12" });
    expect(data.grossRevenue).toBe(132650000);
    expect(data.grossOrders).toBe(286);
    expect(data.cancelledPaidAmount).toBe(4200000);
    expect(data.cancelledPaidOrders).toBe(8);
    expect(data.refunds).toBe(4200000);
    expect(data.refundTransactions).toBe(8);
    expect(data.netRevenue).toBe(132650000 - 4200000); // 128450000
    expect(data.onlinePendingAmount).toBe(5000000);
    expect(data.onlinePendingOrders).toBe(10);
    expect(data.codPendingCollectionAmount).toBe(3450000);
    expect(data.codPendingCollectionOrders).toBe(9);
    expect(data.pendingReconciliationAmount).toBe(8450000);
    expect(data.pendingReconciliationTransactions).toBe(19);
    expect(data.pendingReconciliation).toBe(8450000);
    expect(data.pendingTransactions).toBe(19);

    // Verify chart
    expect(Array.isArray(data.chart)).toBe(true);
    expect(data.chart.length).toBe(12); // 01/10 to 12/10
    expect(data.chart[0]).toEqual({ label: "01/10", value: 50 }); // 50,000,000 = 50 tr
    expect(data.chart[1]).toEqual({ label: "02/10", value: 48 }); // 50tr - 2tr = 48 tr

    // Verify paymentChannels
    expect(Array.isArray(data.paymentChannels)).toBe(true);
    expect(data.paymentChannels.length).toBe(3);
    expect(data.paymentChannels[0]).toMatchObject({
      channel: "ONLINE",
      income: 90000000,
      refund: 2000000,
      transactions: 150,
      net: 88000000,
      status: "Chờ đối soát",
    });
    expect(data.paymentChannels[1]).toMatchObject({
      channel: "COD",
      income: 40000000,
      refund: 2000000,
      transactions: 100,
      net: 38000000,
      status: "Chờ đối soát",
    });
    expect(data.paymentChannels[2]).toMatchObject({
      channel: "CASH",
      income: 2650000,
      refund: 0,
      transactions: 36,
      net: 2650000,
      status: "Đã đối soát",
    });

    // Verify pipeline matches expected structure
    const pipeline = aggregateSpy.mock.calls[0][0];
    expect(pipeline[0].$match.creationState).toEqual({ $ne: "pending" });
    expect(pipeline[0].$match.createdAt).toBeDefined();
    expect(pipeline[1].$facet).toBeDefined();
    expect(pipeline[1].$facet.gross).toBeDefined();
    expect(pipeline[1].$facet.cancelledPaid).toBeDefined();
    expect(pipeline[1].$facet.onlinePending).toBeDefined();
    expect(pipeline[1].$facet.codPending).toBeDefined();
    expect(pipeline[1].$facet.dailyGross).toBeDefined();
    expect(pipeline[1].$facet.dailyRefund).toBeDefined();
    expect(pipeline[1].$facet.byMethod).toBeDefined();
  });

  it("safely handles empty aggregation results without crashing", async () => {
    aggregateSpy.mockImplementation(() => ({
      option: async () => [
        {
          gross: [],
          cancelledPaid: [],
          onlinePending: [],
          codPending: [],
          dailyGross: [],
          dailyRefund: [],
          byMethod: [],
        },
      ],
    }));

    const res = await request(app).get(url).set("Cookie", cookie).expect(200);

    expect(res.body.data.grossRevenue).toBe(0);
    expect(res.body.data.grossOrders).toBe(0);
    expect(res.body.data.refunds).toBe(0);
    expect(res.body.data.netRevenue).toBe(0);
    expect(res.body.data.pendingReconciliation).toBe(0);
    expect(res.body.data.chart.length).toBe(12);
    expect(res.body.data.chart[0]).toEqual({ label: "01/10", value: 0 });
    expect(res.body.data.paymentChannels.length).toBe(3);
    expect(res.body.data.paymentChannels[0].net).toBe(0);
  });
});
