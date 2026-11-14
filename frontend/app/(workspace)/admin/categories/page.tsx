import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";
import { CategoriesList } from "@/features/admin/components/categories-list";
import { primaryLink } from "@/components/workspace/workspace-ui";

export const metadata = { title: "Danh mục sản phẩm" };

export default function AdminCategoriesPage() {
  return <>
    <AdminPageHeader breadcrumbs={["Danh mục", "Danh mục sản phẩm"]} title="Danh mục sản phẩm" subtitle="Tổ chức sản phẩm theo danh mục."
      actions={<Link href="/admin/categories/new" className={`${primaryLink} min-h-12 gap-2`}><Plus className="h-4 w-4" aria-hidden="true" />Thêm danh mục</Link>} />
    <Suspense fallback={<p role="status">Đang tải danh mục…</p>}><CategoriesList /></Suspense>
  </>;
}
