"use client";

import { Package } from "lucide-react";
import { BarChart, MetricCard, PageHeader, card } from "@/components/workspace/workspace-ui";
import { formatCurrency } from "@/lib/format-currency";
import { ReportControls } from "../../components/report-controls";
import { useStaffAnalytics } from "../hooks/use-staff-analytics";
import { ReportError, ReportLoading, ReportRefresh } from "./report-state";

export function SalesView() {
  const { data, error, query, navigate, refresh } = useStaffAnalytics("sales");
  return <>
    <PageHeader title="Thống kê doanh số" subtitle="Doanh số sản phẩm theo ngày tạo đơn · Chỉ đơn hoàn thành và đã thanh toán" />
    <ReportControls period={data?.period} query={query} onChange={navigate} />
    <ReportRefresh at={data?.generatedAt} refresh={refresh} />
    {error ? <ReportError error={error} retry={refresh} /> : !data ? <ReportLoading /> : <>
      <p className="text-xs text-muted">Kỳ {data.period.dateFrom} – {data.period.dateTo} · Không phải dòng tiền thu theo ngày thanh toán.</p>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số doanh số">
        <MetricCard label="Doanh số trong kỳ" value={formatCurrency(data.summary.revenue)} detail={data.growthPercent === null
          ? "Chưa có cơ sở so sánh với kỳ trước" : `${data.growthPercent > 0 ? "+" : ""}${data.growthPercent}% so với kỳ trước cùng độ dài`} />
        <MetricCard label="Đơn ghi nhận doanh số" value={`${data.summary.orderCount} đơn`} detail="Không gồm đơn hủy, chưa thanh toán hoặc tạo dở" />
        <MetricCard label="Giá trị đơn trung bình" value={data.summary.averageOrderValue === null ? "—" : formatCurrency(data.summary.averageOrderValue)} detail="Doanh số sản phẩm / số đơn trong kỳ" />
        <MetricCard label="Doanh số hôm nay" value={formatCurrency(data.today.summary.revenue)} detail={`${data.today.summary.orderCount} đơn · ${data.today.period.dateTo}`} />
      </section>
      {!data.summary.orderCount && <p role="status" className="rounded-lg bg-canvas p-4 text-muted">Chưa có đơn hoàn thành và đã thanh toán trong kỳ này. Bạn có thể chọn khoảng ngày khác.</p>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <BarChart title={`Doanh số theo ${data.period.groupBy === "week" ? "tuần" : data.period.groupBy === "month" ? "tháng" : "ngày"}`}
          subtitle="Đơn vị: đồng · Ngày trên biểu đồ là ngày đầu mỗi nhóm"
          data={data.series.map((item) => ({ label: item.date, value: item.value }))} unit="đồng" />
        <section className={`${card} min-w-0 p-6`}><h2 className="text-xl font-semibold">Sản phẩm bán chạy</h2>
          <p className="mt-2 text-xs text-muted">Tối đa 4 SKU theo doanh số · Giá và tên tại thời điểm đặt đơn</p>
          {data.topProducts.length ? <ul className="mt-4 divide-y divide-line">{data.topProducts.map((item) => <li key={`${item.productId}:${item.sku}`} className="flex items-start gap-3 py-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted"><Package aria-hidden="true" size={22} /></span>
            <div className="min-w-0"><p className="break-words font-semibold">{item.name}</p><p className="mt-2 break-words text-xs text-muted">{item.sku} · {item.quantity} sản phẩm</p>
              <p className="mt-2 font-medium">{formatCurrency(item.revenue)}</p></div>
          </li>)}</ul> : <p className="mt-6 text-muted">Chưa có sản phẩm được ghi nhận trong kỳ này.</p>}
        </section>
      </div>
      <section className="flex flex-wrap gap-4 rounded-lg bg-canvas p-5" aria-label="Từ đầu tháng đến hôm nay">
        <span className="text-muted">Từ đầu tháng đến hôm nay</span><strong>{data.monthToDate.summary.orderCount} đơn</strong>
        <strong>{formatCurrency(data.monthToDate.summary.revenue)}</strong>
        <span className="text-xs text-muted">{data.monthToDate.period.dateFrom} – {data.monthToDate.period.dateTo}</span>
      </section>
    </>}
  </>;
}
