"use client";

import { useState } from "react";
import { CircleX, Download, Package } from "lucide-react";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { Badge, ListState, Pagination, TabNav, card, control, listStatePill, primaryLink } from "@/components/workspace/workspace-ui";
import { formatDateTime, formatPhone, formatVnd } from "@/lib/format";
import { useOrdersList } from "../hooks/use-orders-list";
import { orderStatusLabels, paymentMethodLabels } from "../status";
import type { OrderStatusFilter, OrderTab } from "../types";
import { AdminPageHeader, StatusBadge, Stack, Td, Th } from "./admin-ui";

const tabs: { value: OrderTab; label: string }[] = [
  { value: "all", label: "Tất cả đơn" }, { value: "processing", label: "Chờ xử lý" }, { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn thành" }, { value: "cancelled", label: "Đã hủy" },
];
const statusOptions: { value: Exclude<OrderStatusFilter, "all">; label: string }[] = [
  { value: "pending", label: orderStatusLabels.pending }, { value: "processing", label: orderStatusLabels.processing }, { value: "shipping", label: orderStatusLabels.shipping },
  { value: "completed", label: orderStatusLabels.completed }, { value: "cancelled", label: orderStatusLabels.cancelled },
];

export function OrdersView() {
  const { filter, query, setQuery, selectTab, selectStatus, clearFilters, items, counts, state, error, reload, page, setPage, pagination, from, to } = useOrdersList();
  const [notice, setNotice] = useState("");
  const loading = state === "loading";
  const footnote = { empty: "Bộ lọc được giữ để bạn tiếp tục tìm kiếm.", loading: "Đang đồng bộ dữ liệu mới nhất.", error: "Liên hệ support@petly.vn nếu lỗi tiếp tục xảy ra." };

  return <>
    <AdminPageHeader breadcrumbs={["Đơn hàng", "Danh sách đơn hàng"]} title="Danh sách đơn hàng" subtitle="Theo dõi và xử lý các đơn hàng của cửa hàng."
      actions={loading
        ? <button type="button" disabled className={`${primaryLink} min-h-12 gap-2 opacity-40`}><Download className="h-4 w-4" aria-hidden="true" />Xuất đơn hàng</button>
        : <DemoNotice label="Xuất đơn hàng" icon={<Download className="h-4 w-4" aria-hidden="true" />} message="Xuất danh sách đơn hàng chưa kết nối backend; bản demo không tạo tệp." />} />

    <TabNav label="Nhóm đơn hàng" items={tabs.map((tab) => ({ label: counts ? `${tab.label} (${counts[tab.value].toLocaleString("vi-VN")})` : tab.label, active: filter.tab === tab.value, onSelect: () => { setNotice(""); selectTab(tab.value); } }))} />

    <section aria-labelledby="orders-card" className={`${card} min-w-0 p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="orders-card" className="text-xl font-semibold">Danh sách đơn hàng</h2>
        {state ? <Badge tone={listStatePill[state].tone}>{listStatePill[state].label}</Badge> : <Badge>{pagination.total.toLocaleString("vi-VN")} đơn</Badge>}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_192px]">
        <div className="flex min-w-0 flex-col gap-2"><label htmlFor="order-query" className="text-xs font-semibold">Tìm kiếm</label>
          <input id="order-query" type="search" className={control} placeholder="Mã đơn, khách hàng hoặc số điện thoại" value={query} onChange={(e) => { setNotice(""); setQuery(e.target.value); }} /></div>
        <div className="flex min-w-0 flex-col gap-2"><label htmlFor="order-status" className="text-xs font-semibold">Trạng thái</label>
          <select id="order-status" className={control} value={filter.status} onChange={(e) => { setNotice(""); selectStatus(e.target.value as OrderStatusFilter); }}>
            <option value="all">Tất cả</option>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select></div>
      </div>
      {notice && <p role="status" className="mt-4 rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

      <div className="mt-6 min-w-0 overflow-hidden rounded-lg border border-line">
        <div className="overflow-x-auto"><table className="w-full min-w-[880px] border-collapse text-left">
          <caption className="sr-only">Danh sách đơn hàng</caption>
          <thead className="bg-canvas text-xs uppercase text-muted"><tr>
            <Th className="w-44">Mã đơn</Th><Th>Khách hàng</Th><Th className="w-36">Tổng tiền</Th><Th className="w-36">Trạng thái</Th><Th className="w-32">Thao tác</Th>
          </tr></thead>
          {!state && <tbody>{items.map((order) => <tr key={order.orderCode}>
            <Td><Stack primary={`#${order.orderCode}`} secondary={formatDateTime(order.createdAt)} strong /></Td>
            <Td><Stack primary={order.customerName} secondary={[formatPhone(order.phone), paymentMethodLabels[order.paymentMethod]].filter(Boolean).join(" · ")} /></Td>
            <Td className="font-semibold tabular-nums">{formatVnd(order.total)}</Td>
            <Td><StatusBadge status={orderStatusLabels[order.status]} /></Td>
            <Td><button type="button" className="inline-flex min-h-10 items-center font-semibold text-brand hover:underline"
              onClick={() => setNotice(`Chi tiết đơn #${order.orderCode} chưa có màn hình quản trị; Staff xử lý đơn tại không gian vận hành.`)}>Chi tiết →</button></Td>
          </tr>)}</tbody>}
        </table></div>
        {!state && <Pagination from={from} to={to} total={pagination.total} page={page} pages={pagination.totalPages} onPage={setPage} />}
      </div>

      {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy đơn hàng"
        description={filter.q.trim()
          ? `Không có đơn khớp “${filter.q.trim()}”. Thử đổi từ khóa hoặc bỏ bộ lọc để xem các đơn khác.`
          : "Không có đơn nào khớp bộ lọc hiện tại. Thử chọn nhóm hoặc trạng thái khác."}
        action={<button type="button" className={`${primaryLink} min-h-10`} onClick={clearFilters}>Xóa bộ lọc</button>} />}
      {state === "loading" && <ListState kind="loading" title="Đang tải danh sách đơn hàng..." />}
      {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải danh sách đơn hàng"
        description={error?.message ?? "Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."}
        action={<button type="button" className={`${primaryLink} min-h-10`} onClick={reload}>Thử lại</button>} />}
      {state && <p className="mt-6 text-xs text-muted">{{ empty: "0 kết quả · Bộ lọc hiện tại được giữ nguyên", loading: "Đang đồng bộ · Vui lòng chờ trong giây lát", error: "Chưa có dữ liệu mới · Không thay đổi trạng thái đơn hoặc tồn kho" }[state]}</p>}
    </section>
    <p className="text-xs text-muted">{state ? footnote[state] : "Đơn mới nhất hiển thị trước."}</p>
  </>;
}
