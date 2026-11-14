import type { GroupBy, Period, Summary, Series, ReportMeta, SalesReport, PerformanceReport, OverviewReport, Reports } from "../types";

export class AnalyticsApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.name = "AnalyticsApiError"; this.status = status; this.code = code;
  }
}
const invalid = () => new AnalyticsApiError(502, "INVALID_RESPONSE", "Dữ liệu báo cáo không hợp lệ. Vui lòng thử lại.");
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function string(value: unknown): string { if (typeof value !== "string" || !value.trim()) throw invalid(); return value; }
function count(value: unknown): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw invalid(); return value; }
function id(value: unknown) { const result = string(value); if (!/^[a-f\d]{24}$/i.test(result)) throw invalid(); return result; }
function timestamp(value: unknown) { const result = string(value); if (!/^\d{4}-\d{2}-\d{2}T/.test(result) || !Number.isFinite(Date.parse(result))) throw invalid(); return result; }
function date(value: unknown) {
  const result = string(value), parsed = new Date(`${result}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== result) throw invalid();
  return result;
}
function list<T>(value: unknown, max: number, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) throw invalid(); return value.map(parse);
}
function period(value: unknown): Period {
  const v = record(value), dateFrom = date(v.dateFrom), dateTo = date(v.dateTo);
  if (dateFrom > dateTo || !["day", "week", "month"].includes(String(v.groupBy))) throw invalid();
  return { dateFrom, dateTo, groupBy: v.groupBy as GroupBy };
}
function summary(value: unknown): Summary {
  const v = record(value), revenue = count(v.revenue), orderCount = count(v.orderCount);
  const averageOrderValue = v.averageOrderValue === null ? null : count(v.averageOrderValue);
  if (averageOrderValue !== (orderCount ? Math.round(revenue / orderCount) : null) || (!orderCount && revenue)) throw invalid();
  return { revenue, orderCount, averageOrderValue };
}
function series(value: unknown): Series {
  const result = list(value, 366, (item) => { const v = record(item); return { date: date(v.date), value: count(v.value) }; });
  if (!result.length || result.some((item, i) => i > 0 && item.date <= result[i - 1].date)) throw invalid();
  return result;
}
function meta(v: Record<string, unknown>, scope: "store" | "self"): ReportMeta {
  if (v.timezone !== "Asia/Ho_Chi_Minh" || v.scope !== scope) throw invalid();
  return { generatedAt: timestamp(v.generatedAt), timezone: v.timezone, scope };
}
function compact(value: unknown) { const v = record(value); return { period: period(v.period), summary: summary(v.summary) }; }
function sales(value: unknown): SalesReport {
  const v = record(value), totals = summary(v.summary), points = series(v.series);
  if (points.reduce((sum, point) => sum + point.value, 0) !== totals.revenue) throw invalid();
  const growthPercent = v.growthPercent;
  if (growthPercent !== null && (typeof growthPercent !== "number" || !Number.isFinite(growthPercent))) throw invalid();
  return { ...meta(v, "store"), period: period(v.period), summary: totals, series: points, growthPercent,
    previousPeriod: compact(v.previousPeriod), today: compact(v.today), monthToDate: compact(v.monthToDate),
    topProducts: list(v.topProducts, 4, (item) => { const p = record(item); return { productId: id(p.productId),
      sku: string(p.sku), name: string(p.name), quantity: count(p.quantity), revenue: count(p.revenue) }; }) };
}
function performance(value: unknown): PerformanceReport {
  const v = record(value), actor = record(v.actor), unsupported = record(v.unsupported);
  const points = series(v.series), processedOrders = count(v.processedOrders);
  if (points.reduce((sum, point) => sum + point.value, 0) !== processedOrders ||
    [unsupported.averageProcessingMinutes, unsupported.onTimeRate, unsupported.target].some((item) => item !== null)) throw invalid();
  return { ...meta(v, "self"), actor: { id: id(actor.id), fullName: string(actor.fullName) }, period: period(v.period),
    processedOrders, actionCount: count(v.actionCount), cancelledOrders: count(v.cancelledOrders), series: points,
    previousProcessedOrders: count(v.previousProcessedOrders), todayProcessedOrders: count(v.todayProcessedOrders),
    unsupported: { averageProcessingMinutes: null, onTimeRate: null, target: null },
    activity: list(v.activity, 10, (item) => { const a = record(item);
      if (!["confirmed", "processing", "shipping", "cancelled", "offline_sale"].includes(String(a.action))) throw invalid();
      return { orderId: id(a.orderId), orderCode: string(a.orderCode), action: a.action as PerformanceReport["activity"][number]["action"], at: timestamp(a.at) };
    }) };
}
function overview(value: unknown): OverviewReport {
  const v = record(value), b = record(v.backlog), s = record(v.stock);
  const pending = count(b.pending), confirmed = count(b.confirmed), processing = count(b.processing), total = count(b.total);
  const low = count(s.low), out = count(s.out), stockTotal = count(s.total);
  if (total !== pending + confirmed + processing || stockTotal !== low + out || s.threshold !== 10) throw invalid();
  return { ...meta(v, "store"), sales: sales(v.sales), personal: performance(v.personal),
    backlog: { pending, confirmed, processing, total, items: list(b.items, 3, (item) => { const o = record(item);
      return { id: id(o.id), orderCode: string(o.orderCode), createdAt: timestamp(o.createdAt), total: count(o.total) }; }) },
    stock: { threshold: 10, low, out, total: stockTotal, items: list(s.items, 4, (item) => { const p = record(item);
      if (typeof p.availableStock !== "number" || !Number.isSafeInteger(p.availableStock)) throw invalid();
      return { productId: id(p.productId), sku: string(p.sku), name: string(p.name), availableStock: p.availableStock }; }) } };
}
export function parseReport<K extends keyof Reports>(kind: K, json: unknown): Reports[K] {
  const envelope = record(json); if (envelope.success !== true) throw invalid();
  const parsers = { overview, sales, performance };
  return parsers[kind](envelope.data) as Reports[K];
}
export async function fetchReport<K extends keyof Reports>(kind: K, query: string, signal: AbortSignal): Promise<Reports[K]> {
  const response = await fetch(`/api/v1/staff/analytics/${kind}${query ? `?${query}` : ""}`, {
    headers: { Accept: "application/json" }, credentials: "include", cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new AnalyticsApiError(response.status, json?.error?.code || "REQUEST_FAILED",
    response.status === 400 ? "Khoảng ngày hoặc bộ lọc không hợp lệ. Hãy chọn lại (tối đa 366 ngày)." : "Chưa thể tải báo cáo. Vui lòng thử lại.");
  return parseReport(kind, json);
}
