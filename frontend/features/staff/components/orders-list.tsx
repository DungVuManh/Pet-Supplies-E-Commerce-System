"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { filterOrders, money, type OrderStatus } from "../mock-data";
import { ActionLink, Badge, PageHeader, TableFrame, TableHead, Td, Th, control, orderLabels, orderTones, primaryLink } from "./staff-ui";

const tabs: { value: OrderStatus | "all"; label: string; count: number }[] = [{ value: "all", label: "Tất cả", count: 334 }, { value: "pending", label: "Chờ xử lý", count: 12 }, { value: "shipping", label: "Đang giao", count: 24 }, { value: "completed", label: "Hoàn thành", count: 292 }, { value: "cancelled", label: "Đã hủy", count: 6 }];
export function OrdersList() {
 const params = useSearchParams(); const router = useRouter(); const initial = (params.get("status") || "all") as OrderStatus | "all";
 const status = tabs.some((tab) => tab.value === initial) ? initial : "all";
 const [query, setQuery] = useState(""); const [notice, setNotice] = useState(params.has("create") ? "Chức năng tạo đơn hộ khách đang dùng dữ liệu mẫu." : "");
 function selectStatus(value: OrderStatus | "all") {
  const next = new URLSearchParams(params.toString());
  if (value === "all") next.delete("status"); else next.set("status", value);
  router.replace(`/staff/orders${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
 }
 const rows = filterOrders(query, status);
 return <><PageHeader title="Danh sách đơn hàng" subtitle="334 đơn trong tháng 10 · 12 đơn cần xử lý · 38 đơn phát sinh hôm nay" action={<button className={primaryLink} onClick={() => setNotice("Đây là bản demo frontend; đơn mới chưa được lưu.")}>Tạo đơn hộ khách</button>} />{notice && <p role="status" className="rounded-lg bg-brand-subtle p-4 text-brand">{notice}</p>}
 <div className="flex gap-2 overflow-x-auto border-b border-line" aria-label="Lọc nhanh theo trạng thái">{tabs.map((tab) => <button key={tab.value} onClick={() => selectStatus(tab.value)} className={`min-h-12 shrink-0 border-b-2 px-4 font-medium ${status === tab.value ? "border-brand text-brand" : "border-transparent text-muted"}`}>{tab.label} ({tab.count})</button>)}</div>
 <div className="grid gap-4 lg:grid-cols-[minmax(260px,2fr)_minmax(190px,1fr)_minmax(220px,1fr)]"><label className="grid gap-2 font-medium">Tìm kiếm đơn hàng<input value={query} onChange={(e) => setQuery(e.target.value)} className={control} placeholder="Mã đơn, tên hoặc số điện thoại khách" /></label><label className="grid gap-2 font-medium">Trạng thái<select value={status} onChange={(e) => selectStatus(e.target.value as OrderStatus | "all")} className={control}><option value="all">Tất cả trạng thái</option>{Object.entries(orderLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="grid gap-2 font-medium">Ngày đặt<input className={control} value="01/10 – 12/10/2026" readOnly /></label></div>
 <TableFrame><TableHead><Th>Mã đơn / Ngày đặt</Th><Th>Khách hàng / Thanh toán</Th><Th right>Tổng tiền</Th><Th>Trạng thái</Th><Th>Thao tác</Th></TableHead><tbody>{rows.map((order) => <tr key={order.id}><Td><strong>#{order.id}</strong><p className="mt-2 text-xs text-muted">{order.date} · {order.time}</p></Td><Td>{order.customer}<p className="mt-2 text-xs text-muted">{order.phone} · {order.items.reduce((n, i) => n + i.quantity, 0)} sản phẩm · {order.payment}</p></Td><Td right><strong>{money(order.total)}</strong></Td><Td><Badge tone={orderTones[order.status]}>{orderLabels[order.status]}</Badge></Td><Td><ActionLink href={`/staff/orders/${order.id}`}>Chi tiết</ActionLink></Td></tr>)}</tbody></TableFrame>
 {rows.length === 0 && <p role="status" className="rounded-lg bg-canvas p-8 text-center text-muted">Không có đơn hàng phù hợp.</p>}<div className="flex flex-wrap justify-between gap-4 text-xs text-muted"><p>Hiển thị {rows.length} trong 334 đơn hàng · 8 đơn / trang</p><p><span className="mr-5">‹ Trước</span><strong className="rounded-full bg-brand-subtle px-4 py-2 text-brand">Trang 1 / 42</strong><span className="ml-5">Tiếp ›</span></p></div></>;
}
