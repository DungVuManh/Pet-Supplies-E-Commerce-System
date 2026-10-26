import { Order } from "../models/order.model.js";
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
