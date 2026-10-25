import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductEditForm } from "@/features/admin/components/product-edit-form";
import { getProduct } from "@/features/admin/mock/products";

type Params = PageProps<"/admin/products/[sku]/edit">["params"];

async function EditProduct({ params }: { params: Params }) {
  const product = getProduct((await params).sku);
  if (!product) notFound();
  return <ProductEditForm product={product} />;
}

export default function AdminProductEditPage({ params }: PageProps<"/admin/products/[sku]/edit">) {
  return <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}><EditProduct params={params} /></Suspense>;
}
