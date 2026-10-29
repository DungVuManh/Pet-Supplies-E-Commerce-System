import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate, formatDateTime, formatVnd } from "../lib/format.ts";

test("formats VND like the Admin designs", () => {
  assert.equal(formatVnd(1250000), "1.250.000 ₫");
  assert.equal(formatVnd(0), "0 ₫");
});

test("formats dates in Vietnam time regardless of the host time zone", () => {
  // 17:30 UTC on 11/10 is 00:30 on 12/10 in Vietnam.
  assert.equal(formatDate("2026-10-11T17:30:00Z"), "12/10/2026");
  assert.equal(formatDateTime("2026-10-11T17:30:00Z"), "12/10/2026 · 00:30");
  assert.equal(formatDateTime(new Date("2026-10-12T03:48:00Z")), "12/10/2026 · 10:48");
  assert.equal(formatDateTime(Date.UTC(2026, 0, 5, 12, 5)), "05/01/2026 · 19:05");
});

test("shows a dash for invalid dates", () => {
  assert.equal(formatDate("not a date"), "—");
  assert.equal(formatDateTime(Number.NaN), "—");
});
