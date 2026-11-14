import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";
import { DAY, startOfDate } from "./staff-analytics.validator.js";

const calendarDate = z
  .string()
  .regex(/^20\d{2}-\d{2}-\d{2}$/, "Ngày phải có định dạng YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Ngày không hợp lệ trên lịch");

const financeSummarySchema = z
  .object({
    dateFrom: calendarDate,
    dateTo: calendarDate,
  })
  .strict()
  .refine((data) => data.dateFrom <= data.dateTo, {
    message: "dateFrom không được lớn hơn dateTo",
    path: ["dateFrom"],
  });

export function parseFinanceSummaryQuery(query) {
  const result = financeSummarySchema.safeParse(query);
  if (!result.success) {
    throw new AppError(
      "Chọn khoảng ngày hợp lệ (định dạng YYYY-MM-DD, tối đa 366 ngày).",
      400,
      "VALIDATION_ERROR",
    );
  }
  const { dateFrom, dateTo } = result.data;
  const start = startOfDate(dateFrom);
  const end = new Date(startOfDate(dateTo).getTime() + DAY);

  if (end - start > 366 * DAY) {
    throw new AppError(
      "Khoảng thời gian tối đa là 366 ngày.",
      400,
      "VALIDATION_ERROR",
    );
  }

  return { dateFrom, dateTo, start, end };
}

