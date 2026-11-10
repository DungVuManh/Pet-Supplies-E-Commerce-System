export type ReportPeriod = { from: string; to: string; label: string };

/** "2026-11-03" → "03/11/2026". */
export function formatPeriodDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function reportPeriod(from: string, to: string): ReportPeriod {
  return { from, to, label: `${formatPeriodDate(from)} – ${formatPeriodDate(to)}` };
}

/** The range a report opens on when its URL doesn't name one. */
export const defaultReportPeriod = reportPeriod("2026-10-01", "2026-10-31");

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Reads `from` and `to` from a report's URL; anything missing or invalid gives the default range. */
export function parseReportPeriod({ from, to }: { from?: unknown; to?: unknown }): ReportPeriod {
  return isCalendarDate(from) && isCalendarDate(to) && from <= to ? reportPeriod(from, to) : defaultReportPeriod;
}

/** A report's URL for the period, so moving between screens keeps the same dates. */
export function reportHref(path: string, { from, to }: { from: string; to: string }) {
  return `${path}?from=${from}&to=${to}`;
}
