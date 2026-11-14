import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";

export const DAY = 86_400_000;
export const TIMEZONE = "Asia/Ho_Chi_Minh";
export const localDate = (date) => new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
export const startOfDate = (date) => new Date(`${date}T00:00:00+07:00`);
const calendarDate = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const dates = { dateFrom: calendarDate.optional(), dateTo: calendarDate.optional() };
const schemas = {
  sales: z.object({ ...dates, groupBy: z.enum(["day", "week", "month"]).default("day") }).strict(),
  performance: z.object(dates).strict(),
  overview: z.object({}).strict(),
};
export function parseAnalyticsQuery(query, kind, now = new Date()) {
  const result = schemas[kind].safeParse(query);
  const invalid = () => new AppError("Chọn khoảng ngày hợp lệ (tối đa 366 ngày) và bộ lọc được hỗ trợ.", 400, "VALIDATION_ERROR");
  if (!result.success) throw invalid();
  const input = result.data;
  if (Boolean(input.dateFrom) !== Boolean(input.dateTo)) throw invalid();
  const dateTo = input.dateTo || localDate(now);
  const dateFrom = input.dateFrom || localDate(new Date(startOfDate(dateTo).getTime() - 6 * DAY));
  const start = startOfDate(dateFrom), end = new Date(startOfDate(dateTo).getTime() + DAY);
  if (end <= start || end - start > 366 * DAY) throw invalid();
  return { dateFrom, dateTo, groupBy: input.groupBy || "day", start, end };
}
