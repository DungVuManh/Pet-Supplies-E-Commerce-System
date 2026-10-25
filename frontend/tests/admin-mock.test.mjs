import assert from "node:assert/strict";
import test from "node:test";
import { adminStatusTone, adminStatusTones } from "../features/admin/status.ts";
import { isLowStock, lowStockLevels, lowStockTotal, stockLevels } from "../features/admin/mock/inventory.ts";
import { cumulativeRevenue, overview, recentActivity } from "../features/admin/mock/overview.ts";
import { countUsers, filterUsers, getUser, getUserDetail, users } from "../features/admin/mock/users.ts";
import { defaultPermissions, togglePermission } from "../features/admin/mock/permissions.ts";
import { parseAmount, validateCategory, validateProduct, validateUser } from "../features/admin/validation.ts";
import { categoryDeleteBlocker, categoryProductCount, countProducts, filterProducts, getProduct, productCategoryName, productStatus, products } from "../features/admin/mock/products.ts";
import { categories, categoryPath, categoryTree, filterCategories, getCategory } from "../features/admin/mock/categories.ts";
import { filterMasterData, masterData, masterTabs, petTypeOptions, unitOptions } from "../features/admin/mock/master-data.ts";
import { adminOrders, countOrders, filterOrders, getAdminOrder, orderStatusLabel } from "../features/admin/mock/orders.ts";
import { productSales, staffSales } from "../features/admin/mock/reports.ts";

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

test("user detail keeps the designed KH0001 values and resolves every listed user", () => {
  const detail = getUserDetail("KH0001");
  assert.equal(detail?.completedOrders, 12);
  assert.equal(detail?.totalSpent, 5_840_000);
  assert.deepEqual(detail?.activity.map((row) => row.status), ["Chờ xử lý", "Thành công", "Hoàn thành"]);
  assert.ok(users.every((user) => getUserDetail(user.id)?.activity.every((row) => row.status in adminStatusTones && row.href.startsWith("/admin/"))));
  assert.equal(getUserDetail("NOPE"), undefined);
});

test("user form validation flags name, email and phone", () => {
  assert.deepEqual(validateUser({ fullName: "Nguyễn Minh Anh", email: "minhanh.nguyen@gmail.com", phone: "0901 234 567" }), {});
  assert.deepEqual(Object.keys(validateUser({ fullName: " ", email: "minhanh@", phone: "12345" })).sort(), ["email", "fullName", "phone"]);
});

test("permission matrix keeps Admin locked and toggles only the chosen cell", () => {
  assert.equal(defaultPermissions.length, 9);
  assert.ok(defaultPermissions.every((item) => item.roles.admin));
  assert.equal(togglePermission(defaultPermissions, "finance", "admin"), defaultPermissions);
  const next = togglePermission(defaultPermissions, "finance", "staff");
  assert.equal(next.find((item) => item.id === "finance")?.roles.staff, true);
  assert.equal(defaultPermissions.find((item) => item.id === "finance")?.roles.staff, false, "original matrix is not mutated");
});

const allProducts = { tab: "all", query: "", category: "all", status: "all" };

test("product tabs and first page match the product list design", () => {
  assert.equal(countProducts("all"), 124);
  assert.equal(countProducts("Đang bán"), 118);
  assert.equal(countProducts("Đã ẩn"), 6);
  assert.equal(new Set(products.map((p) => p.sku)).size, products.length);
  assert.deepEqual(filterProducts(allProducts).slice(0, 6).map((p) => `${p.id} ${p.sku}`),
    ["SP0001 RC-MA-2KG", "SP0002 RC-IN-2KG", "SP0003 CT-BEN-10L", "SP0004 KG-CL-M", "SP0005 PT-HN-M", "SP0006 WM-PATE-85"]);
  assert.equal(productStatus(getProduct("CT-BEN-10L")), "Sắp hết hàng");
  assert.equal(productStatus(getProduct("WM-PATE-85")), "Đã ẩn");
  assert.equal(getProduct("NOPE"), undefined);
});

test("products agree with inventory, the dashboard low-stock total and category counts", () => {
  for (const level of stockLevels) assert.equal(getProduct(level.sku)?.stock, level.available, level.sku);
  assert.equal(products.filter((p) => p.stock < p.threshold).length, lowStockTotal);
  const perLeaf = (code) => products.filter((p) => p.categoryCode === code).length;
  assert.deepEqual(["DM002", "DM003", "DM004", "DM006", "DM007", "DM008", "DM009"].map(perLeaf), [24, 14, 10, 32, 16, 8, 20]);
  assert.ok(products.every((p) => p.categoryCode !== "DM001" && p.categoryCode !== "DM005"), "products sit in leaf categories");
  for (const row of [...productSales, ...inventoryReportRows]) assert.ok(getProduct(row.sku), `report links to ${row.sku}`);
});

test("product filters combine category scope, status and accent-insensitive search", () => {
  assert.equal(filterProducts({ ...allProducts, category: "DM001" }).length, 48);
  assert.ok(filterProducts({ ...allProducts, category: "DM001" }).every((p) => ["DM002", "DM003", "DM004"].includes(p.categoryCode)));
  assert.deepEqual(filterProducts({ ...allProducts, query: "cat ve sinh catsan" }).map((p) => p.sku), ["CT-BEN-10L"]);
  assert.equal(filterProducts({ ...allProducts, status: "Sắp hết hàng" }).length, lowStockTotal);
  assert.equal(filterProducts({ ...allProducts, tab: "Đã ẩn", status: "Đang bán" }).length, 0);
  assert.equal(categoryPath("DM002"), "Chó / Thức ăn cho chó");
});

test("product form validation and amount parsing", () => {
  const valid = { name: "Royal Canin Mini Adult 2 kg", sku: "RC-MA-2KG", categoryCode: "DM002", price: "450.000", cost: "325.000", stock: "120", threshold: "20" };
  assert.deepEqual(validateProduct(valid), {});
  assert.equal(parseAmount("450.000"), 450000);
  assert.ok(Number.isNaN(parseAmount("45a")));
  assert.deepEqual(Object.keys(validateProduct({ ...valid, name: "R", sku: "rc ma", categoryCode: "", price: "0", stock: "-1" })).sort(),
    ["categoryCode", "name", "price", "sku", "stock"]);
});

test("category tree matches the design order, codes, slugs and derived product counts", () => {
  assert.deepEqual(categoryTree().map((c) => c.code), ["DM001", "DM002", "DM003", "DM004", "DM005", "DM006", "DM007", "DM008", "DM009"]);
  assert.deepEqual(categoryTree().map((c) => categoryProductCount(c.code)), [48, 24, 14, 10, 56, 32, 16, 8, 20]);
  assert.equal(getCategory("DM002")?.slug, "thuc-an-cho-cho");
  assert.equal(getCategory("DM007")?.slug, "ve-sinh-cat-meo");
  assert.equal(getCategory("NOPE"), undefined);
});

test("category filter keeps the parent of a matching child and the delete rule explains blockers", () => {
  const rows = filterCategories({ query: "cat meo", status: "all" });
  assert.deepEqual(rows.map((r) => [r.category.code, r.context]), [["DM005", true], ["DM007", false]]);
  assert.equal(filterCategories({ query: "", status: "Đã ẩn" }).length, 0);
  assert.equal(categoryDeleteBlocker("DM002"), "còn 24 sản phẩm liên kết");
  assert.match(categoryDeleteBlocker("DM001"), /48 sản phẩm/);
});

test("category form validation", () => {
  assert.deepEqual(validateCategory({ name: "Thức ăn cho chó", slug: "thuc-an-cho-cho", order: "1" }), {});
  assert.deepEqual(Object.keys(validateCategory({ name: "T", slug: "Thức ăn", order: "0" })).sort(), ["name", "order", "slug"]);
});

test("master data tab counts match the design and agree with products and breeds", () => {
  assert.deepEqual(masterTabs.map((t) => masterData[t.kind].length), [5, 24, 12, 6, 3]);
  assert.deepEqual(masterData.pets.map((r) => `${r.code} ${r.metric} ${r.status}`),
    ["PET-DOG 12 giống Hoạt động", "PET-CAT 8 giống Hoạt động", "PET-BIRD 2 giống Hoạt động", "PET-HAM 2 giống Hoạt động", "PET-FISH 0 giống Tạm ngưng"]);
  const brandTotal = masterData.brands.reduce((sum, r) => sum + Number.parseInt(r.metric, 10), 0);
  const unitTotal = masterData.units.reduce((sum, r) => sum + Number.parseInt(r.metric, 10), 0);
  assert.equal(brandTotal, products.length);
  assert.equal(unitTotal, products.length);
  assert.ok(products.every((p) => unitOptions.includes(p.unit)), "every product unit is a master-data unit");
  assert.ok(!petTypeOptions.includes("Cá cảnh"), "paused pet types are not offered in product forms");
  for (const kind of Object.keys(masterData)) {
    assert.equal(new Set(masterData[kind].map((r) => r.code)).size, masterData[kind].length, `unique codes in ${kind}`);
    assert.ok(masterData[kind].every((r) => r.status in adminStatusTones));
  }
});

test("master data filters search code, name and description and status", () => {
  assert.deepEqual(filterMasterData("pets", { query: "ca canh", status: "all" }).map((r) => r.code), ["PET-FISH"]);
  assert.deepEqual(filterMasterData("pets", { query: "", status: "Tạm ngưng" }).map((r) => r.code), ["PET-FISH"]);
  assert.equal(filterMasterData("breeds", { query: "meo", status: "all" }).length, 8);
  assert.equal(filterMasterData("brands", { query: "RC-ZERO", status: "all" }).length, 0);
});

test("admin orders include every Staff order and every order linked from other admin screens", () => {
  const ids = new Set(adminOrders.map((o) => o.id));
  assert.equal(ids.size, adminOrders.length, "unique order IDs");
  for (const order of orders) assert.deepEqual(getAdminOrder(order.id), order, `shared with Staff: ${order.id}`);
  const linked = [...recentActivity.map((r) => r.href), ...users.flatMap((u) => getUserDetail(u.id).activity.map((a) => a.href))]
    .filter((href) => href.startsWith("/admin/orders?q=")).map((href) => href.split("=")[1]);
  for (const id of linked) assert.ok(ids.has(id), `linked order ${id} exists`);
  for (const request of initialCancellations) assert.ok(ids.has(request.orderId), `cancellation ${request.id} order exists`);
  assert.ok(adminOrders.every((o) => orderStatusLabel[o.status] in adminStatusTones));
});

test("order tabs group statuses and filters combine with search", () => {
  const all = { tab: "all", query: "", status: "all" };
  assert.equal(countOrders("all"), adminOrders.length);
  assert.ok(filterOrders({ ...all, tab: "processing" }).every((o) => o.status === "pending" || o.status === "packing"));
  assert.equal(["processing", "shipping", "completed", "cancelled"].reduce((sum, tab) => sum + countOrders(tab), 0), adminOrders.length);
  assert.deepEqual(filterOrders({ ...all, query: "#PA261012018" }).map((o) => o.id), ["PA261012018"]);
  assert.deepEqual(filterOrders({ ...all, query: "PA999" }), []);
  assert.deepEqual(filterOrders({ ...all, tab: "all", status: "pending", query: "PA999" }), []);
  assert.ok(filterOrders({ ...all, query: "minh anh" }).length >= 2);
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
  for (const entry of auditLogEntries) {
    const href = auditTargetHref(entry.target);
    if (href.startsWith("/admin/products/")) assert.ok(getProduct(entry.target), entry.target);
    if (href.startsWith("/admin/users/")) assert.ok(getUser(entry.target), entry.target);
    if (href.startsWith("/admin/orders")) assert.ok(getAdminOrder(entry.target), entry.target);
  }
});

test("report and inventory data agree with products, categories and staff accounts", () => {
  const leafNames = new Set(categories.filter((c) => c.parent || c.code === "DM009").map((c) => c.name));
  for (const level of stockLevels) {
    assert.ok(leafNames.has(level.category), `inventory category ${level.category}`);
    assert.equal(level.category, productCategoryName(getProduct(level.sku)), level.sku);
    assert.equal(level.unit, getProduct(level.sku).unit.toLowerCase(), `unit of ${level.sku}`);
  }
  for (const row of inventoryReportRows) assert.equal(row.category, productCategoryName(getProduct(row.sku)), row.sku);
  const staffNames = new Set(users.filter((u) => u.role === "staff").map((u) => u.fullName));
  for (const row of productSales) {
    assert.ok(staffNames.has(row.staff), `sales staff ${row.staff}`);
    assert.equal(row.unit, getProduct(row.sku).unit.toLowerCase(), `sales unit of ${row.sku}`);
  }
  for (const row of staffSales) assert.ok(staffNames.has(row.staff), `staff report ${row.staff}`);
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





