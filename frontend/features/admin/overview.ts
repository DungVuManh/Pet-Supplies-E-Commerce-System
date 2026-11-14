import type { OverviewPreset } from "./types";

export const overviewPresets: { value: OverviewPreset; label: string }[] = [
  { value: "this-month", label: "Tháng này" },
  { value: "last-month", label: "Tháng trước" },
  { value: "this-quarter", label: "Quý này" },
];

/** A URL value that isn't a known preset falls back to the default period. */
export function parseOverviewPreset(value: unknown): OverviewPreset {
  return overviewPresets.find((preset) => preset.value === value)?.value ?? "this-month";
}

export const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

/** "+12,8% so với kỳ trước", or a dash when there is nothing to compare with. */
export function growthText(percent: number | null) {
  if (percent === null) return "— so với kỳ trước";
  const value = (percent / 100).toLocaleString("vi-VN", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
  return `${value} so với kỳ trước`;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** The ISO date and time in Asia/Ho_Chi_Minh, which is always UTC+7. */
const localIso = (iso: string) => new Date(new Date(iso).getTime() + 7 * HOUR).toISOString();

/** "03/11 · 14:05" in Asia/Ho_Chi_Minh. */
export function activityTime(iso: string) {
  const local = localIso(iso);
  return `${local.slice(8, 10)}/${local.slice(5, 7)} · ${local.slice(11, 16)}`;
}

/** "Hôm nay", "Hôm qua", or "5 ngày trước", counted in local calendar days. */
export function activityDay(iso: string, now: string) {
  const day = (value: string) => Date.parse(localIso(value).slice(0, 10));
  const days = Math.round((day(now) - day(iso)) / DAY);
  if (days <= 0) return "Hôm nay";
  return days === 1 ? "Hôm qua" : `${days} ngày trước`;
}
