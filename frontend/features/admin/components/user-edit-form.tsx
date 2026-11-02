"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { Badge, InfoCallout, card, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useUserEdit } from "../hooks/use-user-edit";
import { userRoleLabels, userStatusLabels } from "../status";
import type { AdminUserDetail, UserRole, UserStatus } from "../types";
import { AdminPageHeader } from "./admin-ui";

const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;

/** Plain-language scope per role, shown beside the form. */
const rolePermissions: Record<UserRole, { summary: string; others: string }> = {
  customer: { summary: "Mua hàng, quản lý tài khoản và xem đơn hàng của chính mình.", others: "Staff được xử lý đơn và cập nhật tồn kho. Admin có toàn quyền quản trị và phân quyền." },
  staff: { summary: "Xử lý đơn hàng, duyệt yêu cầu hủy, cập nhật sản phẩm và tồn kho.", others: "Customer chỉ thao tác trên dữ liệu của mình. Admin có toàn quyền quản trị và phân quyền." },
};

function addressText({ defaultAddress: address }: AdminUserDetail) {
  return address ? `${address.street}, ${address.ward}, ${address.district}, ${address.province}` : "Chưa có địa chỉ mặc định";
}

export function UserEditForm({ user: initialUser }: { user: AdminUserDetail }) {
  const { user, values, errors, notice, formError, pending, locking, set, submit } = useUserEdit(initialUser);
  const permissions = rolePermissions[values.role];

  return <>
    <AdminPageHeader breadcrumbs={["Người dùng", "Chỉnh sửa người dùng"]} title="Chỉnh sửa người dùng"
      subtitle={`${user.code} · ${user.fullName}. Các trường có * là bắt buộc.`}
      actions={<>
        <Link href={`/admin/users/${user.id}`} className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="user-edit-form" disabled={pending} className={`${primaryLink} min-h-12 px-8 disabled:opacity-60`}>{pending ? "Đang lưu…" : "Lưu thay đổi"}</button>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}
    {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="user-edit-form" noValidate onSubmit={submit} aria-busy={pending} aria-labelledby="user-form-title" className={`${card} min-w-0 p-6`}>
        <h2 id="user-form-title" className="text-xl font-semibold">Thông tin tài khoản</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="user-fullName" label="Họ và tên" required autoComplete="off" maxLength={100} value={values.fullName} error={errors.fullName} onChange={(e) => set("fullName", e.target.value)} />
          <TextField id="user-code" label="Mã tài khoản" value={user.code} disabled readOnly />
          <TextField id="user-email" label="Email" type="email" value={user.email} disabled readOnly hint="Email do dịch vụ xác thực quản lý nên không thể sửa tại đây." />
          <TextField id="user-phone" label="Số điện thoại" type="tel" required autoComplete="off" maxLength={20} value={values.phone} error={errors.phone} onChange={(e) => set("phone", e.target.value)} />
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="user-role" className="text-sm font-medium">Vai trò<span aria-hidden="true"> *</span></label>
            <select id="user-role" required className={control} value={values.role} onChange={(e) => set("role", e.target.value as UserRole)}>
              <option value="customer">{userRoleLabels.customer}</option><option value="staff">{userRoleLabels.staff}</option>
            </select>
            {values.role !== user.role && <p className="text-xs text-muted">Người dùng sẽ bị đăng xuất và nhận vai trò mới ở lần đăng nhập tiếp theo.</p>}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="user-status" className="text-sm font-medium">Trạng thái</label>
            <select id="user-status" className={control} value={values.status} onChange={(e) => set("status", e.target.value as UserStatus)}>
              <option value="active">{userStatusLabels.active}</option><option value="locked">{userStatusLabels.locked}</option>
            </select>
          </div>
          {locking && <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <label htmlFor="user-lockReason" className="text-sm font-medium">Lý do khóa<span aria-hidden="true"> *</span></label>
            <textarea id="user-lockReason" required maxLength={200} className={textarea} value={values.lockReason} onChange={(e) => set("lockReason", e.target.value)}
              aria-invalid={Boolean(errors.lockReason)} aria-describedby={errors.lockReason ? "user-lockReason-error" : undefined} />
            {errors.lockReason && <p id="user-lockReason-error" className="text-sm text-danger">{errors.lockReason}</p>}
          </div>}
          <div className="sm:col-span-2"><TextField id="user-address" label="Địa chỉ mặc định" value={addressText(user)} disabled readOnly /></div>
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <label htmlFor="user-adminNote" className="text-sm font-medium">Ghi chú nội bộ</label>
            <textarea id="user-adminNote" maxLength={1000} className={textarea} value={values.adminNote} onChange={(e) => set("adminNote", e.target.value)}
              aria-invalid={Boolean(errors.adminNote)} aria-describedby={errors.adminNote ? "user-adminNote-error" : undefined} />
            {errors.adminNote && <p id="user-adminNote-error" className="text-sm text-danger">{errors.adminNote}</p>}
          </div>
        </div>
      </form>

      <aside className="min-w-0 space-y-6" aria-label="Thông tin bổ sung">
        <section aria-labelledby="role-scope" className={`${card} p-6`}>
          <h2 id="role-scope" className="text-xl font-semibold">Quyền theo vai trò</h2>
          <div className="mt-4"><Badge>{userRoleLabels[values.role]}</Badge></div>
          <p className="mt-4 leading-relaxed">{permissions.summary}</p>
          <p className="mt-4 leading-relaxed text-muted">{permissions.others}</p>
        </section>
        <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Bảo mật tài khoản">
          Khi tạo mới, hệ thống gửi liên kết đặt mật khẩu qua email. Không chia sẻ mật khẩu qua ghi chú.
        </InfoCallout>
        <DemoNotice label="Gửi đặt lại mật khẩu" className="[&>button]:w-full" message={`Liên kết đặt lại mật khẩu cho ${user.email} chưa được gửi: chức năng chưa kết nối backend.`} />
      </aside>
    </div>
  </>;
}
