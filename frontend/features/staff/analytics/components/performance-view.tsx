"use client";

import { ActionLink, BarChart, Badge, MetricCard, PageHeader, card } from "@/components/workspace/workspace-ui";
import { ReportControls } from "../../components/report-controls";
import { useStaffAnalytics } from "../hooks/use-staff-analytics";
import { ReportError, ReportLoading, ReportRefresh } from "./report-state";
import type { PerformanceReport } from "../types";

const actionLabels: Record<PerformanceReport["activity"][number]["action"], string> = {
  confirmed: "Xác nhận đơn", processing: "Bắt đầu chuẩn bị đơn", shipping: "Chuyển đơn sang đang giao",
  cancelled: "Hủy đơn", offline_sale: "Tạo đơn tại quầy",
};
export function PerformanceView() {
  const { data, error, user, query, navigate, refresh } = useStaffAnalytics("performance");
  return <>
    <PageHeader title="Hiệu suất cá nhân" subtitle={`${user?.fullName || "Nhân viên"} · Chỉ hiển thị công việc của bạn`} />
    <ReportControls performance period={data?.period} query={query} onChange={navigate} />
    <ReportRefresh at={data?.generatedAt} refresh={refresh} />
    {error ? <ReportError error={error} retry={refresh} /> : !data ? <ReportLoading /> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số cá nhân">
        <MetricCard label="Đơn đã xử lý trong kỳ" value={`${data.processedOrders} đơn`}
          detail={`${data.processedOrders - data.previousProcessedOrders >= 0 ? "+" : ""}${data.processedOrders - data.previousProcessedOrders} đơn so với kỳ trước · Không đếm trùng`} />
        <MetricCard label="Thao tác được ghi nhận" value={`${data.actionCount} thao tác`} detail="Gồm xử lý, tạo đơn tại quầy và hủy đơn" />
        <MetricCard label="Đơn bạn đã hủy" value={`${data.cancelledOrders} đơn`} detail="Tính riêng; không phải số yêu cầu hủy được duyệt" />
        <MetricCard label="Đơn xử lý hôm nay" value={`${data.todayProcessedOrders} đơn`} detail="Chưa có mục tiêu ca làm để so sánh" />
      </section>
      {!data.actionCount && <p role="status" className="rounded-lg bg-canvas p-4 text-muted">Bạn chưa có hoạt động được ghi nhận trong kỳ này.</p>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <BarChart title="Số đơn đã xử lý theo ngày" subtitle="Mỗi đơn một lần trong kỳ, theo ngày thao tác xử lý đầu tiên của bạn"
          data={data.series.map((item) => ({ label: item.date, value: item.value }))} unit="đơn" />
        <section className={`${card} min-w-0 p-6`}><h2 className="text-xl font-semibold">Mục tiêu & chất lượng</h2>
          <dl className="mt-5 space-y-5">{["Mục tiêu tuần / ca", "Thời gian xử lý trung bình", "Tỷ lệ xử lý đúng hạn"].map((label) => <div key={label}>
            <dt className="font-medium">{label}</dt><dd className="mt-2 text-muted">Chưa có dữ liệu</dd>
          </div>)}</dl>
          <p className="mt-6 rounded-lg bg-canvas p-4 text-sm leading-relaxed text-muted">Hệ thống chưa lưu mục tiêu, hạn xử lý hoặc thời gian làm việc thực tế. Chưa thể đánh giá đạt hay chưa đạt.</p>
        </section>
      </div>
      <section className={`${card} p-6`}><h2 className="text-xl font-semibold">Hoạt động gần nhất trong kỳ</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">Tối đa 10 hoạt động. Đơn đã xử lý gồm xác nhận, chuẩn bị, chuyển giao và tạo đơn tại quầy; thao tác hủy được tính riêng.</p>
        {data.activity.length ? <ul className="mt-4 divide-y divide-line">{data.activity.map((item, index) => <li key={`${item.orderId}:${item.at}:${item.action}:${index}`}
          className="grid gap-3 py-4 md:grid-cols-[160px_minmax(0,1fr)_auto]">
          <time className="text-xs text-muted" dateTime={item.at}>{new Date(item.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time>
          <div><p>{actionLabels[item.action]}</p><ActionLink href={`/staff/orders/${item.orderId}`}>{item.orderCode}</ActionLink></div>
          <span><Badge tone={item.action === "cancelled" ? "neutral" : "success"}>Đã ghi nhận</Badge></span>
        </li>)}</ul> : <p className="mt-6 text-muted">Chưa có hoạt động trong khoảng ngày đã chọn.</p>}
      </section>
    </>}
  </>;
}
