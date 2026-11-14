"use client";

import Link from "next/link";
import { CircleCheck, Star } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { DetailList, InfoCallout, card, control, primaryLink, secondaryButton } from "@/components/workspace/workspace-ui";
import { useUserCreate } from "../hooks/use-user-create";
import { AdminPageHeader } from "./admin-ui";
import { PasswordResetButton } from "./password-reset-button";

const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;

export function UserCreateForm() {
  const { values, errors, formError, pending, created, reset, set, submit, startOver } = useUserCreate();

  if (created) {
    return <>
      <AdminPageHeader breadcrumbs={["Người dùng", "Thêm nhân viên"]} title="Đã tạo tài khoản nhân viên" subtitle={`${created.code} · ${created.fullName}`}
        actions={<>
          <button type="button" className={`${secondaryButton} min-h-12`} onClick={startOver}>Thêm nhân viên khác</button>
          <Link href={`/admin/users/${created.id}`} className={`${primaryLink} min-h-12`}>Xem tài khoản</Link>
        </>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="created-title" className={`${card} min-w-0 p-6`}>
          <h2 id="created-title" className="flex items-center gap-2 text-xl font-semibold"><CircleCheck className="h-6 w-6 text-success" aria-hidden="true" />Tài khoản đã sẵn sàng</h2>
          <div className="mt-4"><DetailList items={[
            { label: "Mã tài khoản", value: created.code },
            { label: "Email đăng nhập", value: created.email },
            { label: "Vai trò", value: "Staff" },
          ]} /></div>
          <p className="mt-4 text-sm leading-relaxed text-muted">Nhân viên đặt mật khẩu từ liên kết trong email, rồi đăng nhập tại trang đăng nhập để vào không gian vận hành.</p>
        </section>
        <aside className="min-w-0 space-y-4" aria-label="Email đặt mật khẩu">
          <section aria-labelledby="reset-title" className={`${card} space-y-4 p-6`}>
            <h2 id="reset-title" className="text-xl font-semibold">Email đặt mật khẩu</h2>
            <PasswordResetButton reset={reset} label="Gửi email đặt mật khẩu" />
          </section>
        </aside>
      </div>
    </>;
  }

  return <>
    <AdminPageHeader breadcrumbs={["Người dùng", "Thêm nhân viên"]} title="Thêm nhân viên" subtitle="Tạo tài khoản Staff. Khách hàng tự đăng ký tài khoản của mình."
      actions={<>
        <Link href="/admin/users" className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="user-create-form" disabled={pending} className={`${primaryLink} min-h-12 px-8 disabled:opacity-60`}>{pending ? "Đang tạo…" : "Tạo tài khoản"}</button>
      </>} />
    {formError && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger">{formError}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="user-create-form" noValidate onSubmit={submit} aria-busy={pending} aria-labelledby="user-form-title" className={`${card} min-w-0 p-6`}>
        <h2 id="user-form-title" className="text-xl font-semibold">Thông tin nhân viên</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="user-fullName" label="Họ và tên" required autoComplete="off" maxLength={100} value={values.fullName} error={errors.fullName} onChange={(e) => set("fullName", e.target.value)} />
          <TextField id="user-role" label="Vai trò" value="Staff" disabled readOnly />
          <TextField id="user-email" label="Email đăng nhập" type="email" required autoComplete="off" maxLength={254} value={values.email} error={errors.email}
            hint="Liên kết đặt mật khẩu được gửi tới địa chỉ này." onChange={(e) => set("email", e.target.value)} />
          <TextField id="user-phone" label="Số điện thoại" type="tel" required autoComplete="off" maxLength={20} value={values.phone} error={errors.phone} onChange={(e) => set("phone", e.target.value)} />
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <label htmlFor="user-adminNote" className="text-sm font-medium">Ghi chú nội bộ</label>
            <textarea id="user-adminNote" maxLength={1000} className={textarea} value={values.adminNote} onChange={(e) => set("adminNote", e.target.value)}
              aria-invalid={Boolean(errors.adminNote)} aria-describedby={errors.adminNote ? "user-adminNote-error" : undefined} />
            {errors.adminNote && <p id="user-adminNote-error" className="text-sm text-danger">{errors.adminNote}</p>}
          </div>
        </div>
      </form>
      <aside className="min-w-0" aria-label="Bảo mật tài khoản">
        <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Bảo mật tài khoản">
          Admin không đặt và không thấy mật khẩu. Sau khi tạo, hệ thống gửi email để nhân viên tự đặt mật khẩu.
        </InfoCallout>
      </aside>
    </div>
  </>;
}
