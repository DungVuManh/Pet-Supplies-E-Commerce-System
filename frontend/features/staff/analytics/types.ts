export type GroupBy = "day" | "week" | "month";
export type Period = { dateFrom: string; dateTo: string; groupBy: GroupBy };
export type Summary = { revenue: number; orderCount: number; averageOrderValue: number | null };
export type Series = { date: string; value: number }[];
export type ReportMeta = { generatedAt: string; timezone: "Asia/Ho_Chi_Minh"; scope: "store" | "self" };
export type SalesReport = ReportMeta & {
  period: Period; summary: Summary; previousPeriod: { period: Period; summary: Summary };
  growthPercent: number | null; series: Series;
  topProducts: { productId: string; sku: string; name: string; quantity: number; revenue: number }[];
  today: { period: Period; summary: Summary }; monthToDate: { period: Period; summary: Summary };
};
export type PerformanceReport = ReportMeta & {
  actor: { id: string; fullName: string }; period: Period; processedOrders: number;
  actionCount: number; cancelledOrders: number; series: Series;
  previousProcessedOrders: number; todayProcessedOrders: number;
  activity: { orderId: string; orderCode: string; action: "confirmed" | "processing" | "shipping" | "cancelled" | "offline_sale"; at: string }[];
  unsupported: { averageProcessingMinutes: null; onTimeRate: null; target: null };
};
export type OverviewReport = ReportMeta & {
  sales: SalesReport; personal: PerformanceReport;
  backlog: { pending: number; confirmed: number; processing: number; total: number;
    items: { id: string; orderCode: string; createdAt: string; total: number }[] };
  stock: { threshold: number; low: number; out: number; total: number;
    items: { productId: string; sku: string; name: string; availableStock: number }[] };
};
export type Reports = { overview: OverviewReport; sales: SalesReport; performance: PerformanceReport };
