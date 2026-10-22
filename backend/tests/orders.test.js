import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/config/env.js";
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
