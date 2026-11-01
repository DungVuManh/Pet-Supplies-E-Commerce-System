// =============================================================
// features/wishlist/components/wishlist-toolbar.tsx
// Thanh công cụ: Tìm kiếm, Bộ lọc sắp xếp & Nút Xóa tất cả
// =============================================================

"use client";

import { ArrowUpDown, Search, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import type { WishlistSortOption } from "../types";

interface WishlistToolbarProps {
  totalCount: number;
  searchQuery: string;
  sortBy: WishlistSortOption;
  onSearchChange: (value: string) => void;
  onSortChange: (value: WishlistSortOption) => void;
  onClearAll: () => void;
}

export function WishlistToolbar({
  totalCount,
  searchQuery,
  sortBy,
  onSearchChange,
  onSortChange,
  onClearAll,
}: WishlistToolbarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
      {/* 1. Ô tìm kiếm sản phẩm trong wishlist */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm sản phẩm theo tên, thương hiệu..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* 2. Phần Sắp xếp & Nút Xóa tất cả */}
      <div className="flex items-center gap-2.5 self-end sm:self-auto">
        {/* Dropdown sắp xếp */}
        <div className="relative flex items-center">
          <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as WishlistSortOption)}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-7 text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer transition-colors"
          >
            <option value="latest">Mới nhất</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
          </select>
        </div>

        {/* Nút Xóa tất cả */}
        {totalCount > 0 && (
          <div className="relative">
            {!showConfirm ? (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-100/70 hover:text-rose-700 transition-colors cursor-pointer"
                title="Xóa toàn bộ sản phẩm yêu thích"
              >
                <Trash2 className="size-3.5" />
                <span>Xóa tất cả</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-2 py-1 shadow-sm">
                <span className="text-xs font-medium text-rose-600">Chắc chắn xóa?</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    onClearAll();
                  }}
                  className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

