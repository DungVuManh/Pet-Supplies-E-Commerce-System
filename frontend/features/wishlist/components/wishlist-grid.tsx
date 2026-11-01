// =============================================================
// features/wishlist/components/wishlist-grid.tsx
// Lưới hiển thị danh sách sản phẩm yêu thích (Responsive Grid)
// =============================================================

"use client";

import React from "react";
import type { WishlistProduct } from "../types";
import { WishlistCard } from "./wishlist-card";

interface WishlistGridProps {
  products: WishlistProduct[];
  onRemove: (productId: string) => void;
}

export function WishlistGrid({ products, onRemove }: WishlistGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-5">
      {products.map((product) => (
        <WishlistCard
          key={product.id || product._id}
          product={product}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

