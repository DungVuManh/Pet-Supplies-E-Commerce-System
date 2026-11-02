import { Suspense } from "react";
import { RolesMatrix } from "@/features/admin/components/roles-matrix";
import { getPermissions } from "@/features/admin/services/permissions.server";

export const metadata = { title: "Vai trò & phân quyền" };

async function Roles() {
  return <RolesMatrix matrix={await getPermissions()} />;
}

export default function AdminRolesPage() {
  return <Suspense fallback={<p role="status">Đang tải phân quyền…</p>}><Roles /></Suspense>;
}
