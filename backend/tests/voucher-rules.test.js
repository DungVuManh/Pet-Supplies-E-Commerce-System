import { describe, expect, it } from "vitest";
import {
 calculateDiscount, customerKey, evaluateVoucher, normalizePhone, normalizeVoucherCode,
 vietnamDate, vietnamDayEnd, vietnamDayStart, vietnamLastDate, voucherState,
} from "../src/common/voucher-rules.js";

const startAt = new Date("2026-11-01T00:00:00Z");
const endAt = new Date("2026-12-01T00:00:00Z");
const now = new Date("2026-11-15T00:00:00Z");
const voucher = (patch = {}) => ({ code: "SALE", type: "percent", value: 10, minOrderAmount: 0, startAt, endAt, isActive: true, usedCount: 0, ...patch });

describe("calculateDiscount", () => {
 it("rounds a percentage down to whole VND", () => {
  expect(calculateDiscount(voucher(), 99999)).toBe(9999);
 });

 it("limits a percentage by its cap", () => {
  expect(calculateDiscount(voucher({ maxDiscount: 50000 }), 1000000)).toBe(50000);
  expect(calculateDiscount(voucher({ maxDiscount: 50000 }), 100000)).toBe(10000);
 });

 it("never takes more than the subtotal off", () => {
  expect(calculateDiscount(voucher({ type: "fixed", value: 50000 }), 30000)).toBe(30000);
  expect(calculateDiscount(voucher({ value: 100 }), 30000)).toBe(30000);
 });

 it("ignores a cap on a fixed voucher", () => {
  expect(calculateDiscount(voucher({ type: "fixed", value: 50000, maxDiscount: 1000 }), 100000)).toBe(50000);
 });

 it("stays a whole number between 0 and the subtotal over random subtotals", () => {
  for (let run = 0; run < 2000; run += 1) {
   const subtotal = Math.floor(Math.random() * 50_000_000);
   const value = 1 + Math.floor(Math.random() * 100);
   for (const candidate of [voucher({ value }), voucher({ value, maxDiscount: 1 + Math.floor(Math.random() * 100000) }), voucher({ type: "fixed", value: 1 + Math.floor(Math.random() * 1_000_000) })]) {
    const discount = calculateDiscount(candidate, subtotal);
    expect(Number.isInteger(discount)).toBe(true);
    expect(discount).toBeGreaterThanOrEqual(0);
    expect(discount).toBeLessThanOrEqual(subtotal);
   }
  }
 });
});

describe("voucherState", () => {
 it.each([
  ["active", {}, now],
  ["disabled", { isActive: false }, now],
  ["scheduled", {}, new Date(startAt.getTime() - 1)],
  ["expired", {}, new Date(endAt.getTime() + 1)],
  ["exhausted", { usageLimit: 3, usedCount: 3 }, now],
 ])("reports %s", (state, patch, moment) => {
  expect(voucherState(voucher(patch), moment)).toBe(state);
 });

 it("treats the start as inside the window and the end as outside it", () => {
  expect(voucherState(voucher(), startAt)).toBe("active");
  expect(voucherState(voucher(), endAt)).toBe("expired");
 });

 it("treats a document with no usedCount as unused", () => {
  const { usedCount: _unused, ...legacy } = voucher({ usageLimit: 1 });
  expect(voucherState(legacy, now)).toBe("active");
 });

 it("shows turned off ahead of every other state", () => {
  expect(voucherState(voucher({ isActive: false, usageLimit: 1, usedCount: 1 }), endAt)).toBe("disabled");
 });
});

describe("evaluateVoucher", () => {
 it("applies an active voucher", () => {
  expect(evaluateVoucher(voucher(), { subtotal: 100000, now })).toEqual({ applies: true, discount: 10000, reason: null });
 });

 it("applies at exactly the minimum, and reports the minimum just below it", () => {
  expect(evaluateVoucher(voucher({ minOrderAmount: 100000 }), { subtotal: 100000, now }).applies).toBe(true);
  expect(evaluateVoucher(voucher({ minOrderAmount: 100000 }), { subtotal: 99999, now })).toEqual({
   applies: false, discount: 0, reason: "below_minimum", minOrderAmount: 100000,
  });
 });

 it.each([
  ["disabled", { isActive: false }],
  ["expired", { startAt: new Date("2026-01-01"), endAt: new Date("2026-02-01") }],
  ["scheduled", { startAt: new Date("2027-01-01"), endAt: new Date("2027-02-01") }],
  ["exhausted", { usageLimit: 1, usedCount: 1 }],
 ])("refuses a %s voucher", (reason, patch) => {
  expect(evaluateVoucher(voucher(patch), { subtotal: 100000, now })).toEqual({ applies: false, discount: 0, reason });
 });

 it("does not spend a use on a discount that rounds to nothing", () => {
  expect(evaluateVoucher(voucher({ value: 1 }), { subtotal: 50, now })).toEqual({ applies: false, discount: 0, reason: "no_discount" });
 });
});

describe("customer identity", () => {
 it("treats differently formatted phones as one guest", () => {
  const expected = "guest:0912345678";
  for (const phone of ["0912345678", "0912 345 678", "0912.345.678", "0912-345-678", "+84912345678", " +84 912 345 678 "]) {
   expect(customerKey({ phone })).toBe(expected);
  }
 });

 it("prefers the account over a phone number", () => {
  expect(customerKey({ userId: "abc", phone: "0912345678" })).toBe("user:abc");
 });

 it("cannot identify an invalid or missing phone", () => {
  for (const phone of ["", "123", "not-a-phone", null, undefined, 912345678]) {
   expect(normalizePhone(phone)).toBeNull();
   expect(customerKey({ phone })).toBeNull();
  }
 });
});

describe("codes and Vietnam dates", () => {
 it("normalizes codes", () => {
  expect(normalizeVoucherCode(" petly10 ")).toBe("PETLY10");
  expect(normalizeVoucherCode(undefined)).toBe("");
 });

 it("treats an end date as the end of that day in Vietnam", () => {
  expect(vietnamDayStart("2026-11-03").toISOString()).toBe("2026-11-02T17:00:00.000Z");
  expect(vietnamDayEnd("2026-11-03").toISOString()).toBe("2026-11-03T17:00:00.000Z");
  expect(vietnamLastDate(vietnamDayEnd("2026-11-03"))).toBe("2026-11-03");
  expect(vietnamDate(vietnamDayStart("2026-11-03"))).toBe("2026-11-03");
 });
});
