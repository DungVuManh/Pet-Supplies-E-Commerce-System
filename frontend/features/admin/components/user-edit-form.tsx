"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { DemoNotice } from "@/features/workspace/components/demo-notice";
import { Badge, InfoCallout, card, control, primaryLink, secondaryButton } from "@/features/workspace/components/workspace-ui";
import { rolePermissions, roleLabels, type UserDetail, type UserRole, type UserStatus } from "../mock/users";
import { validateUser } from "../validation";
import { AdminPageHeader } from "./admin-ui";

type Values = { fullName: string; email: string; phone: string; role: UserRole; status: UserStatus; address: string; note: string };

const textarea = `${control} h-auto min-h-28 py-3 leading-relaxed`;

export function UserEditForm({ user }: { user: UserDetail }) {
  const initial: Values = { fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, status: user.status, address: user.address, note: user.note };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");
  const errors = submitted ? validateUser(values) : {};
  const dirty = (Object.keys(values) as (keyof Values)[]).some((key) => values[key] !== saved[key]);
  const permissions = rolePermissions[values.role];

  function set<K extends keyof Values>(key: K, value: Values[K]) { setValues((current) => ({ ...current, [key]: value })); setNotice(""); }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const found = validateUser(values);
    const first = Object.keys(found)[0];
    if (first) { document.getElementById(`user-${first}`)?.focus(); return; }
    if (!dirty) { setNotice("Không có thay đổi nào để lưu."); return; }
    setSaved(values);
    setNotice("Đã lưu thay đổi trong bản demo; dữ liệu chưa được gửi đến hệ thống.");
  }

  return <>
    <AdminPageHeader breadcrumbs={["Người dùng", "Chỉnh sửa người dùng"]} title="Chỉnh sửa người dùng"
      subtitle={`${user.id} · ${user.fullName}. Các trường có * là bắt buộc.`}
      actions={<>
        <Link href={`/admin/users/${user.id}`} className={`${secondaryButton} min-h-12`}>Hủy</Link>
        <button type="submit" form="user-edit-form" className={`${primaryLink} min-h-12 px-8`}>Lưu thay đổi</button>
      </>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="user-edit-form" noValidate onSubmit={submit} aria-labelledby="user-form-title" className={`${card} min-w-0 p-6`}>
        <h2 id="user-form-title" className="text-xl font-semibold">Thông tin tài khoản</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="user-fullName" label="Họ và tên" required autoComplete="name" value={values.fullName} error={errors.fullName} onChange={(e) => set("fullName", e.target.value)} />
          <TextField id="user-code" label="Mã tài khoản" value={user.id} disabled readOnly />
          <TextField id="user-email" label="Email" type="email" required autoComplete="email" value={values.email} error={errors.email} onChange={(e) => set("email", e.target.value)} />
          <TextField id="user-phone" label="Số điện thoại" type="tel" required autoComplete="tel" value={values.phone} error={errors.phone} onChange={(e) => set("phone", e.target.value)} />
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="user-role" className="text-sm font-medium">Vai trò<span aria-hidden="true"> *</span></label>
            <select id="user-role" required className={control} value={values.role} onChange={(e) => set("role", e.target.value as UserRole)}>
              <option value="customer">Customer</option><option value="staff">Staff</option>
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="user-status" className="text-sm font-medium">Trạng thái</label>
            <select id="user-status" className={control} value={values.status} onChange={(e) => set("status", e.target.value as UserStatus)}>
              <option value="Hoạt động">Hoạt động</option><option value="Đã khóa">Đã khóa</option>
            </select>
          </div>
          <div className="sm:col-span-2"><TextField id="user-address" label="Địa chỉ" autoComplete="street-address" value={values.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <label htmlFor="user-note" className="text-sm font-medium">Ghi chú nội bộ</label>
            <textarea id="user-note" className={textarea} value={values.note} onChange={(e) => set("note", e.target.value)} />
          </div>
        </div>
      </form>

      <aside className="min-w-0 space-y-6" aria-label="Thông tin bổ sung">
        <section aria-labelledby="role-scope" className={`${card} p-6`}>
          <h2 id="role-scope" className="text-xl font-semibold">Quyền theo vai trò</h2>
          <div className="mt-4"><Badge>{roleLabels[values.role]}</Badge></div>
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
