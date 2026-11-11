import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";
import { BrandsList } from "@/features/admin/components/brands-list";
import { primaryLink } from "@/components/workspace/workspace-ui";

export const metadata = { title: "Thương hiệu" };

export default function AdminBrandsPage() {
  return <>
    <AdminPageHeader breadcrumbs={["Thương hiệu", "Thương hiệu"]} title="Thương hiệu" subtitle="Quản lý thương hiệu dùng cho sản phẩm."
      actions={<Link href="/admin/brands/new" className={`${primaryLink} min-h-12 gap-2`}><Plus className="h-4 w-4" aria-hidden="true" />Thêm thương hiệu</Link>} />
    <Suspense fallback={<p role="status">Đang tải thương hiệu…</p>}><BrandsList /></Suspense>
  </>;
}
