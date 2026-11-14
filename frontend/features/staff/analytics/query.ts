import type { Period } from "./types";

export function reportQuery(period: Period, performance = false) {
  const params = new URLSearchParams({ dateFrom: period.dateFrom, dateTo: period.dateTo });
  if (!performance) params.set("groupBy", period.groupBy);
  return params.toString();
}
export function periodError(period: Period): string | null {
  const { dateFrom, dateTo } = period;
  const start = Date.parse(`${dateFrom}T00:00:00Z`), end = Date.parse(`${dateTo}T00:00:00Z`);
  if (![dateFrom, dateTo].every((d) => /^20\d{2}-\d{2}-\d{2}$/.test(d)) || !Number.isFinite(start) || !Number.isFinite(end) ||
    new Date(start).toISOString().slice(0, 10) !== dateFrom || new Date(end).toISOString().slice(0, 10) !== dateTo ||
    end < start || end - start >= 366 * 86400000) return "Chọn khoảng ngày hợp lệ, tối đa 366 ngày.";
  return null;
}
