"use client";

import { useState, type FormEvent } from "react";
import { Check, Star } from "lucide-react";
import { InfoCallout, card, primaryLink } from "@/components/workspace/workspace-ui";
import { defaultPermissions, togglePermission, type PermissionRole } from "../mock/permissions";
import { AdminPageHeader } from "./admin-ui";

export function RolesMatrix({ counts }: { counts: Record<PermissionRole, number> }) {
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [saved, setSaved] = useState(defaultPermissions);
  const [notice, setNotice] = useState("");
  const columns: { role: PermissionRole; label: string }[] = [
    { role: "customer", label: `Customer · ${counts.customer}` }, { role: "staff", label: `Staff · ${counts.staff}` }, { role: "admin", label: `Admin · ${counts.admin}` },
  ];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (permissions === saved) { setNotice("Không có thay đổi nào để lưu."); return; }
    setSaved(permissions);
    setNotice("Đã lưu phân quyền trong bản demo; quyền thực tế vẫn do backend kiểm soát.");
  }

  return <>
    <AdminPageHeader breadcrumbs={["Người dùng", "Vai trò & phân quyền"]} title="Vai trò & phân quyền" subtitle="Thiết lập phạm vi truy cập rõ ràng cho từng vai trò."
      actions={<button type="submit" form="roles-form" className={`${primaryLink} min-h-12 px-8`}>Lưu phân quyền</button>} />
    {notice && <p role="status" className="rounded-lg bg-brand-subtle px-4 py-3 text-sm text-brand">{notice}</p>}
    <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Nguyên tắc phân quyền">
      Quyền được áp dụng theo vai trò. Customer chỉ thao tác trên dữ liệu của mình; Admin luôn giữ quyền quản trị hệ thống.
    </InfoCallout>

    <form id="roles-form" onSubmit={submit} className={`${card} min-w-0 p-6`} aria-labelledby="matrix-title">
      <h2 id="matrix-title" className="text-xl font-semibold">Ma trận quyền truy cập</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">Quyền truy cập theo chức năng và vai trò</caption>
        <thead><tr><th scope="col" className="py-4 font-semibold">Chức năng</th>{columns.map((c) => <th key={c.role} scope="col" className="w-48 py-4 text-center font-semibold">{c.label}</th>)}</tr></thead>
        <tbody>{permissions.map((permission) => <tr key={permission.id} className="border-b border-line">
          <th scope="row" className="py-3 font-normal">{permission.label}</th>
          {columns.map(({ role }) => <td key={role} className="py-3 text-center">
            {role === "admin"
              // Admin access is fixed, so it is shown as a state rather than a disabled (greyed-out) control.
              ? <span role="img" aria-label={`${permission.label} – Admin luôn có quyền`} className="inline-flex size-6 items-center justify-center rounded bg-brand text-white"><Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /></span>
              : <input type="checkbox" className="size-6 accent-brand" checked={permission.roles[role]}
                aria-label={`${permission.label} – ${role === "staff" ? "Staff" : "Customer"}`}
                onChange={() => { setPermissions((current) => togglePermission(current, permission.id, role)); setNotice(""); }} />}
          </td>)}
        </tr>)}</tbody>
      </table></div>
      <p className="mt-4 flex items-center gap-1 text-xs text-muted"><Check className="h-3 w-3" aria-hidden="true" />Có quyền truy cập · Ô trống: không được phép · Admin luôn giữ toàn quyền</p>
    </form>
  </>;
}
