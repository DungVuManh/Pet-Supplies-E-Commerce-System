import assert from "node:assert/strict";
import { test } from "node:test";
import { adminStatusTone, voucherStateLabels } from "../features/admin/status.ts";
import { validateVoucher } from "../features/admin/validation.ts";
import { voucherDiscount, voucherPreview, voucherUsageText, voucherValueText } from "../features/admin/voucher.ts";

const valid = {
  code: "PET50K", name: "Giảm 50K", type: "fixed", value: "50.000", maxDiscount: "", minOrderAmount: "500.000",
  startDate: "2026-11-01", endDate: "2026-11-30", usageLimit: "", oncePerCustomer: true, isPublic: false,
};
const errorsFor = (patch) => Object.keys(validateVoucher({ ...valid, ...patch }));

test("a complete voucher has no errors, for both types", () => {
  assert.deepEqual(validateVoucher(valid), {});
  assert.deepEqual(validateVoucher({ ...valid, type: "percent", value: "10", maxDiscount: "50.000" }), {});
});

test("the code matches the server's rule", () => {
  for (const code of ["", "ab", "có-dấu", "HAS SPACE", "x".repeat(31)]) assert.deepEqual(errorsFor({ code }), ["code"], code);
  for (const code of ["abc", "PET-50K", " pet50k "]) assert.deepEqual(errorsFor({ code }), [], code);
});

test("a percent is a whole number from 1 to 100", () => {
  for (const value of ["", "0", "101", "5.5", "10,5", "abc"]) assert.deepEqual(errorsFor({ type: "percent", value }), ["value"], value);
  for (const value of ["1", "100"]) assert.deepEqual(errorsFor({ type: "percent", value }), [], value);
});

test("a fixed amount is at least 1 and may use thousand separators", () => {
  for (const value of ["", "0", "abc", "-5"]) assert.deepEqual(errorsFor({ value }), ["value"], value);
  assert.deepEqual(errorsFor({ value: "1" }), []);
});

test("optional limits may be empty but not invalid", () => {
  assert.deepEqual(errorsFor({ type: "percent", value: "10", maxDiscount: "0" }), ["maxDiscount"]);
  assert.deepEqual(errorsFor({ usageLimit: "0" }), ["usageLimit"]);
  assert.deepEqual(errorsFor({ usageLimit: "x" }), ["usageLimit"]);
  assert.deepEqual(errorsFor({ minOrderAmount: "x" }), ["minOrderAmount"]);
  assert.deepEqual(errorsFor({ minOrderAmount: "", usageLimit: "" }), []);
});

test("a cap hidden by switching to a fixed amount is not checked", () => {
  assert.deepEqual(errorsFor({ type: "fixed", maxDiscount: "not checked" }), []);
});

test("dates are required, and a single day is allowed", () => {
  assert.deepEqual(errorsFor({ startDate: "" }), ["startDate"]);
  assert.deepEqual(errorsFor({ endDate: "" }), ["endDate"]);
  assert.deepEqual(errorsFor({ startDate: "2026-11-30", endDate: "2026-11-01" }), ["endDate"]);
  assert.deepEqual(errorsFor({ startDate: "2026-11-30", endDate: "2026-11-30" }), []);
});

test("the name is required and limited", () => {
  assert.deepEqual(errorsFor({ name: "  " }), ["name"]);
  assert.deepEqual(errorsFor({ name: "x".repeat(101) }), ["name"]);
});

test("voucher values and usage read as designed", () => {
  const space = (text) => text.replace(/\s/g, " ");
  assert.equal(space(voucherValueText({ type: "percent", value: 10, maxDiscount: 50000 })), "Giảm 10%, tối đa 50.000 ₫");
  assert.equal(voucherValueText({ type: "percent", value: 10, maxDiscount: null }), "Giảm 10%");
  assert.equal(space(voucherValueText({ type: "fixed", value: 50000, maxDiscount: null })), "Giảm 50.000 ₫");
  assert.equal(voucherUsageText(12, 100), "12 / 100");
  assert.equal(voucherUsageText(12, null), "12 / Không giới hạn");
});

test("the preview uses the server's formula and the minimum order", () => {
  assert.equal(voucherDiscount({ type: "percent", value: 10, maxDiscount: null }, 99999), 9999);
  assert.equal(voucherDiscount({ type: "percent", value: 10, maxDiscount: 5000 }, 100000), 5000);
  assert.equal(voucherDiscount({ type: "fixed", value: 50000, maxDiscount: null }, 30000), 30000);
  assert.equal(voucherPreview({ type: "fixed", value: 50000, maxDiscount: null }, 0).replace(/\s/g, " "), "Đơn 500.000 ₫ giảm 50.000 ₫");
  assert.equal(voucherPreview({ type: "percent", value: 10, maxDiscount: null }, 200000).replace(/\s/g, " "), "Đơn 200.000 ₫ giảm 20.000 ₫");
});

test("every voucher state has a badge", () => {
  for (const state of ["active", "scheduled", "expired", "disabled", "exhausted"]) assert.ok(adminStatusTone(voucherStateLabels[state]), state);
});
