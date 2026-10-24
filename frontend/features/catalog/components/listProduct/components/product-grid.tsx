"use client";

// =============================================================
// features/catalog/components/listProduct/components/product-grid.tsx
// UI component: Lưới hiển thị danh sách sản phẩm hoặc trạng thái skeleton/empty/error
// =============================================================

import React from "react";
import Link from "next/link";
import { ProductCard } from "../../product-card";
import type { CatalogProduct } from "../types";

type ProductGridProps = {
  products: CatalogProduct[];
  loadingProducts: boolean;
  error: string | null;
};

export function ProductGrid({
  products,
  loadingProducts,
  error,
}: ProductGridProps) {
  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-4 text-red-700 text-sm">
        ⚠️ {error}
      </div>
    );
  }

  if (loadingProducts) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-gray-100 animate-pulse border border-line"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg font-medium">Không tìm thấy sản phẩm nào</p>
        <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <Link href={`/listProduct/detailProduct?id=${product._id}`} key={product._id}>
          <ProductCard
            product={{
              id: product._id,
              brand: product.brand,
              name: product.name,
              description: product.description,
              price: product.price,
              image: product.image,
              categories: [],
            }}
          />
        </Link>
      ))}
    </div>
  );
}
