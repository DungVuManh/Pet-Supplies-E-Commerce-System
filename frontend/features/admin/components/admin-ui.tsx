import type { ReactNode } from "react";
import { Badge, Breadcrumbs, card } from "@/features/workspace/components/workspace-ui";
import { adminStatusTone, type AdminStatus } from "../status";

export function AdminPageHeader({ breadcrumbs, title, subtitle, actions }: { breadcrumbs: string[]; title: string; subtitle?: string; actions?: ReactNode }) {
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

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`${card} min-w-0 p-6 ${className}`}>{title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}{children}</section>;
}
