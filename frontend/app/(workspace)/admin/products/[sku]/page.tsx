import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/features/admin/components/product-detail-view";
import { getProduct } from "@/features/admin/mock/products";

type Params = PageProps<"/admin/products/[sku]">["params"];

// URL params are read below a Suspense boundary so navigating from the list stays instant.
async function ProductDetail({ params }: { params: Params }) {
  const product = getProduct((await params).sku);
  if (!product) notFound();
  return <ProductDetailView product={product} />;
}

export default function AdminProductDetailPage({ params }: PageProps<"/admin/products/[sku]">) {
  return <Suspense fallback={<p role="status">Đang tải thông tin sản phẩm…</p>}><ProductDetail params={params} /></Suspense>;
}
