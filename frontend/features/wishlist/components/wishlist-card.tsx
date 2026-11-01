// =============================================================
// features/wishlist/components/wishlist-card.tsx
// Thẻ sản phẩm trong Danh sách yêu thích
// Hỗ trợ nút bỏ yêu thích (trái tim đỏ có animation nảy & mờ dần),
// Thêm nhanh vào giỏ hàng và chuyển hướng tới chi tiết sản phẩm
// =============================================================

"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Heart, ShoppingBag, Star } from "lucide-react";
import React, { useState } from "react";
import { useCart } from "@/features/cart/cart-provider";
import { formatCurrency } from "@/lib/format-currency";
import type { WishlistProduct } from "../types";

interface WishlistCardProps {
  product: WishlistProduct;
  onRemove: (productId: string) => void;
}

export function WishlistCard({ product, onRemove }: WishlistCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const productId = product.id || product._id;
  const productDetailUrl = `/listProduct/detailProduct?id=${encodeURIComponent(productId)}`;

  // Thao tác bỏ yêu thích có animation mượt
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Kích hoạt animation mờ dần và thu nhỏ
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(productId);
    }, 250);
  };

  // Thêm sản phẩm vào giỏ hàng
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!addItem || isAdding || product.inStock === false) return;

    try {
      setIsAdding(true);
      await addItem({
        id: productId,
        variants: product.sku ? [{ sku: product.sku }] : undefined,
      });

      setTimeout(() => {
        setIsAdding(false);
      }, 1500);
    } catch (err) {
      console.error("Lỗi thêm vào giỏ:", err);
      setIsAdding(false);
    }
  };

  const rating = product.ratingAvg ?? 5.0;

  return (
    <article
      className={`group relative flex h-full flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all duration-300 hover:border-blue-500/50 hover:shadow-md sm:p-4 ${
        isRemoving ? "scale-95 opacity-0 transition-all duration-300 pointer-events-none" : "scale-100 opacity-100"
      }`}
    >
      <div>
        {/* 1. Ảnh sản phẩm + Nút Trái tim bỏ yêu thích + Badge */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
          <Link href={productDetailUrl} className="block h-full w-full">
            <Image
              src={product.image || "/images/products/royal-canin-mini-adult.png"}
              alt={product.name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Badge thương hiệu chính hãng */}
          <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 shadow-xs backdrop-blur-xs border border-blue-100">
            Chính hãng
          </span>

          {/* Nút Trái tim bỏ yêu thích (Góc phải trên) */}
          <button
            type="button"
            onClick={handleRemoveClick}
            aria-label={`Bỏ yêu thích ${product.name}`}
            className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-white/95 text-rose-500 shadow-sm border border-slate-200/60 hover:bg-rose-50 hover:scale-110 active:scale-90 transition-transform cursor-pointer"
            title="Bỏ khỏi danh sách yêu thích"
          >
            <Heart className="size-4 fill-rose-500 text-rose-500" />
          </button>
        </div>

        {/* 2. Thông tin Thương hiệu, Đánh giá & Số lượng đã bán */}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-400 truncate">
            {product.brand || "Petjoy"}
          </span>
          <div className="flex items-center gap-1 text-slate-500 shrink-0">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="font-bold text-slate-700">{rating.toFixed(1)}</span>
            {product.soldCount !== undefined && product.soldCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400">Đã bán {product.soldCount}</span>
              </>
            )}
          </div>
        </div>

        {/* 3. Tên sản phẩm */}
        <Link href={productDetailUrl} className="mt-1.5 block">
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>
      </div>

      {/* 4. Khối chân thẻ: Giá tiền & Nút Thêm vào giỏ */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <p className="text-base font-extrabold text-blue-600 sm:text-lg">
            {formatCurrency(product.price)}
          </p>
          {product.inStock === false && (
            <span className="text-[11px] font-semibold text-rose-500">Tạm hết hàng</span>
          )}
        </div>

        {/* Nút Thêm giỏ hàng */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.inStock === false || isAdding}
          aria-label={`Thêm ${product.name} vào giỏ hàng`}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
            isAdding
              ? "bg-emerald-600 text-white"
              : product.inStock === false
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
          }`}
        >
          {isAdding ? (
            <>
              <Check className="size-3.5" />
              <span>Đã thêm</span>
            </>
          ) : (
            <>
              <ShoppingBag className="size-3.5" />
              <span>Thêm giỏ</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

