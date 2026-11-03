import assert from "node:assert/strict";
import test from "node:test";
import { adminStatusTone, adminStatusTones } from "../features/admin/status.ts";
import { isLowStock, lowStockLevels, lowStockTotal, stockLevels } from "../features/admin/mock/inventory.ts";
import { parseAmount, validateCategory, validateProduct } from "../features/admin/validation.ts";

test("product form validation and amount parsing", () => {
  const valid = { name: "Royal Canin Mini Adult 2 kg", sku: "RC-MA-2KG", categoryCodes: ["DM002"], price: "450.000", cost: "325.000", stock: "120", threshold: "20" };
  assert.deepEqual(validateProduct(valid), {});
  assert.deepEqual(validateProduct({ ...valid, categoryCodes: ["DM002", "DM003"], cost: "", threshold: "" }), {});
  assert.equal(parseAmount("450.000"), 450000);
  assert.ok(Number.isNaN(parseAmount("45a")));
  assert.deepEqual(Object.keys(validateProduct({ ...valid, name: "R", sku: "rc ma", categoryCodes: [], price: "0", stock: "-1" })).sort(),
    ["categoryCodes", "name", "price", "sku", "stock"]);
});

test("an older SKU is checked only when it changes, so its product can still be saved", () => {
  const valid = { name: "Pate", sku: "PATE--001", categoryCodes: ["DM002"], price: "1", cost: "", stock: "0", threshold: "" };
  assert.deepEqual(validateProduct({ ...valid, skuChanged: false }), {});
  assert.deepEqual(Object.keys(validateProduct({ ...valid, skuChanged: true })), ["sku"]);
});

test("category form validation", () => {
  assert.deepEqual(validateCategory({ name: "Thức ăn cho chó", slug: "thuc-an-cho-cho", order: "1" }), {});
  assert.deepEqual(Object.keys(validateCategory({ name: "T", slug: "Thức ăn", order: "0" })).sort(), ["name", "order", "slug"]);
  assert.deepEqual(Object.keys(validateCategory({ name: "Thức ăn", slug: "thuc-an", order: "1", description: "x".repeat(501) })), ["description"]);
});

test("teammate screens search Vietnamese names with đ/Đ and ignore accents", () => {
  assert.deepEqual(filterAuditLog(auditLogEntries, { search: "duc long" }).map((e) => e.actor), ["Vũ Đức Long"]);
  assert.deepEqual(filterAuditLog(auditLogEntries, { search: "Đức" }).map((e) => e.actor), ["Vũ Đức Long"]);
  assert.ok(filterCancellations(initialCancellations, { search: "dat nham" }).length >= 1, "“Đặt nhầm” matches without accents");
  assert.ok(filterNotifications(initialNotifications, { tab: "all", search: "don hang" }).length >= 1, "“Đơn hàng” matches “don hang”");
  assert.deepEqual(filterStockLevels(stockLevels, { search: "do choi" }).map((i) => i.sku), ["KG-CL-M"]);
});

test("audit log details open the affected record", () => {
  assert.deepEqual(auditLogEntries.map((e) => auditTargetHref(e.target)), [
    "/admin/products/RC-MA-2KG", "/admin/users/KH0003", "/admin/orders?q=PA261011009",
    "/admin/system/policies", "/admin/products/RC-IN-2KG", "/admin/system/settings",
  ]);
});

test("dashboard stock alert lists only below-threshold items, within the low-stock total", () => {
  assert.deepEqual(lowStockLevels().map((item) => item.sku), ["CT-BEN-10L", "KG-CL-M", "PT-HN-M"]);
  assert.ok(lowStockLevels().length <= lowStockTotal);
  assert.ok(stockLevels.filter((item) => !isLowStock(item)).every((item) => item.available >= item.threshold));
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

import { filterNotifications, initialNotifications, unreadNotificationsCount } from "../features/admin/mock/notifications.ts";

test("notifications mock contains order, stock and system types with read/saved flags", () => {
  assert.ok(initialNotifications.length >= 6);
  const types = new Set(initialNotifications.map((n) => n.type));
  assert.ok(types.has("order"));
  assert.ok(types.has("stock"));
  assert.ok(types.has("system"));

  assert.equal(unreadNotificationsCount(initialNotifications), 3);

  const unreadOnly = filterNotifications(initialNotifications, { tab: "unread" });
  assert.equal(unreadOnly.length, 3);
  assert.ok(unreadOnly.every((n) => !n.read));

  const savedOnly = filterNotifications(initialNotifications, { tab: "saved" });
  assert.equal(savedOnly.length, 2);
  assert.ok(savedOnly.every((n) => n.saved));

  const stockOnly = filterNotifications(initialNotifications, { type: "Kho hàng" });
  assert.ok(stockOnly.length >= 2);
  assert.ok(stockOnly.every((n) => n.type === "stock"));
});

import { auditLogEntries, auditTargetHref, defaultPolicies, defaultStoreSettings, filterAuditLog } from "../features/admin/mock/system.ts";

test("system mock data covers settings, policies, and audit log entries", () => {
  // Settings checks
  assert.equal(defaultStoreSettings.currency, "VND – Việt Nam đồng");
  assert.ok(defaultStoreSettings.freeShippingThreshold > 0);

  // Policies checks
  assert.equal(defaultPolicies.length, 4);
  for (const pol of defaultPolicies) {
    assert.ok(pol.status in adminStatusTones, pol.status);
    assert.ok(pol.content.length > 50);
  }

  // Audit log checks
  assert.ok(auditLogEntries.length >= 6);
  for (const entry of auditLogEntries) {
    assert.ok(entry.result in adminStatusTones, entry.result);
    assert.ok(entry.actor.length > 0);
    assert.ok(entry.action.length > 0);
  }

  const filteredLogs = filterAuditLog(auditLogEntries, { action: "Khóa tài khoản" });
  assert.equal(filteredLogs.length, 1);
  assert.equal(filteredLogs[0].target, "KH0003");
});





