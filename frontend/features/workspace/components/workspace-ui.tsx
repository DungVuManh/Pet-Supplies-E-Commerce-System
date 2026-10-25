import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-[-.5px] sm:text-[26px]">{title}</h1>{subtitle && <p className="mt-2 text-muted">{subtitle}</p>}</div>{action}
  </div>;
}
export const primaryLink = "inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-hover";
export const secondaryButton = "inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-surface px-6 font-semibold hover:bg-brand-subtle";
export const dangerButton = "inline-flex min-h-10 items-center justify-center rounded-lg bg-danger-subtle px-6 font-semibold text-danger hover:bg-danger hover:text-white";
export const control = "h-12 min-w-0 rounded-lg border border-line bg-surface px-4 text-sm focus:border-brand disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted";
export const card = "rounded-lg border border-line bg-surface";

export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className={`${card} min-w-0 p-6`}><p className="text-muted">{label}</p><p className="mt-2 text-[32px] font-semibold tracking-[-1px]">{value}</p><p className="mt-2 text-xs leading-relaxed text-muted">{detail}</p></article>;
}

export type BadgeTone = "success" | "warning" | "info" | "danger" | "neutral";
const tones: Record<BadgeTone, string> = { success: "bg-success-subtle text-success", warning: "bg-warning-subtle text-warning", info: "bg-brand-subtle text-brand", danger: "bg-danger-subtle text-danger", neutral: "bg-canvas text-muted" };
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) { return <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${tones[tone]}`}>{children}</span>; }

export function TableFrame({ children }: { children: ReactNode }) { return <div className={`${card} min-w-0 max-w-full overflow-x-auto`}><table className="w-full min-w-[760px] border-collapse text-left">{children}</table></div>; }
export function TableHead({ children }: { children: ReactNode }) { return <thead className="bg-canvas text-xs uppercase text-muted"><tr>{children}</tr></thead>; }
export function Th({ children, right = false }: { children: ReactNode; right?: boolean }) { return <th className={`px-6 py-4 font-semibold ${right ? "text-right" : ""}`}>{children}</th>; }
export function Td({ children, right = false }: { children: ReactNode; right?: boolean }) { return <td className={`border-t border-line px-6 py-4 align-middle ${right ? "text-right tabular-nums" : ""}`}>{children}</td>; }

export function ActionLink({ href, children }: { href: string; children: ReactNode }) { return <Link href={href} className="inline-flex min-h-10 items-center font-semibold text-brand hover:underline">{children} →</Link>; }

function chartId(title: string) {
  return `chart-${title.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
}

function ChartDataTable({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  return <details className="mt-12"><summary className="cursor-pointer font-semibold text-brand">Xem bảng dữ liệu</summary><table className="mt-3 w-full text-sm"><thead><tr><th className="py-2 text-left">Ngày</th><th className="py-2 text-right">Giá trị ({unit})</th></tr></thead><tbody>{data.map((item) => <tr key={item.label}><td className="border-t border-line py-2">{item.label}</td><td className="border-t border-line py-2 text-right tabular-nums">{item.value}</td></tr>)}</tbody></table></details>;
}

export function BarChart({ title, subtitle, data, unit }: { title: string; subtitle: string; data: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...data.map((item) => item.value));
  const headingId = chartId(title);
  return <section className={`${card} p-6`} aria-labelledby={headingId}>
    <h2 id={headingId} className="text-xl font-semibold">{title}</h2><p className="mt-3 text-xs text-muted">{subtitle}</p>
    <div className="mt-8 flex h-56 items-end justify-around gap-3 border-b border-line px-2" role="group" aria-label={`${title}. ${data.map((d) => `${d.label}: ${d.value} ${unit}`).join(", ")}`}>
      {data.map((item) => <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
        <button type="button" className="group relative flex w-full max-w-10 items-end justify-center rounded-t focus:outline-none" style={{ height: `${Math.max(12, item.value / max * 82)}%` }} aria-label={`${item.label}: ${item.value} ${unit}`}>
          <span className="absolute -top-6 text-xs font-semibold text-ink">{String(item.value).replace(".", ",")}</span><span className="h-full w-full rounded-t bg-brand transition-colors group-hover:bg-brand-hover" />
        </button><span className="-mb-7 text-xs text-muted">{item.label}</span>
      </div>)}
    </div>
    <ChartDataTable data={data} unit={unit} />
  </section>;
}

/** Smooth cumulative line with a horizontal grid; values stay readable through the data table. */
export function LineChart({ title, subtitle, data, unit, legend = "Kỳ này", ticks = 4 }: { title: string; subtitle: string; data: { label: string; value: number }[]; unit: string; legend?: string; ticks?: number }) {
  const headingId = chartId(title);
  const width = 680, height = 120;
  const top = Math.max(...data.map((item) => item.value));
  const step = Math.ceil(top / ticks / 5) * 5 || 1;
  const max = step * ticks;
  const points = data.map((item, index) => [data.length > 1 ? index / (data.length - 1) * width : width / 2, height - item.value / max * height] as const);
  const path = points.reduce((d, [x, y], index) => {
    if (index === 0) return `M${x},${y}`;
    const [px, py] = points[index - 1];
    const cx = (px + x) / 2;
    return `${d} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const last = data.length - 1;
  const showLabel = (index: number) => index === last || (index % labelEvery === 0 && last - index >= labelEvery);
  return <section className={`${card} min-w-0 p-6`} aria-labelledby={headingId}>
    <h2 id={headingId} className="text-xl font-semibold">{title}</h2>
    <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted"><p>{subtitle}</p><p className="flex items-center gap-1.5 text-brand"><span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />{legend}</p></div>
    <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4" role="img" aria-label={`${title}. ${data.map((d) => `${d.label}: ${d.value} ${unit}`).join(", ")}`}>
      <div className="flex h-[120px] flex-col justify-between text-xs text-muted tabular-nums" aria-hidden="true">{Array.from({ length: ticks + 1 }, (_, i) => <span key={i} className="-my-2">{max - i * step}</span>)}</div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-[120px] w-full overflow-visible" aria-hidden="true">
        {Array.from({ length: ticks + 1 }, (_, i) => <line key={i} x1="0" x2={width} y1={i / ticks * height} y2={i / ticks * height} className="stroke-line" vectorEffect="non-scaling-stroke" />)}
        <path d={path} className="fill-none stroke-brand" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span aria-hidden="true" />
      <div className="mt-4 flex justify-between text-xs text-muted" aria-hidden="true">{data.map((item, index) => showLabel(index) ? <span key={item.label}>{item.label}</span> : null)}</div>
    </div>
    <ChartDataTable data={data} unit={unit} />
  </section>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Đường dẫn" className="text-xs text-muted"><ol className="flex flex-wrap gap-1">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex gap-1">
    {index > 0 && <span aria-hidden="true">/</span>}
    {item.href && index < items.length - 1 ? <Link href={item.href} className="hover:text-brand hover:underline">{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}
  </li>)}</ol></nav>;
}

export type TabItem = { label: string; href?: string; onSelect?: () => void; active: boolean };
/** Underline tabs: links for sub-pages, buttons for local filters. */
export function TabNav({ items, label }: { items: TabItem[]; label: string }) {
  const style = (active: boolean) => `inline-flex min-h-11 shrink-0 items-center border-b-2 px-4 ${active ? "border-brand font-semibold text-brand" : "border-transparent text-muted hover:text-ink"}`;
  return <nav aria-label={label} className="max-w-full overflow-x-auto border-b border-line"><ul className="flex">{items.map((item) => <li key={item.label}>
    {item.href
      ? <Link href={item.href} aria-current={item.active ? "page" : undefined} className={style(item.active)}>{item.label}</Link>
      : <button type="button" aria-pressed={item.active} onClick={item.onSelect} className={style(item.active)}>{item.label}</button>}
  </li>)}</ul></nav>;
}

export function Field({ label, htmlFor, children, className = "" }: { label: string; htmlFor: string; children: ReactNode; className?: string }) {
  return <div className={`flex min-w-0 flex-col gap-2 ${className}`}><label htmlFor={htmlFor} className="font-medium">{label}</label>{children}</div>;
}

export function Pagination({ from, to, total, page = 1, pages = 1, onPage }: { from: number; to: number; total: number; page?: number; pages?: number; onPage?: (page: number) => void }) {
  // Up to three page numbers around the current page, as in the designs ("1 2 3 …").
  const first = Math.max(1, Math.min(page - 1, pages - 2));
  const shown = Array.from({ length: Math.min(pages, 3) }, (_, i) => first + i);
  const pageStyle = (current: boolean) => `inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 ${current ? "bg-brand-subtle font-semibold text-brand" : "text-muted hover:text-ink"}`;
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 text-xs text-muted">
    <p>{total === 0 ? "0 bản ghi" : `Hiển thị ${from}–${to} / ${total.toLocaleString("vi-VN")} bản ghi`}</p>
    <nav aria-label="Phân trang"><ul className="flex items-center gap-1 text-sm">
      <li><button type="button" className={pageStyle(false)} disabled={!onPage || page <= 1} onClick={onPage && (() => onPage(page - 1))} aria-label="Trang trước">‹</button></li>
      {shown.map((n) => <li key={n}><button type="button" className={pageStyle(n === page)} disabled={!onPage} aria-current={n === page ? "page" : undefined} onClick={onPage && (() => onPage(n))}>{n}</button></li>)}
      {(shown.at(-1) ?? pages) < pages &&<li aria-hidden="true" className="px-1">…</li>}
      <li><button type="button" className={pageStyle(false)} disabled={!onPage || page >= pages} onClick={onPage && (() => onPage(page + 1))} aria-label="Trang sau">›</button></li>
    </ul></nav>
  </div>;
}

export function InfoCallout({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <aside className="flex gap-4 rounded-lg bg-brand-subtle p-6">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-brand" aria-hidden="true">{icon}</span>
    <div className="min-w-0"><p className="font-semibold text-ink">{title}</p><div className="mt-2 leading-relaxed text-muted">{children}</div></div>
  </aside>;
}

export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="divide-y divide-transparent">{items.map((item) => <div key={item.label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
    <dt className="text-muted">{item.label}</dt><dd className="min-w-0 break-words text-right font-semibold">{item.value}</dd>
  </div>)}</dl>;
}

export type ListStateKind = "empty" | "loading" | "error";
export const listStatePill: Record<ListStateKind, { label: string; tone: BadgeTone }> = {
  empty: { label: "Rỗng", tone: "neutral" }, loading: { label: "Đang tải", tone: "neutral" }, error: { label: "Lỗi", tone: "danger" },
};

/** Designed empty, loading and error bodies for a list card; the card header renders `listStatePill`. */
export function ListState({ kind, title, description, icon, action, columns = 5, rows = 4 }: { kind: ListStateKind; title: string; description?: string; icon?: ReactNode; action?: ReactNode; columns?: number; rows?: number }) {
  if (kind === "loading") return <div role="status" aria-live="polite" className="py-6">
    <p className="font-semibold text-muted">{title}</p>
    <div className="mt-6 space-y-8" aria-hidden="true">{Array.from({ length: rows }, (_, row) => <div key={row} className="grid grid-cols-[2fr_6fr_1.5fr_1.5fr_1fr] gap-6">
      {Array.from({ length: columns }, (_, col) => <span key={col} className="h-4 animate-pulse rounded bg-line motion-reduce:animate-none" />)}
    </div>)}</div>
  </div>;
  return <div role={kind === "error" ? "alert" : "status"} className="flex flex-col items-center px-4 py-10 text-center">
    <span className={kind === "error" ? "text-danger" : "text-muted"} aria-hidden="true">{icon}</span>
    <p className="mt-4 text-xl font-semibold">{title}</p>
    {description && <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
