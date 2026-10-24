"use client";

// =============================================================
// features/orders/components/orders-search-bar.tsx
// Ô tìm kiếm đơn hàng theo mã đơn hoặc tên sản phẩm
// =============================================================

import React from "react";

type OrdersSearchBarProps = {
  value: string;
  onChange: (val: string) => void;
};

export function OrdersSearchBar({ value, onChange }: OrdersSearchBarProps) {
  return (
    <div className="relative w-full my-5">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tìm theo mã đơn hàng hoặc tên sản phẩm"
        className="w-full rounded-xl border border-line bg-surface pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      />
    </div>
  );
}
