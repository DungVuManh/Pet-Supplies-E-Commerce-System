import Link from "next/link";
import { ActionLink, Pagination, card } from "@/components/workspace/workspace-ui";
import { overviewActivityStatusLabels } from "../status";
import { activityDay, activityTime, formatVnd, growthText } from "../overview";
import { formatPeriodDate, reportHref } from "../report-period";
import type { AdminOverview, OverviewPreset } from "../types";
import { AdminGreeting } from "./admin-greeting";
import { AdminPageHeader, DataTable, KpiCard, StatusBadge, Stack, Td, Th } from "./admin-ui";
import { OverviewPeriodSelect } from "./overview-period-select";

// A metric that failed to load says so; it never shows a made-up value (UC40, BR-28).
const NO_DATA = "Không có dữ liệu";
const NO_DATA_DETAIL = "Chưa tải được chỉ số này";

type KpiLink = { href: string; label: string };

function CountKpi({ label, metric, link }: { label: string; metric: AdminOverview["orders"]; link?: KpiLink }) {
  return metric
    ? <KpiCard label={label} value={metric.value.toLocaleString("vi-VN")} detail={growthText(metric.growthPercent)} link={link} />
    : <KpiCard label={label} value={NO_DATA} detail={NO_DATA_DETAIL} link={link} />;
}

function StockAlerts({ lowStock }: { lowStock: AdminOverview["lowStock"] }) {
  return <section aria-labelledby="stock-alert" className={`${card} min-w-0 p-6`}>
    <h2 id="stock-alert" className="text-xl font-semibold">Cảnh báo tồn kho</h2>
    {!lowStock && <p className="mt-4 text-muted">{NO_DATA}</p>}
    {lowStock && lowStock.total === 0 && <p className="mt-4 text-muted">Không có sản phẩm nào dưới định mức.</p>}
    {lowStock && lowStock.total > 0 && <>
      <p className="mt-4 inline-flex rounded-full bg-warning-subtle px-2 py-1.5 text-xs font-semibold text-warning">{lowStock.total} sản phẩm dưới định mức</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">{lowStock.items.map((item) => <li key={item.sku}>
        <Link href={`/admin/products/${encodeURIComponent(item.sku)}`} className="font-semibold hover:text-brand hover:underline">{item.name}</Link>
        <p className="mt-2 text-xs text-muted">Còn {item.available} · Tối thiểu {item.threshold}</p>
      </li>)}</ul>
    </>}
    <Link href="/admin/inventory" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">Xem kho hàng →</Link>
  </section>;
}

function RecentActivity({ rows, now }: { rows: AdminOverview["recentActivity"]; now: string }) {
  return <DataTable caption="Hoạt động gần đây" footer={rows?.length ? <Pagination from={1} to={rows.length} total={rows.length} /> : undefined}
    head={<><Th className="w-40">Thời gian</Th><Th>Hoạt động gần đây</Th><Th>Giá trị</Th><Th>Kết quả</Th><Th>Thao tác</Th></>}>
    {!rows && <tr><Td colSpan={5} className="text-center text-muted">{NO_DATA}</Td></tr>}
    {rows?.length === 0 && <tr><Td colSpan={5} className="text-center text-muted">Chưa có hoạt động nào.</Td></tr>}
    {rows?.map((row) => <tr key={row.id}>
      <Td><Stack primary={activityTime(row.time)} secondary={activityDay(row.time, now)} strong /></Td>
      <Td><Stack primary={row.title} secondary={row.detail} /></Td>
      <Td className="font-semibold tabular-nums">{row.value ?? "—"}</Td>
      <Td><StatusBadge status={overviewActivityStatusLabels[row.status]} /></Td>
      <Td><ActionLink href={row.href}>Chi tiết</ActionLink></Td>
    </tr>)}
  </DataTable>;
}

export function OverviewView({ overview, preset }: { overview: AdminOverview; preset: OverviewPreset }) {
  const { revenue, orders, newCustomers, lowStock, recentActivity, period, generatedAt } = overview;
  // The reports hold the detail behind these cards and open on the same dates.
  const financeLink = { href: reportHref("/admin/reports/finance", period), label: "Xem báo cáo tài chính" };
  const salesLink = { href: reportHref("/admin/reports/sales", period), label: "Xem báo cáo bán hàng" };
  const inventoryLink = { href: reportHref("/admin/reports/inventory", period), label: "Xem báo cáo tồn kho" };
  return <>
    <AdminPageHeader breadcrumbs={["Tổng quan", "Tổng quan kinh doanh"]} title="Tổng quan kinh doanh"
      subtitle={<AdminGreeting suffix={`đây là hoạt động cửa hàng từ ${formatPeriodDate(period.from)} đến ${formatPeriodDate(period.to)}.`} />}
      actions={<OverviewPeriodSelect current={preset} />} />

    <section aria-label="Chỉ số chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {revenue
        ? <KpiCard label="Doanh thu thuần" value={formatVnd(revenue.value)} detail={growthText(revenue.growthPercent)} link={financeLink} />
        : <KpiCard label="Doanh thu thuần" value={NO_DATA} detail={NO_DATA_DETAIL} link={financeLink} />}
      <CountKpi label="Đơn hàng" metric={orders} link={salesLink} />
      <CountKpi label="Người dùng mới" metric={newCustomers} />
      {lowStock
        ? <KpiCard label="Sản phẩm sắp hết" value={String(lowStock.total)} detail={lowStock.total ? "Cần bổ sung tồn kho" : "Tồn kho đang ổn định"} tone={lowStock.total ? "warning" : "default"} link={inventoryLink} />
        : <KpiCard label="Sản phẩm sắp hết" value={NO_DATA} detail={NO_DATA_DETAIL} link={inventoryLink} />}
    </section>

    <StockAlerts lowStock={lowStock} />
    <RecentActivity rows={recentActivity} now={generatedAt} />
  </>;
}
