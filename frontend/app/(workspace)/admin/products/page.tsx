import Link from "next/link";
import { Suspense } from "react";
import { ProductsList } from "@/features/admin/components/products-list";

export const metadata = { title: "Sản phẩm" };

// The header is part of the list, because "Xuất danh sách" exports the list's current filters.
export default function AdminProductsPage() {
  return <>
    <Suspense fallback={<p role="status">Đang tải danh sách sản phẩm…</p>}><ProductsList /></Suspense>
    <p className="text-xs text-muted">Giá hiển thị bằng VND, đã bao gồm thuế. Tồn kho được quản lý tại module <Link href="/admin/inventory" className="text-brand hover:underline">Kho hàng</Link>.</p>
  </>;
}
