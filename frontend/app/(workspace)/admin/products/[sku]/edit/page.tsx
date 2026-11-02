import { Suspense } from "react";
import { ProductEditForm } from "@/features/admin/components/product-edit-form";
import { getProduct } from "@/features/admin/services/products.server";

type Params = PageProps<"/admin/products/[sku]/edit">["params"];

async function EditProduct({ params }: { params: Params }) {
  return <ProductEditForm product={await getProduct(decodeURIComponent((await params).sku))} />;
}

export default function AdminProductEditPage({ params }: PageProps<"/admin/products/[sku]/edit">) {
  return <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}><EditProduct params={params} /></Suspense>;
}
