import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";
import { ProductsList } from "@/features/admin/components/products-list";
import { DemoNotice } from "@/components/workspace/demo-notice";
import { primaryLink } from "@/components/workspace/workspace-ui";

export const metadata = { title: "Sản phẩm" };

export default function AdminProductsPage() {
  return <>
    <AdminPageHeader breadcrumbs={["Sản phẩm", "Sản phẩm"]} title="Sản phẩm" subtitle="Quản lý sản phẩm, giá bán và tình trạng hiển thị."
      actions={<>
        <DemoNotice label="Xuất danh sách" message="Xuất danh sách sản phẩm chưa kết nối backend; bản demo không tạo tệp." />
        <Link href="/admin/products/new" className={`${primaryLink} min-h-12 gap-2`}><Plus className="h-4 w-4" aria-hidden="true" />Thêm sản phẩm</Link>
      </>} />
    <Suspense fallback={<p role="status">Đang tải danh sách sản phẩm…</p>}><ProductsList /></Suspense>
    <p className="text-xs text-muted">Giá hiển thị bằng VND, đã bao gồm thuế. Tồn kho được quản lý tại module <Link href="/admin/inventory" className="text-brand hover:underline">Kho hàng</Link>.</p>
  </>;
}
