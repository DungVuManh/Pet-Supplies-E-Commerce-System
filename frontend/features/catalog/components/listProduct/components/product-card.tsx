"use client";

import Image from "next/image";
import { useCart } from "@/features/cart/cart-provider";
import { formatCurrency } from "@/lib/format-currency";
import type { Product } from "../../../products";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <article className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1440px) 278px, (min-width: 1024px) calc((100vw - 168px) / 4), (min-width: 640px) calc((100vw - 104px) / 2), calc(100vw - 80px)"
          className="object-cover"
        />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[1px] text-muted">{product.brand}</p>
      <h3 className="text-[15px] font-semibold leading-[normal]">{product.name}</h3>
      {/* <p className="text-xs text-muted">{product.description}</p> */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="text-lg font-semibold">{formatCurrency(product.price)}</p>
        {/* <button
          type="button"
          aria-label={`Thêm ${product.name} vào giỏ hàng`}
          onClick={() => addItem(product)}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-subtle transition-colors hover:bg-line md:size-8"
        >
          <Image src="/icons/plus.svg" width={16} height={16} alt="" />
        </button> */}
      </div>
    </article>
  );
}
