"use client";


import Link from "next/link";
import React from "react";
import { useCart } from "../cart-provider";

export function CartPreview() {
  const { quantity } = useCart();

  const displayCount = quantity > 0 ? quantity : 4;

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-2 py-1.5 px-3 rounded-xl border border-line bg-surface hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm"
      aria-label="Xem giỏ hàng"
    >
      {/* Icon giỏ hàng shopping bag */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>

      <span className="text-sm font-semibold text-ink">Giỏ hàng</span>

      {/* Badge số lượng */}
      <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
        {displayCount}
      </span>
    </Link>
  );
}
