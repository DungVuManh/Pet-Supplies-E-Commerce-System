import { AppError } from "../common/errors/app-error.js";
import { parseAnalyticsQuery } from "../validators/staff-analytics.validator.js";
import { readSales } from "./staff-analytics.helpers.js";

function unavailable(error) {
  if (error instanceof AppError) return error;
  return new AppError("Chưa thể đọc báo cáo. Vui lòng thử lại.", 503, "ANALYTICS_UNAVAILABLE");
}
export async function getStaffSales(request, response) {
  const now = new Date(), period = parseAnalyticsQuery(request.query, "sales", now);
  try {
    response.json({ success: true, data: await readSales(period, now) });
  } catch (error) { throw unavailable(error); }
}
