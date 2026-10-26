import request from "supertest";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
import * as firebase from "../src/config/firebase.js";
import { userRepository } from "../src/models/user.model.js";
import { Order } from "../src/models/order.model.js";
import { parseAnalyticsQuery } from "../src/validators/staff-analytics.validator.js";
import { fillSeries, previousPeriod, summaryDto, salesMatch } from "../src/controllers/staff-analytics.helpers.js";

const actor = new mongoose.Types.ObjectId("b".repeat(24));
const now = new Date("2026-10-26T03:00:00Z");
let app, role, auth, aggregate;
const salesResult = () => [{ invalid: [], summary: [{ revenue: 20000, orderCount: 2 }],
  series: [{ _id: "2026-10-26", value: 20000 }], topProducts: [] }];
beforeEach(() => {
  app = createApp(parseEnvironment({ NODE_ENV: "test" })); role = "staff";
  auth = { verifySessionCookie: vi.fn().mockResolvedValue({ uid: "staff" }) };
  vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue(auth);
  vi.spyOn(userRepository, "findByUid").mockImplementation(async () => role === "missing" ? null : ({ _id: actor, role, fullName: "Staff" }));
  aggregate = vi.spyOn(Order, "aggregate").mockImplementation(() => ({ option: async () => salesResult() }));
});
afterEach(() => vi.restoreAllMocks());
const get = (query = "") => request(app).get(`/api/v1/staff/analytics/sales${query}`).set("Cookie", "petly-session=test");

describe("analytics date contract", () => {
  it("uses Vietnam day boundaries, default 7 days and equal previous period", () => {
    const p = parseAnalyticsQuery({}, "sales", new Date("2026-10-25T18:00:00Z"));
    expect(p.dateTo).toBe("2026-10-26"); expect(p.dateFrom).toBe("2026-10-20");
    expect(p.start.toISOString()).toBe("2026-10-19T17:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-10-26T17:00:00.000Z");
    expect(previousPeriod(p).dateTo).toBe("2026-10-19");
  });
  it.each([{ dateFrom: "2026-02-30", dateTo: "2026-03-01" }, { dateFrom: "2026-10-01" },
    { dateFrom: "2026-10-02", dateTo: "2026-10-01" }, { dateFrom: "2024-01-01", dateTo: "2025-01-01" },
    { staffId: "x" }, { groupBy: "year" }, { dateFrom: ["2026-10-01"] }, { dateTo: {} }])("rejects invalid query %j", (query) => {
    expect(() => parseAnalyticsQuery(query, "sales", now)).toThrowError(/khoảng ngày/);
  });
  it("fills zero buckets across month/year and Monday week boundaries", () => {
    const p = parseAnalyticsQuery({ dateFrom: "2025-12-31", dateTo: "2026-01-05", groupBy: "week" }, "sales", now);
    expect(fillSeries(p, [])).toEqual([{ date: "2025-12-29", value: 0 }, { date: "2026-01-05", value: 0 }]);
    expect(summaryDto()).toEqual({ revenue: 0, orderCount: 0, averageOrderValue: null });
    expect(() => summaryDto({ revenue: Number.MAX_SAFE_INTEGER + 1, orderCount: 1 })).toThrow();
    expect(salesMatch(p)).toMatchObject({ creationState: { $ne: "pending" }, paymentStatus: "paid", orderStatus: { $in: ["completed", "delivered"] } });
  });
});
describe("sales API", () => {
  it("returns bounded report and keeps bootstrap contract", async () => {
    const r = await get("?dateFrom=2026-10-20&dateTo=2026-10-26").expect(200);
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(r.body.data.summary).toEqual({ revenue: 20000, orderCount: 2, averageOrderValue: 10000 });
    expect(r.body.data.series).toHaveLength(7);
    expect(r.body.data.scope).toBe("store");
    const bootstrap = await request(app).get("/api/v1/staff/dashboard").set("Cookie", "petly-session=test").expect(200);
    expect(Object.keys(bootstrap.body.data)).toEqual(["user"]);
  });
  it.each(["customer", "admin", "unknown", "missing"])("rejects %s before reading analytics", async (value) => {
    role = value; await get().expect(value === "missing" ? 409 : 403); expect(aggregate).not.toHaveBeenCalled();
  });
  it("rejects guests/revoked sessions with no-store", async () => {
    const r = await request(app).get("/api/v1/staff/analytics/sales").expect(401);
    expect(r.headers["cache-control"]).toBe("no-store");
    auth.verifySessionCookie.mockRejectedValue({ code: "auth/session-cookie-revoked" });
    await get().expect(401); expect(aggregate).not.toHaveBeenCalled();
  });
  it("rejects duplicate/unknown query and no partial range", async () => {
    for (const q of ["?groupBy=day&groupBy=week", "?userId=x", "?dateFrom=2026-10-01"]) await get(q).expect(400);
    expect(aggregate).not.toHaveBeenCalled();
  });
  it("returns null comparison for no previous revenue and rejects corrupt amounts", async () => {
    aggregate.mockImplementation(() => ({ option: async () => [{ invalid: [], summary: [], series: [], topProducts: [] }] }));
    const r = await get().expect(200); expect(r.body.data.growthPercent).toBeNull();
    aggregate.mockImplementation(() => ({ option: async () => [{ ...salesResult()[0], invalid: [{ count: 1 }] }] }));
    const bad = await get().expect(503); expect(bad.body.error.code).toBe("ANALYTICS_UNAVAILABLE");
  });
  it("does not leak driver errors or turn failed reads into empty reports", async () => {
    aggregate.mockImplementation(() => ({ option: async () => { throw new Error("secret URI"); } }));
    const r = await get().expect(503); expect(JSON.stringify(r.body)).not.toContain("secret");
  });
});
