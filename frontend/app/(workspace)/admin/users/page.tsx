import Link from "next/link";
import { Suspense } from "react";
import { Plus, Star } from "lucide-react";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";
import { UsersList } from "@/features/admin/components/users-list";
import { DemoNotice } from "@/features/workspace/components/demo-notice";
import { InfoCallout, secondaryButton } from "@/features/workspace/components/workspace-ui";

export const metadata = { title: "Người dùng" };

export default function AdminUsersPage() {
  return <>
    <AdminPageHeader breadcrumbs={["Người dùng", "Người dùng"]} title="Người dùng" subtitle="Quản lý tài khoản khách hàng và nhân viên của cửa hàng."
      actions={<>
        <Link href="/admin/users/roles" className={`${secondaryButton} min-h-12`}>Vai trò &amp; phân quyền</Link>
        <DemoNotice variant="primary" label="Thêm người dùng" icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          message="Tạo tài khoản mới chưa có màn hình thiết kế và chưa kết nối backend." />
      </>} />
    <Suspense fallback={<p role="status">Đang tải danh sách người dùng…</p>}><UsersList /></Suspense>
    <InfoCallout icon={<Star className="h-5 w-5" strokeWidth={1.7} />} title="Quyền truy cập được kiểm soát">
      Chỉ Admin được phân quyền và khóa tài khoản. Mọi thay đổi đều được lưu trong nhật ký hệ thống.
    </InfoCallout>
  </>;
}
