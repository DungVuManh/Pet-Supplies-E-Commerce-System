import assert from "node:assert/strict";
import test from "node:test";
import { activityDay, activityTime, growthText, parseOverviewPreset } from "../features/admin/overview.ts";
import { defaultReportPeriod, formatPeriodDate, parseReportPeriod, reportHref } from "../features/admin/report-period.ts";
import { adminStatusTones, overviewActivityStatusLabels } from "../features/admin/status.ts";

test("an unknown period in the URL falls back to this month", () => {
  assert.equal(parseOverviewPreset("last-month"), "last-month");
  assert.equal(parseOverviewPreset("forever"), "this-month");
  assert.equal(parseOverviewPreset(["last-month"]), "this-month");
  assert.equal(parseOverviewPreset(undefined), "this-month");
});

test("growth shows a sign and a Vietnamese decimal, or a dash without a comparison", () => {
  assert.equal(growthText(12.8), "+12,8% so với kỳ trước");
  assert.equal(growthText(-5), "-5% so với kỳ trước");
  assert.equal(growthText(0), "0% so với kỳ trước");
  assert.equal(growthText(null), "— so với kỳ trước");
});

test("a report opens on the period in its URL", () => {
  assert.deepEqual(parseReportPeriod({ from: "2026-11-01", to: "2026-11-03" }), { from: "2026-11-01", to: "2026-11-03", label: "01/11/2026 – 03/11/2026" });
  assert.equal(reportHref("/admin/reports/finance", { from: "2026-11-01", to: "2026-11-03" }), "/admin/reports/finance?from=2026-11-01&to=2026-11-03");
});

test("a missing or invalid report period falls back to the default range", () => {
  for (const params of [{}, { from: "2026-11-01" }, { from: "2026-11-05", to: "2026-11-01" }, { from: "2026-02-30", to: "2026-03-01" }, { from: "x", to: "y" }, { from: ["2026-11-01"], to: "2026-11-03" }]) {
    assert.deepEqual(parseReportPeriod(params), defaultReportPeriod, JSON.stringify(params));
  }
});

test("activity times use Asia/Ho_Chi_Minh, including across midnight", () => {
  assert.equal(activityTime("2026-10-31T17:30:00.000Z"), "01/11 · 00:30");
  assert.equal(formatPeriodDate("2026-11-03"), "03/11/2026");
  const now = "2026-11-03T03:00:00.000Z";
  assert.equal(activityDay("2026-11-02T17:30:00.000Z", now), "Hôm nay");
  assert.equal(activityDay("2026-11-02T16:30:00.000Z", now), "Hôm qua");
  assert.equal(activityDay("2026-10-29T03:00:00.000Z", now), "5 ngày trước");
});

test("every activity status has a designed badge", () => {
  for (const label of Object.values(overviewActivityStatusLabels)) assert.ok(label in adminStatusTones, label);
  assert.equal(overviewActivityStatusLabels.active, "Hoạt động");
  assert.equal(overviewActivityStatusLabels.pending, "Chờ xử lý");
  assert.equal(overviewActivityStatusLabels.success, "Thành công");
});
