import { z } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import { DAY, localDate, startOfDate } from "../staff-analytics.validator.js";

const MAX_DAYS = 366;
const pad = (value) => String(value).padStart(2, "0");

const calendarDate = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine((value) => {
 const date = new Date(`${value}T00:00:00Z`);
 return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

const periodSchema = z.object({
 preset: z.enum(["this-month", "last-month", "this-quarter"]).optional(),
 from: calendarDate.optional(),
 to: calendarDate.optional(),
}).strict();

/** Calendar dates of a preset in Asia/Ho_Chi_Minh. "This" periods run to today. */
function presetDates(preset, now) {
 const today = localDate(now);
 const year = Number(today.slice(0, 4));
 const month = Number(today.slice(5, 7));
 if (preset === "last-month") {
  const firstOfThisMonth = `${today.slice(0, 7)}-01`;
  const lastOfPrevious = localDate(new Date(startOfDate(firstOfThisMonth).getTime() - DAY));
  return { from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious };
 }
 if (preset === "this-quarter") {
  const quarterMonth = month - ((month - 1) % 3);
  return { from: `${year}-${pad(quarterMonth)}-01`, to: today };
 }
 return { from: `${today.slice(0, 7)}-01`, to: today };
}

/**
 * Reads `preset` or a `from`/`to` pair (never both), defaulting to the current
 * month to date. `start` is inclusive and `end` exclusive; `groupBy` lets the
 * result feed the Staff analytics period helpers.
 */
export function parsePeriodQuery(query, now = new Date()) {
 const invalid = () => new AppError("Chọn khoảng ngày hợp lệ (tối đa 366 ngày).", 400, "VALIDATION_ERROR");
 const parsed = periodSchema.safeParse(query);
 if (!parsed.success) throw invalid();
 const { preset, from, to } = parsed.data;
 if (Boolean(from) !== Boolean(to) || (preset && from)) throw invalid();

 const selectedPreset = from ? null : preset ?? "this-month";
 const dates = from ? { from, to } : presetDates(selectedPreset, now);
 const start = startOfDate(dates.from);
 const end = new Date(startOfDate(dates.to).getTime() + DAY);
 if (end <= start || end - start > MAX_DAYS * DAY) throw invalid();
 return { preset: selectedPreset, ...dates, start, end, groupBy: "day" };
}
