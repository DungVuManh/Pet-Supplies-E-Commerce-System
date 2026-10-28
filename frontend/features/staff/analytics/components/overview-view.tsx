"use client";

import Link from "next/link";
import { ActionLink, BarChart, MetricCard, PageHeader, TableFrame, TableHead, Th, Td, card, primaryLink } from "@/features/workspace/components/workspace-ui";
import { formatCurrency } from "@/lib/format-currency";
import { useStaffAnalytics } from "../hooks/use-staff-analytics";
import { ReportError, ReportLoading, ReportRefresh } from "./report-state";

export function OverviewView() {
  const { data, error, refresh, user } = useStaffAnalytics("overview");
  return <>
    <PageHeader title={user ? `Chào ${user.fullName}, tổng quan công việc hôm nay.` : "Tổng quan vận hành"}
      subtitle="Dữ liệu vận hành toàn cửa hàng và công việc của bạn."
      action={<Link href="/staff/orders/new" className={primaryLink}>Tạo đơn hộ khách</Link>} />
    <ReportRefresh at={data?.generatedAt} refresh={refresh} />
    {error ? <ReportError error={error} retry={refresh} /> : !data ? <ReportLoading /> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số hôm nay">
        <MetricCard label="Doanh số hôm nay" value={formatCurrency(data.sales.today.summary.revenue)} detail="Đơn tạo hôm nay, đã hoàn thành và thanh toán" />
        <MetricCard label="Đơn cần xử lý" value={`${data.backlog.total} đơn`} detail={`${data.backlog.pending} chờ · ${data.backlog.confirmed} xác nhận · ${data.backlog.processing} chuẩn bị`} />
        <MetricCard label="Bạn đã xử lý hôm nay" value={`${data.personal.processedOrders} đơn`} detail="Mỗi đơn tính một lần; không gồm thao tác hủy" />
        <MetricCard label="Thời gian xử lý TB" value="—" detail="Chưa có dữ liệu thời gian làm việc thực tế" />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <BarChart title="Doanh số 7 ngày gần nhất" subtitle="Theo ngày tạo đơn · chỉ đơn hoàn thành và đã thanh toán"
          data={data.sales.series.map((item) => ({ label: item.date.slice(5).split("-").reverse().join("/"), value: item.value }))} unit="đồng" />
        <section className={`${card} min-w-0 p-6`}><h2 className="text-xl font-semibold">Cần chú ý</h2>
          <p className={`mt-4 rounded-lg p-4 ${data.stock.total ? "bg-warning-subtle" : "bg-canvas"}`}>
            {data.stock.total ? `${data.stock.low} SKU sắp hết · ${data.stock.out} SKU hết hàng` : "Không có SKU đang bán cần bổ sung tồn kho."}
          </p>
          <p className="mt-3 text-xs text-muted">Tồn khả dụng = thực tế − giữ chỗ · Ngưỡng {data.stock.threshold}</p>
          <ul className="mt-4 divide-y divide-line">{data.stock.items.map((item) => <li key={`${item.productId}:${item.sku}`} className="py-3">
            <Link href={`/staff/products/${encodeURIComponent(item.sku)}`} className="break-words font-semibold text-brand hover:underline">{item.name}</Link>
            <p className="mt-1 text-xs text-muted">{item.sku} · Còn {item.availableStock}</p>
          </li>)}</ul>
          <ActionLink href="/staff/products">Xem tồn kho</ActionLink>
        </section>
      </div>
      <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Đơn chờ tiếp nhận</h2>
        <ActionLink href="/staff/orders?status=pending">Xem {data.backlog.pending} đơn chờ</ActionLink>
      </div>
        {data.backlog.items.length ? <TableFrame><TableHead><Th>Mã đơn</Th><Th>Ngày tạo</Th><Th right>Tổng tiền</Th><Th>Thao tác</Th></TableHead>
          <tbody>{data.backlog.items.map((item) => <tr key={item.id}><Td><strong>{item.orderCode}</strong></Td>
            <Td>{new Date(item.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</Td>
            <Td right>{formatCurrency(item.total)}</Td><Td><ActionLink href={`/staff/orders/${item.id}`}>Chi tiết</ActionLink></Td></tr>)}</tbody>
        </TableFrame> : <p role="status" className={`${card} p-6 text-muted`}>Không có đơn chờ tiếp nhận.</p>}
      </section>
    </>}
  </>;
}
