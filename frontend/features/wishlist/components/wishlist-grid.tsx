// =============================================================
// features/wishlist/components/wishlist-grid.tsx
// Lưới hiển thị danh sách sản phẩm yêu thích sử dụng component ProductCard chuẩn của catalog
// =============================================================

"use client";

import React from "react";
import Link from "next/link";
import { ProductCard } from "@/features/catalog/components/listProduct/components/product-card";
import type { WishlistProduct } from "../types";

interface WishlistGridProps {
 products: WishlistProduct[];
 onRemove?: (productId: string) => void;
}

export function WishlistGrid({ products }: WishlistGridProps) {
 return (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:gap-5">
   {products.map((product) => {
    const productId = String(product.id || product._id || "");
    return (
     <Link
      key={productId}
      href={`/listProduct/detailProduct?id=${productId}`}
      className="block h-full"
     >
      <ProductCard
       product={{
        id: productId,
        brand: product.brand || "Petjoy",
        name: product.name,
        description: product.description || "",
        price: product.price,
        image: product.image || product.images?.[0] || "",
        images: product.images || [],
        categories: [],
        soldCount: product.soldCount,
        ratingAvg: product.ratingAvg,
        inStock: product.inStock,
       }}
      />
     </Link>
    );
   })}
  </div>
 );
}
