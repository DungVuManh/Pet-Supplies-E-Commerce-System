import { Suspense } from "react";
import { ProductDetailView } from "@/features/admin/components/product-detail-view";
import { getProduct } from "@/features/admin/services/products.server";

type Params = PageProps<"/admin/products/[sku]">["params"];

// URL params are read below a Suspense boundary so navigating from the list stays instant.
async function ProductDetail({ params }: { params: Params }) {
  return <ProductDetailView product={await getProduct(decodeURIComponent((await params).sku))} />;
}

export default function AdminProductDetailPage({ params }: PageProps<"/admin/products/[sku]">) {
  return <Suspense fallback={<p role="status">Đang tải thông tin sản phẩm…</p>}><ProductDetail params={params} /></Suspense>;
}
