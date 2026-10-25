import { RolesMatrix } from "@/features/admin/components/roles-matrix";
import { adminAccountCount, countUsers } from "@/features/admin/mock/users";

export const metadata = { title: "Vai trò & phân quyền" };

export default function AdminRolesPage() {
  return <RolesMatrix counts={{ customer: countUsers("customer"), staff: countUsers("staff"), admin: adminAccountCount }} />;
}
