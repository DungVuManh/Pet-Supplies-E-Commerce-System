import { Suspense } from "react";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";
import { CategoriesList } from "@/features/admin/components/categories-list";
import { DemoNotice } from "@/components/workspace/demo-notice";

export const metadata = { title: "Danh mục sản phẩm" };

export default function AdminCategoriesPage() {
  return <>
    <AdminPageHeader breadcrumbs={["Danh mục", "Danh mục sản phẩm"]} title="Danh mục sản phẩm" subtitle="Tổ chức sản phẩm theo cây danh mục cha – con."
      actions={<DemoNotice variant="primary" label="Thêm danh mục" icon={<Plus className="h-4 w-4" aria-hidden="true" />}
        message="Tạo danh mục mới chưa có màn hình thiết kế và chưa kết nối backend." />} />
    <Suspense fallback={<p role="status">Đang tải cây danh mục…</p>}><CategoriesList /></Suspense>
  </>;
}
