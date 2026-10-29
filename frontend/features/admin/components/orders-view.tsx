"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CircleX, Download, Package } from "lucide-react";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { Badge, ListState, Pagination, TabNav, card, control, listStatePill, primaryLink } from "@/components/workspace/workspace-ui";
import { useListState } from "@/components/workspace/use-list-state";
import type { OrderStatus } from "@/features/staff/mock-data";
import { filterOrders, orderStatusLabel, type OrderFilter, type OrderTab } from "../mock/orders";
import { reportPeriod } from "../mock/overview";
import { AdminPageHeader, StatusBadge, Stack, Td, Th } from "./admin-ui";

const PAGE_SIZE = 6;
const tabs: { value: OrderTab; label: string }[] = [
  { value: "all", label: "Tất cả đơn" }, { value: "processing", label: "Chờ xử lý" }, { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn thành" }, { value: "cancelled", label: "Đã hủy" },
];
const vnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

export function OrdersView() {
  const pathname = usePathname();
  const reviewState = useListState();
  // `?q=` lets other screens (dashboard, user activity) open the list already searched for one order.
  const linkedQuery = useSearchParams().get("q") ?? "";
  const [filter, setFilter] = useState<OrderFilter>({ tab: "all", query: linkedQuery, status: "all" });
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");

  const rows = filterOrders(filter);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const state = reviewState ?? (rows.length === 0 ? "empty" : null);
  const loading = state === "loading";

  function update(next: Partial<OrderFilter>) { setFilter((current) => ({ ...current, ...next })); setPage(1); setNotice(""); }
  const footnote = { empty: "Bộ lọc được giữ để bạn tiếp tục tìm kiếm.", loading: "Đang đồng bộ dữ liệu mới nhất.", error: "Liên hệ support@petly.vn nếu lỗi tiếp tục xảy ra." };

  return <>
    <AdminPageHeader breadcrumbs={["Đơn hàng", "Danh sách đơn hàng"]} title="Danh sách đơn hàng" subtitle="Theo dõi và xử lý các đơn hàng của cửa hàng."
      actions={loading
        ? <button type="button" disabled className={`${primaryLink} min-h-12 gap-2 opacity-40`}><Download className="h-4 w-4" aria-hidden="true" />Xuất đơn hàng</button>
        : <DemoNotice label="Xuất đơn hàng" icon={<Download className="h-4 w-4" aria-hidden="true" />} message="Xuất danh sách đơn hàng chưa kết nối backend; bản demo không tạo tệp." />} />

    <TabNav label="Nhóm đơn hàng" items={tabs.map((tab) => ({ label: tab.label, active: filter.tab === tab.value, onSelect: () => update({ tab: tab.value }) }))} />

    <section aria-labelledby="orders-card" className={`${card} min-w-0 p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="orders-card" className="text-xl font-semibold">Danh sách đơn hàng</h2>
        {state ? <Badge tone={listStatePill[state].tone}>{listStatePill[state].label}</Badge> : <Badge>{rows.length} đơn</Badge>}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_192px]">
        <div className="flex min-w-0 flex-col gap-2"><label htmlFor="order-query" className="text-xs font-semibold">Tìm kiếm</label>
          <input id="order-query" type="search" className={control} placeholder="Mã đơn, khách hàng hoặc số điện thoại" value={filter.query} disabled={loading} onChange={(e) => update({ query: e.target.value })} /></div>
        <div className="flex min-w-0 flex-col gap-2"><label htmlFor="order-status" className="text-xs font-semibold">Trạng thái</label>
          <select id="order-status" className={control} value={filter.status} disabled={loading} onChange={(e) => update({ status: e.target.value as OrderStatus | "all" })}>
            <option value="all">Tất cả</option>
            {(Object.keys(orderStatusLabel) as OrderStatus[]).map((status) => <option key={status} value={status}>{orderStatusLabel[status]}</option>)}
          </select></div>
      </div>
      {notice && <p role="status" className="mt-4 rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

      <div className="mt-6 min-w-0 overflow-hidden rounded-lg border border-line">
        <div className="overflow-x-auto"><table className="w-full min-w-[880px] border-collapse text-left">
          <caption className="sr-only">Danh sách đơn hàng</caption>
          <thead className="bg-canvas text-xs uppercase text-muted"><tr>
            <Th className="w-44">Mã đơn</Th><Th>Khách hàng</Th><Th className="w-36">Tổng tiền</Th><Th className="w-36">Trạng thái</Th><Th className="w-32">Thao tác</Th>
          </tr></thead>
          {!state && <tbody>{visible.map((order) => <tr key={order.id}>
            <Td><Stack primary={`#${order.id}`} secondary={`${order.date} · ${order.time}`} strong /></Td>
            <Td><Stack primary={order.customer} secondary={`${order.phone} · ${order.payment}`} /></Td>
            <Td className="font-semibold tabular-nums">{vnd(order.total)}</Td>
            <Td><StatusBadge status={orderStatusLabel[order.status]} /></Td>
            <Td><button type="button" className="inline-flex min-h-10 items-center font-semibold text-brand hover:underline"
              onClick={() => setNotice(`Chi tiết đơn #${order.id} chưa có màn hình quản trị; Staff xử lý đơn tại không gian vận hành.`)}>Chi tiết →</button></Td>
          </tr>)}</tbody>}
        </table></div>
        {!state && <Pagination from={(page - 1) * PAGE_SIZE + 1} to={(page - 1) * PAGE_SIZE + visible.length} total={rows.length} page={page} pages={pages} onPage={setPage} />}
      </div>

      {state === "empty" && <ListState kind="empty" icon={<Package className="h-8 w-8" strokeWidth={1.5} />} title="Không tìm thấy đơn hàng"
        description={filter.query.trim()
          ? `Không có đơn khớp “${filter.query.trim()}” trong kỳ đã chọn. Thử đổi từ khóa hoặc bỏ bộ lọc để xem các đơn khác.`
          : "Không có đơn nào khớp bộ lọc hiện tại. Thử chọn nhóm hoặc trạng thái khác."}
        action={<button type="button" className={`${primaryLink} min-h-10`} onClick={() => update({ tab: "all", query: "", status: "all" })}>Xóa bộ lọc</button>} />}
      {state === "loading" && <ListState kind="loading" title="Đang tải danh sách đơn hàng..." />}
      {state === "error" && <ListState kind="error" icon={<CircleX className="h-9 w-9" strokeWidth={1.5} />} title="Không thể tải danh sách đơn hàng"
        description="Kết nối đến hệ thống bị gián đoạn. Bộ lọc của bạn được giữ lại. Kiểm tra kết nối và thử tải lại."
        action={<Link href={pathname} className={`${primaryLink} min-h-10`}>Thử lại</Link>} />}
      {state && <p className="mt-6 text-xs text-muted">{{ empty: "0 kết quả · Bộ lọc hiện tại được giữ nguyên", loading: "Đang đồng bộ · Vui lòng chờ trong giây lát", error: "Chưa có dữ liệu mới · Không thay đổi trạng thái đơn hoặc tồn kho" }[state]}</p>}
    </section>
    <p className="text-xs text-muted">Khoảng thời gian: {reportPeriod} · {state ? footnote[state] : "Đơn mới nhất hiển thị trước."}</p>
  </>;
}
