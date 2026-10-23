import assert from "node:assert/strict";
import test from "node:test";
import { adminStatusTone, adminStatusTones } from "../features/admin/status.ts";
import { isLowStock, lowStockLevels, lowStockTotal, stockLevels } from "../features/admin/mock/inventory.ts";
import { cumulativeRevenue, overview, recentActivity } from "../features/admin/mock/overview.ts";

test("dashboard revenue chart ends at the net revenue KPI and only grows", () => {
  assert.equal(Math.round(cumulativeRevenue.at(-1)?.value * 1_000_000), overview.netRevenue);
  for (let i = 1; i < cumulativeRevenue.length; i += 1) assert.ok(cumulativeRevenue[i].value >= cumulativeRevenue[i - 1].value);
});

test("dashboard stock alert lists only below-threshold items, within the low-stock total", () => {
  assert.deepEqual(lowStockLevels().map((item) => item.sku), ["CT-BEN-10L", "KG-CL-M", "PT-HN-M"]);
  assert.ok(lowStockLevels().length <= lowStockTotal);
  assert.ok(stockLevels.filter((item) => !isLowStock(item)).every((item) => item.available >= item.threshold));
});

test("every recent activity row uses a mapped status and an admin link", () => {
  for (const row of recentActivity) {
    assert.ok(row.status in adminStatusTones, row.status);
    assert.match(row.href, /^\/admin\//);
  }
});

test("admin status labels map to the designed badge tones", () => {
  const allowed = new Set(["success", "warning", "info", "danger", "neutral"]);
  for (const [status, tone] of Object.entries(adminStatusTones)) assert.ok(allowed.has(tone), `${status} → ${tone}`);
  assert.equal(adminStatusTone("Hoạt động"), "success");
  assert.equal(adminStatusTone("Sắp hết hàng"), "warning");
  assert.equal(adminStatusTone("Đã khóa"), "danger");
  assert.equal(adminStatusTone("Đã ẩn"), "neutral");
});
