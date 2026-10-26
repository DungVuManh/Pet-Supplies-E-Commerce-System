import { Order } from "../models/order.model.js";
import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { DAY, TIMEZONE, localDate, startOfDate } from "../validators/staff-analytics.validator.js";

export const visibleOrders = { creationState: { $ne: "pending" } };
export const periodDto = ({ dateFrom, dateTo, groupBy }) => ({ dateFrom, dateTo, groupBy });
export function periodBetween(start, end, groupBy = "day") {
  return { start, end, groupBy, dateFrom: localDate(start), dateTo: localDate(new Date(end - DAY)) };
}
export function todayPeriod(now) {
  const start = startOfDate(localDate(now));
  return periodBetween(start, new Date(+start + DAY));
}
export function previousPeriod(period) {
  return periodBetween(new Date(+period.start - (period.end - period.start)), period.start, period.groupBy);
}
export function safeNumber(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid analytics numeric data");
  return value;
}
export function summaryDto(row) {
  const revenue = safeNumber(row?.revenue ?? 0), orderCount = safeNumber(row?.orderCount ?? 0);
  return { revenue, orderCount, averageOrderValue: orderCount ? Math.round(revenue / orderCount) : null };
}
export function bucketKey(date, groupBy) {
  const d = new Date(`${localDate(date)}T00:00:00Z`);
  if (groupBy === "month") d.setUTCDate(1);
  if (groupBy === "week") d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
export function fillSeries(period, rows) {
  const values = new Map(rows.map((row) => [row._id, safeNumber(row.value)]));
  const keys = new Set();
  for (let time = +period.start; time < +period.end; time += DAY) keys.add(bucketKey(new Date(time), period.groupBy));
  return [...keys].map((date) => ({ date, value: values.get(date) ?? 0 }));
}
export function mongoBucket(date, groupBy) {
  return { $dateToString: { format: "%Y-%m-%d", timezone: TIMEZONE, date: {
    $dateTrunc: { date, unit: groupBy, timezone: TIMEZONE, ...(groupBy === "week" ? { startOfWeek: "monday" } : {}) },
  } } };
}
export async function aggregate(model, pipeline) {
  return model.aggregate(pipeline).option({ maxTimeMS: 10_000, allowDiskUse: true });
}
export function salesMatch(period) {
  return { ...visibleOrders, orderStatus: { $in: ["completed", "delivered"] }, paymentStatus: "paid",
    createdAt: { $gte: period.start, $lt: period.end } };
}
// Validate snapshots at the same boundary as the aggregate, including legacy writes.
const validInteger = (field) => ({ $and: [{ $isNumber: field }, { $gte: [field, 0] },
  { $lte: [field, Number.MAX_SAFE_INTEGER] }, { $eq: [field, { $trunc: field }] }] });
export function salesPipeline(period) {
  return [
    { $match: salesMatch(period) },
    { $sort: { createdAt: -1, _id: 1 } },
    { $set: { validSnapshot: { $and: [validInteger("$subtotal"), { $gt: [{ $size: "$items" }, 0] },
      { $allElementsTrue: { $map: { input: "$items", as: "item", in: { $and: [
        validInteger("$$item.unitPrice"), validInteger("$$item.qty"), { $gt: ["$$item.qty", 0] },
        { $eq: [{ $type: "$$item.productId" }, "objectId"] },
        { $eq: [{ $type: "$$item.variantSku" }, "string"] }, { $ne: ["$$item.variantSku", ""] },
        { $eq: [{ $type: "$$item.name" }, "string"] }, { $ne: ["$$item.name", ""] },
      ] } } } },
      { $eq: ["$subtotal", { $sum: { $map: { input: "$items", as: "item", in: { $multiply: ["$$item.unitPrice", "$$item.qty"] } } } }] },
    ] } } },
    { $facet: {
      invalid: [{ $match: { validSnapshot: false } }, { $count: "count" }],
      summary: [{ $group: { _id: null, revenue: { $sum: "$subtotal" }, orderCount: { $sum: 1 } } }],
      series: [{ $group: { _id: mongoBucket("$createdAt", period.groupBy), value: { $sum: "$subtotal" } } }],
      topProducts: [{ $unwind: "$items" }, { $group: {
        _id: { productId: "$items.productId", sku: "$items.variantSku" }, name: { $first: "$items.name" },
        quantity: { $sum: "$items.qty" }, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.qty"] } },
      } }, { $sort: { revenue: -1, "_id.productId": 1, "_id.sku": 1 } }, { $limit: 4 }],
    } },
  ];
}
export async function readSalesPeriod(period) {
  const [result] = await aggregate(Order, salesPipeline(period));
  if (!result || result.invalid.length) throw new Error("Invalid sales snapshots");
  return { period: periodDto(period), summary: summaryDto(result.summary[0]),
    series: fillSeries(period, result.series), topProducts: result.topProducts.map((item) => ({
      productId: String(item._id.productId), sku: item._id.sku, name: item.name,
      quantity: safeNumber(item.quantity), revenue: safeNumber(item.revenue),
    })) };
}
export async function readSales(period, now) {
  const today = todayPeriod(now);
  const month = periodBetween(startOfDate(`${localDate(now).slice(0, 7)}-01`), today.end);
  const [current, previous, daily, monthly] = await Promise.all([
    readSalesPeriod(period), readSalesPeriod(previousPeriod(period)), readSalesPeriod(today), readSalesPeriod(month),
  ]);
  const compact = (value) => ({ period: value.period, summary: value.summary });
  return { generatedAt: now.toISOString(), timezone: TIMEZONE, scope: "store", ...current,
    previousPeriod: compact(previous),
    growthPercent: previous.summary.revenue ? Math.round((current.summary.revenue / previous.summary.revenue - 1) * 1000) / 10 : null,
    today: compact(daily), monthToDate: compact(monthly) };
}

export function performancePipeline(period, actorId) {
  // Mongoose does not cast aggregation values; never accept this id from query parameters.
  const actor = new mongoose.Types.ObjectId(String(actorId));
  const within = (date) => ({ $and: [{ $eq: [{ $type: date }, "date"] },
    { $gte: [date, period.start] }, { $lt: [date, period.end] }] });
  const transitions = [["pending", "confirmed"], ["confirmed", "processing"], ["processing", "shipping"],
    ["pending", "cancelled"], ["confirmed", "cancelled"]];
  return [
    { $match: { ...visibleOrders, $or: [
      { channel: "online", statusHistory: { $elemMatch: { by: actor, at: { $gte: period.start, $lt: period.end } } } },
      { channel: "offline", createdByStaffId: actor, createdAt: { $gte: period.start, $lt: period.end },
        orderStatus: { $in: ["completed", "delivered"] }, paymentStatus: "paid" },
    ] } },
    { $project: { orderCode: 1, events: { $cond: [{ $eq: ["$channel", "offline"] },
      [{ action: "offline_sale", at: "$createdAt" }],
      { $map: { input: { $filter: { input: { $ifNull: ["$statusHistory", []] }, as: "h", cond: { $and: [
        { $eq: ["$$h.by", actor] }, within("$$h.at"),
        { $or: transitions.map(([from, to]) => ({ $and: [{ $eq: ["$$h.from", from] }, { $eq: ["$$h.to", to] }] })) },
      ] } } }, as: "h", in: { action: "$$h.to", at: "$$h.at" } } },
    ] } } },
    { $unwind: "$events" },
    { $facet: {
      actions: [{ $count: "count" }],
      cancellations: [{ $match: { "events.action": "cancelled" } }, { $group: { _id: "$_id" } }, { $count: "count" }],
      processed: [{ $match: { "events.action": { $ne: "cancelled" } } },
        { $group: { _id: "$_id", first: { $min: "$events.at" } } },
        { $group: { _id: mongoBucket("$first", "day"), value: { $sum: 1 } } }],
      activity: [{ $sort: { "events.at": -1, _id: 1, "events.action": 1 } }, { $limit: 10 },
        { $project: { _id: 0, orderId: { $toString: "$_id" }, orderCode: 1, action: "$events.action", at: "$events.at" } }],
    } },
  ];
}
export async function readPerformancePeriod(period, actorId) {
  const [result] = await aggregate(Order, performancePipeline(period, actorId));
  if (!result) throw new Error("Missing performance result");
  const series = fillSeries(period, result.processed);
  return { period: periodDto(period), processedOrders: safeNumber(series.reduce((sum, item) => sum + item.value, 0)),
    actionCount: safeNumber(result.actions[0]?.count ?? 0), cancelledOrders: safeNumber(result.cancellations[0]?.count ?? 0),
    series, activity: result.activity.map((item) => ({ orderId: item.orderId, orderCode: item.orderCode,
      action: item.action, at: item.at.toISOString() })) };
}
export async function readPerformance(period, user, now) {
  const [current, previous, today] = await Promise.all([
    readPerformancePeriod(period, user._id), readPerformancePeriod(previousPeriod(period), user._id),
    readPerformancePeriod(todayPeriod(now), user._id),
  ]);
  return { generatedAt: now.toISOString(), timezone: TIMEZONE, scope: "self",
    actor: { id: String(user._id), fullName: user.fullName }, ...current,
    previousProcessedOrders: previous.processedOrders, todayProcessedOrders: today.processedOrders,
    unsupported: { averageProcessingMinutes: null, onTimeRate: null, target: null } };
}

export async function readBacklog() {
  const [result] = await aggregate(Order, [
    { $match: { ...visibleOrders, channel: "online", orderStatus: { $in: ["pending", "confirmed", "processing"] } } },
    { $facet: {
      counts: [{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }],
      items: [{ $match: { orderStatus: "pending" } }, { $sort: { createdAt: -1, _id: 1 } }, { $limit: 3 },
        { $project: { _id: 0, id: { $toString: "$_id" }, orderCode: 1, createdAt: 1, total: 1 } }],
    } },
  ]);
  if (!result) throw new Error("Missing backlog result");
  const counts = { pending: 0, confirmed: 0, processing: 0 };
  for (const row of result.counts) counts[row._id] = safeNumber(row.count);
  return { ...counts, total: safeNumber(counts.pending + counts.confirmed + counts.processing),
    items: result.items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), total: safeNumber(item.total) })) };
}
export async function readStockAlerts() {
  const threshold = 10;
  const [result] = await aggregate(Product, [
    { $match: { isActive: true } }, { $unwind: "$variants" },
    { $set: { availableStock: { $subtract: ["$variants.stock", "$variants.reservedStock"] } } },
    { $match: { availableStock: { $lte: threshold } } },
    { $facet: {
      counts: [{ $group: { _id: { $cond: [{ $lte: ["$availableStock", 0] }, "out", "low"] }, count: { $sum: 1 } } }],
      items: [{ $sort: { availableStock: 1, _id: 1, "variants.sku": 1 } }, { $limit: 4 },
        { $project: { _id: 0, productId: { $toString: "$_id" }, sku: "$variants.sku", name: 1, availableStock: 1 } }],
    } },
  ]);
  if (!result) throw new Error("Missing stock result");
  const counts = { low: 0, out: 0 };
  for (const row of result.counts) counts[row._id] = safeNumber(row.count);
  for (const item of result.items) if (!Number.isSafeInteger(item.availableStock)) throw new Error("Invalid inventory");
  return { threshold, ...counts, total: safeNumber(counts.low + counts.out), items: result.items };
}
export async function readOverview(period, user, now) {
  const [sales, personal, backlog, stock] = await Promise.all([
    readSales(period, now), readPerformance(todayPeriod(now), user, now), readBacklog(), readStockAlerts(),
  ]);
  return { generatedAt: now.toISOString(), timezone: TIMEZONE, scope: "store", sales, personal, backlog, stock };
}
