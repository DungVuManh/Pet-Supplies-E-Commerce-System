import { Check, Star } from "lucide-react";
import { InfoCallout, card } from "@/components/workspace/workspace-ui";
import type { PermissionMatrix, PermissionRole } from "../types";
import { AdminPageHeader } from "./admin-ui";

const roleNames: Record<PermissionRole, string> = { customer: "Customer", staff: "Staff", admin: "Admin" };
const roles: PermissionRole[] = ["customer", "staff", "admin"];

export function RolesMatrix({ matrix }: { matrix: PermissionMatrix }) {
  return <>
    <AdminPageHeader breadcrumbs={["Người dùng", "Vai trò & phân quyền"]} title="Vai trò & phân quyền" subtitle="Phạm vi truy cập của từng vai trò trong hệ thống." />
    <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Quyền do hệ thống cố định">
      Trong phiên bản này, quyền của mỗi vai trò được cố định trong hệ thống và không thể thay đổi tại đây. Để đổi quyền của một người, hãy đổi vai trò của họ trong trang chỉnh sửa người dùng.
    </InfoCallout>

    <section className={`${card} min-w-0 p-6`} aria-labelledby="matrix-title">
      <h2 id="matrix-title" className="text-xl font-semibold">Ma trận quyền truy cập</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">Quyền truy cập theo chức năng và vai trò</caption>
        <thead><tr>
          <th scope="col" className="py-4 font-semibold">Chức năng</th>
          {roles.map((role) => <th key={role} scope="col" className="w-48 py-4 text-center font-semibold">{roleNames[role]} · {matrix.counts[role].toLocaleString("vi-VN")}</th>)}
        </tr></thead>
        <tbody>{matrix.items.map((permission) => <tr key={permission.id} className="border-b border-line">
          <th scope="row" className="py-3 font-normal">{permission.label}</th>
          {roles.map((role) => <td key={role} className="py-3 text-center">
            {permission.roles[role]
              ? <span role="img" aria-label={`${roleNames[role]}: được phép`} className="inline-flex size-6 items-center justify-center rounded bg-brand text-white"><Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /></span>
              : <span role="img" aria-label={`${roleNames[role]}: không được phép`} className="inline-block size-6 rounded border border-line" />}
          </td>)}
        </tr>)}</tbody>
      </table></div>
      <p className="mt-4 flex items-center gap-1 text-xs text-muted"><Check className="h-3 w-3" aria-hidden="true" />Có quyền truy cập · Ô trống: không được phép</p>
    </section>
  </>;
}
