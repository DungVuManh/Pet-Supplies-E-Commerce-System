import Link from "next/link";
import { AdminGreeting } from "@/features/admin/components/admin-greeting";
import { AdminPageHeader, DataTable, KpiCard, PeriodChip, StatusBadge, Stack, Td, Th } from "@/features/admin/components/admin-ui";
import { lowStockLevels, lowStockTotal } from "@/features/admin/mock/inventory";
import { cumulativeRevenue, overview, recentActivity, reportPeriod } from "@/features/admin/mock/overview";
import { ActionLink, LineChart, Pagination, card } from "@/features/workspace/components/workspace-ui";

export const metadata = { title: "Tổng quan kinh doanh" };

const vnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

export default function AdminDashboardPage() {
  const lowStock = lowStockLevels();
  return <>
    <AdminPageHeader breadcrumbs={["Tổng quan", "Tổng quan kinh doanh"]} title="Tổng quan kinh doanh"
      subtitle={<AdminGreeting suffix="đây là hoạt động cửa hàng trong tháng 10." />} actions={<PeriodChip period={reportPeriod} />} />

    <section aria-label="Chỉ số chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Doanh thu thuần" value={vnd(overview.netRevenue)} detail={`${overview.netRevenueGrowth} so với kỳ trước`} />
      <KpiCard label="Đơn hàng" value={String(overview.orders)} detail={`+${overview.ordersInPeriod} đơn trong kỳ`} />
      <KpiCard label="Người dùng mới" value={String(overview.newUsers)} detail={`${overview.newUsersGrowth} so với kỳ trước`} />
      <KpiCard label="Sản phẩm sắp hết" value={String(lowStockTotal)} detail="Cần bổ sung tồn kho" tone="warning" />
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_344px]">
      <LineChart title="Doanh thu lũy kế" subtitle="Đơn vị: triệu đồng · Lũy kế" data={cumulativeRevenue} unit="triệu đồng" />
      <section aria-labelledby="stock-alert" className={`${card} min-w-0 p-6`}>
        <h2 id="stock-alert" className="text-xl font-semibold">Cảnh báo tồn kho</h2>
        <p className="mt-4 inline-flex rounded-full bg-warning-subtle px-2 py-1.5 text-xs font-semibold text-warning">{lowStockTotal} sản phẩm dưới định mức</p>
        <ul className="mt-4 space-y-4">{lowStock.map((item) => <li key={item.sku}>
          <Link href={`/admin/products/${item.sku}`} className="font-semibold hover:text-brand hover:underline">{item.shortName}</Link>
          <p className="mt-2 text-xs text-muted">Còn {item.available} · Tối thiểu {item.threshold}</p>
        </li>)}</ul>
        <Link href="/admin/inventory" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">Xem kho hàng →</Link>
      </section>
    </div>

    <DataTable caption="Hoạt động gần đây" footer={<Pagination from={1} to={recentActivity.length} total={recentActivity.length} />}
      head={<><Th className="w-40">Thời gian</Th><Th>Hoạt động gần đây</Th><Th>Giá trị</Th><Th>Kết quả</Th><Th>Thao tác</Th></>}>
      {recentActivity.map((row) => <tr key={row.id}>
        <Td><Stack primary={row.time} secondary={row.day} strong /></Td>
        <Td><Stack primary={row.title} secondary={row.detail} /></Td>
        <Td className="font-semibold tabular-nums">{row.value}</Td>
        <Td><StatusBadge status={row.status} /></Td>
        <Td><ActionLink href={row.href}>Chi tiết</ActionLink></Td>
      </tr>)}
    </DataTable>
  </>;
}
