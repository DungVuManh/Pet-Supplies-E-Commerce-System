// =============================================================
// features/wishlist/components/wishlist-empty.tsx
// Trạng thái trống: Khi chưa có sản phẩm yêu thích hoặc tìm kiếm không thấy
// =============================================================

"use client";

import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import React from "react";

interface WishlistEmptyProps {
  isSearchEmpty?: boolean;
  onResetSearch?: () => void;
}

export function WishlistEmpty({ isSearchEmpty = false, onResetSearch }: WishlistEmptyProps) {
  if (isSearchEmpty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
          <Heart className="size-6 text-slate-400" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Không tìm thấy sản phẩm phù hợp
        </h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Vui lòng thử lại với tên sản phẩm hoặc từ khóa thương hiệu khác.
        </p>
        {onResetSearch && (
          <button
            type="button"
            onClick={onResetSearch}
            className="mt-4 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
          >
            Xóa tìm kiếm
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 px-4 text-center shadow-xs">
      {/* Icon trái tim lớn */}
      <div className="relative mb-5 flex size-20 items-center justify-center rounded-full bg-blue-50/80 border border-blue-100">
        <Heart className="size-10 text-blue-500 fill-blue-100/50" />
        <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-amber-400 text-white shadow-xs">
          <Sparkles className="size-3.5" />
        </span>
      </div>

      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
        Danh sách yêu thích của bạn đang trống
      </h2>
      <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
        Hãy duyệt qua hàng ngàn sản phẩm chất lượng dành cho thú cưng và nhấn vào nút <strong>Lưu</strong> để thêm vào danh sách này nhé!
      </p>

      {/* Nút hành động dẫn về trang danh sách sản phẩm */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/listProduct/allProducts"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
        >
          <span>Khám phá sản phẩm ngay</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

