export const user = { id: "b".repeat(24), role: "staff", fullName: "Nhân viên kiểm thử", email: "staff@example.test", phone: "0912345678" };
export const meta = { generatedAt: "2026-10-26T03:00:00.000Z", timezone: "Asia/Ho_Chi_Minh" };
export function salesFixture(params = new URLSearchParams(), empty = false) {
  const period = { dateFrom: params.get("dateFrom") || "2026-10-20", dateTo: params.get("dateTo") || "2026-10-26", groupBy: params.get("groupBy") || "day" };
  const summary = { revenue: empty ? 0 : 1600000, orderCount: empty ? 0 : 4, averageOrderValue: empty ? null : 400000 };
  return { ...meta, scope: "store", period, summary, growthPercent: null,
    previousPeriod: { period, summary: { revenue: 0, orderCount: 0, averageOrderValue: null } },
    today: { period, summary }, monthToDate: { period, summary },
    series: [{ date: period.dateFrom, value: summary.revenue }, ...(period.dateFrom === period.dateTo ? [] : [{ date: period.dateTo, value: 0 }])],
    topProducts: empty ? [] : [{ productId: "a".repeat(24), sku: "FIXTURE-SKU", name: "Sản phẩm từ API", quantity: 8, revenue: 1600000 }] };
}
export function performanceFixture(params = new URLSearchParams(), empty = false) {
  const period = { dateFrom: params.get("dateFrom") || "2026-10-20", dateTo: params.get("dateTo") || "2026-10-26", groupBy: "day" };
  return { ...meta, scope: "self", actor: { id: user.id, fullName: user.fullName }, period,
    processedOrders: empty ? 0 : 2, actionCount: empty ? 0 : 4, cancelledOrders: empty ? 0 : 1,
    previousProcessedOrders: 0, todayProcessedOrders: empty ? 0 : 1,
    series: [{ date: period.dateFrom, value: empty ? 0 : 2 }],
    activity: empty ? [] : [{ orderId: "c".repeat(24), orderCode: "LIVE-ORDER", action: "confirmed", at: meta.generatedAt }],
    unsupported: { averageProcessingMinutes: null, onTimeRate: null, target: null } };
}
export function overviewFixture(empty = false) {
  return { ...meta, scope: "store", sales: salesFixture(undefined, empty), personal: performanceFixture(undefined, empty),
    backlog: { pending: empty ? 0 : 4, confirmed: 0, processing: 0, total: empty ? 0 : 4,
      items: empty ? [] : [{ id: "c".repeat(24), orderCode: "LIVE-ORDER", createdAt: meta.generatedAt, total: 400000 }] },
    stock: { threshold: 10, low: empty ? 0 : 1, out: 0, total: empty ? 0 : 1,
      items: empty ? [] : [{ productId: "a".repeat(24), sku: "FIXTURE-SKU", name: "Sản phẩm tồn thấp từ API", availableStock: 3 }] } };
}
