import { z } from "zod";
import { AppError } from "../common/errors/app-error.js";
import { DAY, startOfDate, localDate } from "./staff-analytics.validator.js";

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

const inventoryReportQuerySchema = z.object({
  dateFrom: calendarDate.optional(),
  dateTo: calendarDate.optional(),
  q: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(100).optional().default("Tất cả danh mục"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(10),
});

export function parseInventoryReportQuery(query) {
  const result = inventoryReportQuerySchema.safeParse(query);
  if (!result.success) {
    throw new AppError(
      "Tham số tìm kiếm báo cáo tồn kho không hợp lệ.",
      400,
      "VALIDATION_ERROR",
    );
  }

  const data = result.data;
  const todayStr = localDate(new Date());

  // Mặc định từ đầu tháng đến ngày hiện tại nếu không truyền
  const dateFrom = data.dateFrom || `${todayStr.slice(0, 8)}01`;
  const dateTo = data.dateTo || todayStr;

  const start = startOfDate(dateFrom);
  const end = new Date(startOfDate(dateTo).getTime() + DAY);

  if (start > end) {
    throw new AppError("dateFrom không được lớn hơn dateTo", 400, "VALIDATION_ERROR");
  }

  if (end - start > 366 * DAY) {
    throw new AppError("Khoảng thời gian tối đa là 366 ngày.", 400, "VALIDATION_ERROR");
  }

  return {
    ...data,
    dateFrom,
    dateTo,
    start,
    end,
  };
}

