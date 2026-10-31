"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Check, Star } from "lucide-react";
import { useCart } from "@/features/cart/cart-provider";
import { formatCurrency } from "@/lib/format-currency";
import type { Product } from "../../../products";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!addItem) return;

    try {
      await addItem({
        id: product.id,
        variants: product.variants?.map((v) => ({ sku: v.sku })),
      });
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1500);
    } catch (err) {
      console.error("Lỗi khi thêm giỏ hàng:", err);
    }
  };

  const rating = product.ratingAvg ?? 5.0;

  return (
    <article className="group relative flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand/40 hover:bg-surface">
      {/* 1. Ảnh sản phẩm */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-canvas">
        <Image
          src={product.image || "/images/products/royal-canin-mini-adult.png"}
          alt={product.name}
          fill
          sizes="(min-width: 1440px) 278px, (min-width: 1024px) calc((100vw - 168px) / 4), (min-width: 640px) calc((100vw - 104px) / 2), calc(100vw - 80px)"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Badge cam kết chính hãng */}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-surface/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand backdrop-blur-xs border border-line">
          Chính hãng
        </span>
      </div>

      {/* 2. Thông tin thương hiệu & Rating & Đã bán */}
      <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
        <p className="font-semibold uppercase tracking-[1px] text-muted truncate">
          {product.brand || "Petjoy"}
        </p>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-500 font-medium">
          <div className="flex items-center gap-0.5 text-amber-500">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
          <span className="text-gray-300">·</span>
          <span className="text-muted font-normal">Đã bán {product.soldCount ?? 0}</span>
        </div>
      </div>

      {/* 3. Tên sản phẩm */}
      <h3 className="text-sm font-semibold leading-snug text-ink line-clamp-2 min-h-10 group-hover:text-brand transition-colors">
        {product.name}
      </h3>

      {/* 4. Giá */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <div>
          <p className="text-base font-bold text-ink sm:text-lg">
            {formatCurrency(product.price)}
          </p>
        </div>

        {/* <button
          type="button"
          aria-label={`Thêm ${product.name} vào giỏ hàng`}
          onClick={handleAddToCart}
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-all ${
            isAdded
              ? "bg-emerald-600 text-white"
              : "bg-brand-subtle text-brand hover:bg-brand hover:text-white"
          }`}
        >
          {isAdded ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
        </button> */}
      </div>
    </article>
  );
}
