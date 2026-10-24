"use client";

import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import { ActionLink, DetailList, InfoCallout, Pagination, card, dangerButton, primaryLink, secondaryButton } from "@/features/workspace/components/workspace-ui";
import { roleLabels, type UserDetail, type UserStatus } from "../mock/users";
import { AdminPageHeader, DataTable, KpiCard, StatusBadge, Stack, Td, Th } from "./admin-ui";

const vnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

export function UserDetailView({ user }: { user: UserDetail }) {
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [notice, setNotice] = useState("");
  const customer = user.role === "customer";
  const locked = status === "Đã khóa";

  function toggleLock() {
    const next: UserStatus = locked ? "Hoạt động" : "Đã khóa";
    setStatus(next);
    setNotice(`${next === "Đã khóa" ? "Đã khóa" : "Đã mở khóa"} tài khoản ${user.id} trong bản demo; thay đổi chưa được lưu vào hệ thống.`);
  }

  return <>
    <AdminPageHeader breadcrumbs={["Người dùng", user.fullName]} title={user.fullName}
      subtitle={`${user.id} · ${customer ? "Khách hàng" : "Nhân viên"} từ ngày ${user.joinedAt}`}
      actions={<>
        <button type="button" onClick={toggleLock} className={`${locked ? secondaryButton : dangerButton} min-h-12`}>{locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</button>
        <Link href={`/admin/users/${user.id}/edit`} className={`${primaryLink} min-h-12 px-8`}>Chỉnh sửa</Link>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">
      <section aria-labelledby="account-info" className={`${card} min-w-0 p-6`}>
        <h2 id="account-info" className="text-xl font-semibold">Thông tin tài khoản</h2>
        <div className="mt-4"><StatusBadge status={status} /></div>
        <div className="mt-2"><DetailList items={[
          { label: "Mã tài khoản", value: user.id }, { label: "Vai trò", value: roleLabels[user.role] },
          { label: "Email", value: user.email }, { label: "Điện thoại", value: user.phone },
          { label: "Đăng nhập gần nhất", value: user.lastLogin },
        ]} /></div>
      </section>
      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard label={customer ? "Đơn đã hoàn thành" : "Đơn đã xử lý"} value={String(user.completedOrders)} detail="Từ khi tạo tài khoản" />
          <KpiCard label={customer ? "Tổng chi tiêu" : "Doanh số phụ trách"} value={vnd(user.totalSpent)} detail="Không gồm đơn đã hủy" />
        </div>
        <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title={customer ? "Địa chỉ mặc định" : "Địa chỉ liên hệ"}>
          {user.address}. Người nhận: {user.recipient}.
        </InfoCallout>
        <p className="leading-relaxed text-muted">{customer
          ? "Khi khóa tài khoản, khách hàng không thể đăng nhập hoặc tạo đơn mới. Đơn hiện tại vẫn tiếp tục được xử lý; bạn có thể mở khóa bất cứ lúc nào."
          : "Khi khóa tài khoản, nhân viên không thể đăng nhập không gian vận hành. Các đơn đang xử lý cần được giao lại cho nhân viên khác."}</p>
      </div>
    </div>

    <DataTable caption="Lịch sử hoạt động" footer={<Pagination from={1} to={user.activity.length} total={user.activity.length} />}
      head={<><Th className="w-40">Thời gian</Th><Th>Lịch sử hoạt động</Th><Th>Giá trị</Th><Th>Trạng thái</Th><Th>Thao tác</Th></>}>
      {user.activity.map((row) => <tr key={row.id}>
        <Td><Stack primary={row.time} secondary={row.year} strong /></Td>
        <Td><Stack primary={row.title} secondary={row.detail} /></Td>
        <Td className="font-semibold tabular-nums">{row.value}</Td>
        <Td><StatusBadge status={row.status} /></Td>
        <Td><ActionLink href={row.href}>Chi tiết</ActionLink></Td>
      </tr>)}
    </DataTable>
  </>;
}
