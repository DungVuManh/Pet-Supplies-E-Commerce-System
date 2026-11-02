"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { ActionLink, DetailList, InfoCallout, card, dangerButton, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { formatDate, formatDateTime, formatPhone, formatVnd } from "@/lib/format";
import { useUserLock } from "../hooks/use-user-lock";
import { userActivityStatusLabels, userRoleLabels, userStatusLabels } from "../status";
import type { AdminUserDetail, UserAddress } from "../types";
import { AdminPageHeader, DataTable, KpiCard, StatusBadge, Stack, Td, Th } from "./admin-ui";
import { LockUserDialog } from "./lock-user-dialog";

const addressText = (address: UserAddress) =>
  `${address.street}, ${address.ward}, ${address.district}, ${address.province}. Người nhận: ${address.recipientName} · ${formatPhone(address.phone)}.`;

export function UserDetailView({ user }: { user: AdminUserDetail }) {
  const lock = useUserLock(user);
  const customer = user.role === "customer";

  return <>
    <AdminPageHeader breadcrumbs={["Người dùng", user.fullName]} title={user.fullName}
      subtitle={`${user.code} · ${customer ? "Khách hàng" : "Nhân viên"} từ ngày ${formatDate(user.joinedAt)}`}
      actions={<>
        <button type="button" onClick={lock.openDialog} className={`${lock.locked ? secondaryButton : dangerButton} min-h-12`}>{lock.locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</button>
        <Link href={`/admin/users/${user.id}/edit`} className={`${primaryLink} min-h-12 px-8`}>Chỉnh sửa</Link>
      </>} />
    {lock.notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{lock.notice}</p>}

    <div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">
      <section aria-labelledby="account-info" className={`${card} min-w-0 p-6`}>
        <h2 id="account-info" className="text-xl font-semibold">Thông tin tài khoản</h2>
        <div className="mt-4"><StatusBadge status={userStatusLabels[lock.status]} /></div>
        <div className="mt-2"><DetailList items={[
          { label: "Mã tài khoản", value: user.code }, { label: "Vai trò", value: userRoleLabels[user.role] },
          { label: "Email", value: user.email }, { label: "Điện thoại", value: formatPhone(user.phone) },
          { label: "Đăng nhập gần nhất", value: user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "Chưa có thông tin" },
          ...(lock.locked ? [
            { label: "Khóa lúc", value: lock.lockedAt ? formatDateTime(lock.lockedAt) : "Chưa có thông tin" },
            { label: "Lý do khóa", value: lock.lockReason || "Chưa có thông tin" },
          ] : []),
        ]} /></div>
      </section>
      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard label={customer ? "Đơn đã hoàn thành" : "Đơn đã xử lý"} value={String(user.completedOrders)} detail="Từ khi tạo tài khoản" />
          <KpiCard label={customer ? "Tổng chi tiêu" : "Doanh số phụ trách"} value={formatVnd(user.totalSpent)} detail="Đơn đã hoàn thành và đã thanh toán" />
        </div>
        <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title={customer ? "Địa chỉ mặc định" : "Địa chỉ liên hệ"}>
          {user.defaultAddress ? addressText(user.defaultAddress) : "Chưa có địa chỉ mặc định."}
        </InfoCallout>
        <p className="leading-relaxed text-muted">{customer
          ? "Khi khóa tài khoản, khách hàng không thể đăng nhập hoặc tạo đơn mới. Đơn hiện tại vẫn tiếp tục được xử lý; bạn có thể mở khóa bất cứ lúc nào."
          : "Khi khóa tài khoản, nhân viên không thể đăng nhập không gian vận hành. Các đơn đang xử lý cần được giao lại cho nhân viên khác."}</p>
      </div>
    </div>

    <DataTable caption="Lịch sử hoạt động"
      footer={user.activity.length > 0 && <p className="border-t border-line px-6 py-4 text-xs text-muted">{user.activity.length} hoạt động gần nhất</p>}
      head={<><Th className="w-40">Thời gian</Th><Th>Lịch sử hoạt động</Th><Th>Giá trị</Th><Th>Trạng thái</Th><Th>Thao tác</Th></>}>
      {user.activity.length === 0 && <tr><td colSpan={5} className="border-t border-line px-6 py-8 text-center text-muted">Chưa có hoạt động nào.</td></tr>}
      {user.activity.map((row) => {
        const date = formatDate(row.at);
        return <tr key={row.id}>
          <Td><Stack primary={formatDateTime(row.at).replace(date, date.slice(0, 5))} secondary={date.slice(6)} strong /></Td>
          <Td><Stack primary={row.title} secondary={row.detail} /></Td>
          <Td className="font-semibold tabular-nums">{row.amount === null ? "—" : formatVnd(row.amount)}</Td>
          <Td><StatusBadge status={userActivityStatusLabels[row.status]} /></Td>
          <Td><ActionLink href={row.href}>Chi tiết</ActionLink></Td>
        </tr>;
      })}
    </DataTable>

    <LockUserDialog open={lock.open} locked={lock.locked} account={user.fullName} reason={lock.reason} reasonError={lock.reasonError}
      formError={lock.formError} pending={lock.pending} onReasonChange={lock.changeReason} onConfirm={lock.confirm} onClose={lock.closeDialog} />
  </>;
}
