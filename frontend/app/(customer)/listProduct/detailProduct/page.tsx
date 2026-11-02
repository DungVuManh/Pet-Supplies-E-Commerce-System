import DetailProduct from "@/features/catalog/components/cardDetailProduct/detailProduct";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Product } from "@/features/catalog/products";
import { getProductDetailApi } from "@/features/catalog/components/listProduct/services/catalog.service";

export const metadata: Metadata = { title: "Chi tiết sản phẩm | Petjoy" };

async function DetailProductsContent({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let product: Product | null = null;
  let errorMessage: string | null = null;

  if (id) {
    try {
      const result = await getProductDetailApi(id);
      if (result?.data?.product) {
        const p = result.data.product;
        product = {
          id: p._id,
          name: p.name,
          brand: p.brand,
          description: p.description,
          price: p.price,
          image: p.image,
          images: p.images,
          categories: [],
          variants: p.variants?.map((v) => ({
            sku: v.sku,
            label: v.label,
            price: v.price,
            stock: v.stock,
            availableStock: v.stock,
          })),
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
          inStock: p.inStock,
          soldCount: p.soldCount || 0,
        };
      } else {
        errorMessage = "Không tìm thấy thông tin sản phẩm.";
      }
    } catch {
      errorMessage = "Không thể tải chi tiết sản phẩm từ hệ thống. Vui lòng thử lại sau.";
    }
  } else {
    errorMessage = "Vui lòng chọn một sản phẩm từ danh mục để xem chi tiết.";
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-6 outline-none xl:px-16"
    >
      {product ? (
        <div className="flex flex-col gap-4">
          <DetailProduct product={product} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-ink">{errorMessage}</p>
          <Link
            href="/listProduct/allProducts"
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Quay lại danh sách sản phẩm
          </Link>
        </div>
      )}
    </main>
  );
}

export default function DetailProducts({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1440px] px-6 py-12">
          <div className="h-96 animate-pulse rounded-2xl bg-canvas" />
        </div>
      }
    >
      <DetailProductsContent searchParams={searchParams} />
    </Suspense>
  );
}
