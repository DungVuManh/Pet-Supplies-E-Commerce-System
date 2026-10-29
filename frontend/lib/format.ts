// Display formats used across the workspace, always in Vietnam time so server
// and browser renders agree.

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function dateParts(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Object.fromEntries(parts.formatToParts(date).map((part) => [part.type, part.value]));
}

/** "1.250.000 ₫" */
export function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

/** "12/10/2026" in Vietnam time; "—" for an invalid date. */
export function formatDate(value: Date | string | number) {
  const p = dateParts(value);
  return p ? `${p.day}/${p.month}/${p.year}` : "—";
}

/** "12/10/2026 · 10:48" in Vietnam time; "—" for an invalid date. */
export function formatDateTime(value: Date | string | number) {
  const p = dateParts(value);
  return p ? `${p.day}/${p.month}/${p.year} · ${p.hour}:${p.minute}` : "—";
}
