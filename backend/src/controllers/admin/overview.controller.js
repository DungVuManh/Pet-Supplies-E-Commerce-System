import { AuditLog } from "../../models/audit-log.model.js";
import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import { User } from "../../models/user.model.js";
import { parsePeriodQuery } from "../../validators/admin/period.validator.js";
import { aggregate, previousPeriod, safeNumber, salesMatch, visibleOrders } from "../staff-analytics.helpers.js";
import { orderCustomerName } from "./order.controller.js";
import { globalLowStockThreshold } from "./product.helpers.js";

const STOCK_ALERT_LIMIT = 3;
const ACTIVITY_LIMIT = 6;
const ACTIVITY_PER_TYPE = 2;

const inPeriod = (period) => ({ $gte: period.start, $lt: period.end });

/** Change against the previous period; null when there is nothing meaningful to compare with. */
function growthPercent(current, previous) {
 if (previous === null || previous <= 0) return null;
 return Math.round((current / previous - 1) * 1000) / 10;
}

/** Runs one metric on its own: a failure gives null for that metric only (UC40 2a). */
async function metric(name, read) {
 try {
  return await read();
 } catch {
  // Raw errors can contain query data; log only the metric's name.
  console.error("[overview] Failed to read metric", { metric: name });
  return null;
 }
}

/**
 * Same rule as the finance report, so "Doanh thu thuần" agrees across screens:
 * completed paid orders minus cancelled paid orders, using each order's total.
 */
async function readNetRevenue(period) {
 const rows = await aggregate(Order, [
  { $match: { ...salesMatch(period), orderStatus: { $in: ["completed", "cancelled"] } } },
  { $group: { _id: "$orderStatus", value: { $sum: "$total" } } },
 ]);
 const total = (status) => safeNumber(rows.find((row) => row._id === status)?.value ?? 0);
 return total("completed") - total("cancelled");
}

async function readRevenue(period) {
 const [current, previous] = await Promise.all([
  readNetRevenue(period),
  metric("previousRevenue", () => readNetRevenue(previousPeriod(period))),
 ]);
 return { value: current, growthPercent: growthPercent(current, previous) };
}

/** A count in the period and its growth; a failed previous count only loses the growth. */
async function readCount(name, period, count) {
 const [value, previous] = await Promise.all([
  count(period),
  metric(`previous${name}`, () => count(previousPeriod(period))),
 ]);
 return { value, growthPercent: growthPercent(value, previous) };
}

const countOrders = (period) => Order.countDocuments({ ...visibleOrders, createdAt: inPeriod(period) });
const countNewCustomers = (period) => User.countDocuments({ role: "customer", createdAt: inPeriod(period) });

/** Uses the Admin product list's rule: visible variants at or below their own or the global threshold. */
async function readLowStock() {
 const threshold = await globalLowStockThreshold();
 const [result] = await aggregate(Product, [
  { $match: { isActive: { $ne: false } } },
  { $unwind: "$variants" },
  { $set: {
   available: { $subtract: ["$variants.stock", { $ifNull: ["$variants.reservedStock", 0] }] },
   threshold: { $ifNull: ["$variants.lowStockThreshold", threshold] },
  } },
  { $match: { $expr: { $lte: ["$available", "$threshold"] } } },
  { $facet: {
   total: [{ $count: "count" }],
   items: [
    { $sort: { available: 1, "variants.sku": 1 } },
    { $limit: STOCK_ALERT_LIMIT },
    { $project: { _id: 0, sku: "$variants.sku", name: 1, available: 1, threshold: 1 } },
   ],
  } },
 ]);
 if (!result) throw new Error("Missing low-stock result");
 return { total: result.total[0]?.count ?? 0, items: result.items };
}

function orderActivity(order) {
 const [first, ...others] = order.items;
 const item = first ? `${first.name}${others.length ? ` và ${others.length} sản phẩm khác` : ""}` : "";
 return {
  id: `order-${order._id}`,
  time: order.createdAt,
  title: `Đơn #${order.orderCode} được tạo`,
  detail: [orderCustomerName(order, order.customerId), item].filter(Boolean).join(" · "),
  value: `${order.total.toLocaleString("vi-VN")} ₫`,
  // `delivered` is not in the Order enum, but older documents have it.
  status: order.orderStatus === "delivered" ? "completed" : order.orderStatus,
  href: `/admin/orders/${encodeURIComponent(order.orderCode)}`,
 };
}

function auditActivity(entry) {
 return {
  id: `audit-${entry._id}`,
  time: entry.at,
  title: entry.summary || entry.action,
  detail: `Thực hiện bởi ${entry.actorId?.fullName || "tài khoản không xác định"}`,
  value: null,
  status: entry.result || "success",
  href: "/admin/system/audit-log",
 };
}

function signUpActivity(user) {
 return {
  id: `user-${user._id}`,
  time: user.createdAt,
  title: "Tài khoản khách hàng mới",
  detail: `${user.fullName} · ${user.email}`,
  value: "Customer",
  status: user.status ?? "active",
  href: `/admin/users/${user._id}`,
 };
}

const newestFirst = (a, b) => new Date(b.time) - new Date(a.time);

/** Up to two rows of each type, so one busy source can't fill the table; spare rows go to the newest of the rest. */
function mixActivity(groups) {
 const chosen = groups.flatMap((rows) => rows.slice(0, ACTIVITY_PER_TYPE));
 const spare = groups.flatMap((rows) => rows.slice(ACTIVITY_PER_TYPE)).sort(newestFirst).slice(0, ACTIVITY_LIMIT - chosen.length);
 return [...chosen, ...spare].sort(newestFirst);
}

/** The newest events of each type, not limited to the selected period. */
async function readRecentActivity() {
 const [orders, entries, users] = await Promise.all([
  Order.find(visibleOrders).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT)
   .select("orderCode customerId guestInfo shippingAddress items total orderStatus createdAt")
   .populate("customerId", "fullName phone").lean(),
  AuditLog.find().sort({ at: -1 }).limit(ACTIVITY_LIMIT).populate("actorId", "fullName").lean(),
  User.find({ role: "customer" }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT)
   .select("fullName email status createdAt").lean(),
 ]);
 return mixActivity([orders.map(orderActivity), entries.map(auditActivity), users.map(signUpActivity)]);
}

/** GET /api/v1/admin/overview: every metric is computed on its own and is null when it fails. */
export async function getOverview(request, response) {
 const period = parsePeriodQuery(request.query);
 const [revenue, orders, newCustomers, lowStock, recentActivity] = await Promise.all([
  metric("revenue", () => readRevenue(period)),
  metric("orders", () => readCount("Orders", period, countOrders)),
  metric("newCustomers", () => readCount("NewCustomers", period, countNewCustomers)),
  metric("lowStock", readLowStock),
  metric("recentActivity", readRecentActivity),
 ]);
 response.json({
  success: true,
  data: {
   generatedAt: new Date().toISOString(),
   period: { preset: period.preset, from: period.from, to: period.to },
   revenue, orders, newCustomers, lowStock, recentActivity,
  },
 });
}
