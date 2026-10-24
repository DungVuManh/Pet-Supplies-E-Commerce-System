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

import { filterCancellations, getCancellation, initialCancellations } from "../features/admin/mock/cancellations.ts";
import { orders } from "../features/staff/mock-data.ts";

test("admin status labels map to the designed badge tones", () => {
  const allowed = new Set(["success", "warning", "info", "danger", "neutral"]);
  for (const [status, tone] of Object.entries(adminStatusTones)) assert.ok(allowed.has(tone), `${status} → ${tone}`);
  assert.equal(adminStatusTone("Hoạt động"), "success");
  assert.equal(adminStatusTone("Sắp hết hàng"), "warning");
  assert.equal(adminStatusTone("Đã khóa"), "danger");
  assert.equal(adminStatusTone("Đã ẩn"), "neutral");
});

test("cancellation requests are linked to existing order IDs and have valid statuses and amounts", () => {
  assert.ok(initialCancellations.length >= 6);
  const orderIds = new Set(orders.map((o) => o.id));
  assert.ok(initialCancellations.every((req) => orderIds.has(req.orderId)));

  for (const req of initialCancellations) {
    assert.ok(req.status in adminStatusTones, req.status);
    const order = orders.find((o) => o.id === req.orderId);
    assert.ok(order, `Request ${req.id} must link to a valid order`);
    assert.equal(req.value, order.total, `Value for request ${req.id} matches order total`);
    assert.ok(req.reason.length > 0);
    assert.ok(req.customer.length > 0);
  }

  assert.equal(getCancellation("YC001")?.orderId, "PA261012018");
  assert.equal(getCancellation("NON_EXISTENT"), undefined);
});


test("cancellation filter filters by search keyword and status correctly", () => {
  const pending = filterCancellations(initialCancellations, { status: "Chờ duyệt" });
  assert.ok(pending.every((r) => r.status === "Chờ duyệt"));
  assert.equal(pending.length, 3);

  const searched = filterCancellations(initialCancellations, { search: "YC001" });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, "YC001");

  const searchCustomer = filterCancellations(initialCancellations, { search: "Minh Anh" });
  assert.ok(searchCustomer.some((r) => r.customer === "Nguyễn Minh Anh"));
});

import { filterStockHistory, filterStockLevels, getStockItem, getStockWarning, stockHistory } from "../features/admin/mock/inventory.ts";

test("inventory mock provides warnings, lookup, and stock history", () => {
  for (const item of stockLevels) {
    const warning = getStockWarning(item);
    assert.ok(warning in adminStatusTones, warning);
    if (item.available < item.threshold) {
      assert.equal(warning, item.available === 0 ? "Hết hàng" : "Sắp hết");
    } else {
      assert.equal(warning, "Đủ hàng");
    }
  }

  assert.equal(getStockItem("RC-MA-2KG")?.name, "Royal Canin Mini Adult 2 kg");
  assert.equal(getStockItem("UNKNOWN-SKU"), undefined);

  assert.ok(stockHistory.length >= 6);
  for (const entry of stockHistory) {
    assert.ok(entry.id.startsWith("PN-") || entry.id.startsWith("PX-"));
    assert.ok(entry.quantity !== 0);
    assert.ok(entry.performer.length > 0);
  }

  // Filter tests
  const lowStock = filterStockLevels(stockLevels, { lowStockOnly: true });
  assert.equal(lowStock.length, 3);
  assert.deepEqual(lowStock.map((i) => i.sku), ["CT-BEN-10L", "KG-CL-M", "PT-HN-M"]);

  const searchZero = filterStockLevels(stockLevels, { search: "RC-ZERO" });
  assert.equal(searchZero.length, 0);

  const historyFiltered = filterStockHistory(stockHistory, "RC-MA-2KG");
  assert.ok(historyFiltered.length >= 2);
});

import { filterInventoryReport, inventoryReportRows } from "../features/admin/mock/reports.ts";

test("inventory report enforces formula: closing = opening + inQty - outQty", () => {
  assert.ok(inventoryReportRows.length >= 6);
  for (const row of inventoryReportRows) {
    assert.equal(
      row.closing,
      row.opening + row.inQty - row.outQty,
      `Formula closing = opening + in - out must hold for ${row.sku}`
    );
    assert.ok(row.warning in adminStatusTones, row.warning);
    if (row.closing < row.threshold) {
      assert.equal(row.warning, "Sắp hết");
    } else {
      assert.equal(row.warning, "Đủ hàng");
    }
  }

  const dogs = filterInventoryReport(inventoryReportRows, { category: "Thức ăn cho chó" });
  assert.equal(dogs.length, 1);
  assert.equal(dogs[0].sku, "RC-MA-2KG");

  const cats = filterInventoryReport(inventoryReportRows, { search: "Catsan" });
  assert.equal(cats.length, 1);
  assert.equal(cats[0].sku, "CT-BEN-10L");
});



