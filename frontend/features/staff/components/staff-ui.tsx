import Link from "next/link";
import type { ReactNode } from "react";
import type { OrderStatus, ProductStatus, StockStatus } from "../mock-data";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-[-.5px] sm:text-[26px]">{title}</h1>{subtitle && <p className="mt-2 text-muted">{subtitle}</p>}</div>{action}
  </div>;
}
export const primaryLink = "inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-6 font-semibold text-white hover:bg-brand-hover";
export const secondaryButton = "inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-surface px-6 font-semibold hover:bg-brand-subtle";
export const control = "h-12 min-w-0 rounded-lg border border-line bg-surface px-4 text-sm focus:border-brand";
export const card = "rounded-lg border border-line bg-surface";

export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className={`${card} min-w-0 p-6`}><p className="text-muted">{label}</p><p className="mt-2 text-[32px] font-semibold tracking-[-1px]">{value}</p><p className="mt-2 text-xs leading-relaxed text-muted">{detail}</p></article>;
}

export type BadgeTone = "success" | "warning" | "info" | "danger" | "neutral";
const tones: Record<BadgeTone, string> = { success: "bg-success-subtle text-success", warning: "bg-warning-subtle text-warning", info: "bg-brand-subtle text-brand", danger: "bg-danger-subtle text-danger", neutral: "bg-canvas text-muted" };
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) { return <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${tones[tone]}`}>{children}</span>; }
export const orderLabels: Record<OrderStatus, string> = { pending: "Chờ xử lý", packing: "Đóng gói", shipping: "Đang giao", completed: "Hoàn thành", cancelled: "Đã hủy" };
export const orderTones: Record<OrderStatus, BadgeTone> = { pending: "warning", packing: "info", shipping: "info", completed: "success", cancelled: "danger" };
export const productLabels: Record<ProductStatus, string> = { active: "Đang bán", hidden: "Tạm ẩn" };
export const stockLabels: Record<StockStatus, string> = { available: "Còn hàng", low: "Sắp hết", out: "Hết hàng" };
export const stockTones: Record<StockStatus, BadgeTone> = { available: "success", low: "warning", out: "danger" };

export function TableFrame({ children }: { children: ReactNode }) { return <div className={`${card} min-w-0 max-w-full overflow-x-auto`}><table className="w-full min-w-[760px] border-collapse text-left">{children}</table></div>; }
export function TableHead({ children }: { children: ReactNode }) { return <thead className="bg-canvas text-xs uppercase text-muted"><tr>{children}</tr></thead>; }
export function Th({ children, right = false }: { children: ReactNode; right?: boolean }) { return <th className={`px-6 py-4 font-semibold ${right ? "text-right" : ""}`}>{children}</th>; }
export function Td({ children, right = false }: { children: ReactNode; right?: boolean }) { return <td className={`border-t border-line px-6 py-4 align-middle ${right ? "text-right tabular-nums" : ""}`}>{children}</td>; }

export function ActionLink({ href, children }: { href: string; children: ReactNode }) { return <Link href={href} className="inline-flex min-h-10 items-center font-semibold text-brand hover:underline">{children} →</Link>; }

export function BarChart({ title, subtitle, data, unit }: { title: string; subtitle: string; data: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...data.map((item) => item.value));
  const headingId = `chart-${title.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
  return <section className={`${card} p-6`} aria-labelledby={headingId}>
    <h2 id={headingId} className="text-xl font-semibold">{title}</h2><p className="mt-3 text-xs text-muted">{subtitle}</p>
    <div className="mt-8 flex h-56 items-end justify-around gap-3 border-b border-line px-2" role="group" aria-label={`${title}. ${data.map((d) => `${d.label}: ${d.value} ${unit}`).join(", ")}`}>
      {data.map((item) => <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
        <button type="button" className="group relative flex w-full max-w-10 items-end justify-center rounded-t focus:outline-none" style={{ height: `${Math.max(12, item.value / max * 82)}%` }} aria-label={`${item.label}: ${item.value} ${unit}`}>
          <span className="absolute -top-6 text-xs font-semibold text-ink">{String(item.value).replace(".", ",")}</span><span className="h-full w-full rounded-t bg-brand transition-colors group-hover:bg-brand-hover" />
        </button><span className="-mb-7 text-xs text-muted">{item.label}</span>
      </div>)}
    </div>
    <details className="mt-12"><summary className="cursor-pointer font-semibold text-brand">Xem bảng dữ liệu</summary><table className="mt-3 w-full text-sm"><thead><tr><th className="py-2 text-left">Ngày</th><th className="py-2 text-right">Giá trị ({unit})</th></tr></thead><tbody>{data.map((item) => <tr key={item.label}><td className="border-t border-line py-2">{item.label}</td><td className="border-t border-line py-2 text-right tabular-nums">{item.value}</td></tr>)}</tbody></table></details>
  </section>;
}
