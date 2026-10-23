import { AdminPageHeader } from "@/features/admin/components/admin-ui";

export const metadata = { title: "Tổng quan kinh doanh" };

export default function AdminDashboardPage() {
  return <AdminPageHeader breadcrumbs={["Tổng quan", "Tổng quan kinh doanh"]} title="Tổng quan kinh doanh" subtitle="Nội dung tổng quan sẽ được bổ sung ở bước tiếp theo." />;
}
