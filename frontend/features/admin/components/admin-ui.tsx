import type { ReactNode } from "react";
import { Badge, Breadcrumbs, card } from "@/features/workspace/components/workspace-ui";
import { adminStatusTone, type AdminStatus } from "../status";

export function AdminPageHeader({ breadcrumbs, title, subtitle, actions }: { breadcrumbs: string[]; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return <div className="space-y-4">
    <Breadcrumbs items={[{ label: "Quản trị", href: "/admin/dashboard" }, ...breadcrumbs.map((label) => ({ label }))]} />
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h1 className="text-[28px] font-semibold tracking-[-0.8px] sm:text-[32px]">{title}</h1>{subtitle && <p className="mt-2 text-muted">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap items-start gap-2">{actions}</div>}
    </div>
  </div>;
}

export function KpiCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "warning" }) {
  const warning = tone === "warning";
  return <article className={`min-w-0 rounded-lg border p-6 ${warning ? "border-warning-subtle bg-warning-subtle" : "border-line bg-surface"}`}>
    <p>{label}</p>
    <p className={`mt-2 break-words text-[26px] font-semibold ${warning ? "text-warning" : ""}`}>{value}</p>
    <p className="mt-2 text-xs text-muted">{detail}</p>
  </article>;
}

export function StatusBadge({ status }: { status: AdminStatus }) {
  return <Badge tone={adminStatusTone(status)}>{status}</Badge>;
}

/** Card-framed table: the table scrolls inside the card, the footer (pagination or note) stays below it. */
export function DataTable({ head, children, footer, caption }: { head: ReactNode; children: ReactNode; footer?: ReactNode; caption: string }) {
  return <div className={`${card} min-w-0 max-w-full overflow-hidden`}>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-canvas text-xs text-muted"><tr>{head}</tr></thead>
      <tbody>{children}</tbody>
    </table></div>
    {footer}
  </div>;
}
export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th scope="col" className={`px-6 py-4 font-semibold ${className}`}>{children}</th>;
}
export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-t border-line px-6 py-4 align-middle ${className}`}>{children}</td>;
}
/** Primary line plus muted secondary line, as in every Admin list row. */
export function Stack({ primary, secondary, strong = false }: { primary: ReactNode; secondary?: ReactNode; strong?: boolean }) {
  return <div className="min-w-0"><p className={strong ? "font-semibold" : ""}>{primary}</p>{secondary && <p className="mt-2 text-xs text-muted">{secondary}</p>}</div>;
}

/** Read-only period chip; period selection arrives with the reports backend. */
export function PeriodChip({ period }: { period: string }) {
  return <p className="inline-flex min-h-12 items-center rounded-lg border border-line bg-surface px-10 font-semibold" aria-label={`Kỳ báo cáo ${period}`}>{period}</p>;
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`${card} min-w-0 p-6 ${className}`}>{title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}{children}</section>;
}
