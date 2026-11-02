"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { QuickAddModal } from "./quick-add-modal";
import type { Product } from "../../../products";

export function ProductCard({ product }: { product: Product }) {
 const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
 const [isWishlisted, setIsWishlisted] = useState(false);

 const handleOpenQuickAdd = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsQuickAddOpen(true);
 };

 const handleToggleWishlist = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsWishlisted((prev) => !prev);
 };

 const rating = product.ratingAvg ?? 5.0;

 return (
  <>
   <article className="group relative flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-sm">
    {/* 1. Ảnh sản phẩm & Nút yêu thích */}
    <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-canvas">
     <Image
      src={product.image || "/images/products/royal-canin-mini-adult.png"}
      alt={product.name}
      fill
      sizes="(min-width: 1440px) 278px, (min-width: 1024px) calc((100vw - 168px) / 4), (min-width: 640px) calc((100vw - 104px) / 2), calc(100vw - 80px)"
      className="object-cover transition-transform duration-300 group-hover:scale-105"
     />

     {/* Nút yêu thích (Wishlist Heart) */}
     <button
      type="button"
      aria-label={isWishlisted ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      onClick={handleToggleWishlist}
      className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow-xs backdrop-blur-xs transition-colors hover:text-red-500"
     >
      <Heart
       className={`size-4 transition-colors ${
        isWishlisted ? "fill-red-500 text-red-500" : ""
       }`}
      />
     </button>
    </div>

    {/* 2. Thông tin thương hiệu */}
    <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
     <p className="font-bold uppercase tracking-[1px]  truncate text-blue-600">
      {product.brand || "Petjoy"}
     </p>
    </div>

    {/* 3. Tên sản phẩm */}
    <h3 className="text-sm font-semibold leading-snug text-ink line-clamp-2 min-h-10 group-hover:text-brand transition-colors">
     {product.name}
    </h3>

    {/* 4. Đánh giá & Số lượng đã bán */}
    <div className="flex items-center gap-1.5 shrink-0 text-slate-500 font-medium text-xs">
     <div className="flex items-center gap-0.5 text-ink font-normal">
      <Star className="size-3 fill-amber-400 text-amber-400" />
      <span>{rating.toFixed(1)}</span>
     </div>
     <span className="text-gray-300">·</span>
     <span className="text-muted font-normal">
      Đã bán {product.soldCount ?? 0}
     </span>
    </div>

    {/* 5. Giá */}
    <div className="mt-auto pt-1">
     <p className="text-base font-bold text-blue-600 sm:text-lg">
      {formatCurrency(product.price)}
     </p>
    </div>

    {/* 6. Nút "Thêm vào giỏ" */}
    <button
     type="button"
     onClick={handleOpenQuickAdd}
     aria-label={`Thêm ${product.name} vào giỏ hàng`}
     className="mt-1 flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-hover text-xs sm:text-sm font-semibold text-white shadow-xs transition-all active:scale-[0.98]"
    >
     <ShoppingCart className="size-4" />
     <span>Thêm vào giỏ</span>
    </button>
   </article>

   {/* Modal Popup chọn phân loại & số lượng */}
   <QuickAddModal
    product={product}
    isOpen={isQuickAddOpen}
    onClose={() => setIsQuickAddOpen(false)}
   />
  </>
 );
}
