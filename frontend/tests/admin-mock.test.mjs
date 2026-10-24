import assert from "node:assert/strict";
import test from "node:test";
import { adminStatusTone, adminStatusTones } from "../features/admin/status.ts";
import { isLowStock, lowStockLevels, lowStockTotal, stockLevels } from "../features/admin/mock/inventory.ts";
import { cumulativeRevenue, overview, recentActivity } from "../features/admin/mock/overview.ts";
import { countUsers, filterUsers, getUser, users } from "../features/admin/mock/users.ts";

const allUsers = { tab: "all", query: "", role: "all", status: "all" };

test("user tab counts match the design and identifiers are unique", () => {
  assert.equal(countUsers("all"), 348);
  assert.equal(countUsers("customer"), 342);
  assert.equal(countUsers("staff"), 6);
  assert.equal(new Set(users.map((user) => user.id)).size, users.length);
  assert.ok(users.every((user) => /^0\d{3} \d{3} \d{3}$/.test(user.phone)), "phones use the 0901 234 567 format");
});

test("the first user page shows the six designed rows in order", () => {
  assert.deepEqual(filterUsers(allUsers).slice(0, 6).map((user) => user.id), ["KH0001", "KH0002", "NV0001", "NV0002", "KH0003", "KH0004"]);
  assert.equal(getUser("KH0003")?.status, "Đã khóa");
  assert.equal(getUser("NOPE"), undefined);
});

test("user search ignores accents and combines with tab, role and status", () => {
  assert.deepEqual(filterUsers({ ...allUsers, query: "do khanh linh" }).map((user) => user.id), ["KH0004"]);
  assert.deepEqual(filterUsers({ ...allUsers, query: "0934 567 890" }).map((user) => user.id), ["NV0001"]);
  assert.deepEqual(filterUsers({ ...allUsers, query: "0934567890" }).map((user) => user.id), ["NV0001"]);
  assert.ok(filterUsers({ ...allUsers, tab: "staff", status: "Đã khóa" }).every((user) => user.role === "staff" && user.status === "Đã khóa"));
  assert.equal(filterUsers({ ...allUsers, tab: "customer", role: "staff" }).length, 0);
});

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
