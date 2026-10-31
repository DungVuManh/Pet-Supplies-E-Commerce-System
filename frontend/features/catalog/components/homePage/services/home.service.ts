// =============================================================
// features/catalog/components/homePage/services/home.service.ts
// Service gọi API lấy danh sách sản phẩm hiển thị trên Trang Chủ
// =============================================================

import type { Product } from "@/features/catalog/products";
import type { GetProductsResponse } from "@/features/catalog/components/listProduct/types";

export type FetchHomeProductsParams = {
  query?: string;
  category?: string;
  activeTab?: string;
  limit?: number;
};

/**
 * Gọi API backend lấy danh sách sản phẩm nổi bật theo từ khoá, loài (chó/mèo) hoặc tab lọc
 */
export async function fetchHomeProductsApi(
  params: FetchHomeProductsParams,
  signal?: AbortSignal
): Promise<Product[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(params.limit ?? 8));
  searchParams.set("page", "1");

  if (params.query?.trim()) {
    searchParams.set("search", params.query.trim());
  }

  // Lọc theo loài thú cưng (petType: dog hoặc cat)
  const effectivePetType =
    params.category === "dog" || params.activeTab === "dog"
      ? "dog"
      : params.category === "cat" || params.activeTab === "cat"
        ? "cat"
        : undefined;

  if (effectivePetType) {
    searchParams.set("petType", effectivePetType);
  }

  // Lọc theo danh mục phụ nếu không phải loài
  if (params.category && params.category !== "dog" && params.category !== "cat") {
    searchParams.set("category", params.category);
  }

  if (params.activeTab === "new") {
    searchParams.set("sort", "default");
  }

  const res = await fetch(`/api/v1/catalog/products?${searchParams.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data: GetProductsResponse = await res.json();

  if (data?.success && Array.isArray(data.data?.products)) {
    return data.data.products.map((p) => ({
      id: p._id,
      name: p.name,
      brand: p.brand || "Petjoy",
      description: p.description || "",
      price: p.price,
      image:
        p.image ||
        p.images?.[0] ||
        "/images/products/royal-canin-mini-adult.png",
      categories: [],
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      soldCount: p.soldCount || 0,
      variants: p.variants?.map((v) => ({
        sku: v.sku,
        label: v.label,
        price: v.price,
        stock: v.stock,
      })),
    }));
  }

  return [];
}
