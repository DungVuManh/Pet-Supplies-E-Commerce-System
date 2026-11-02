// =============================================================
// features/wishlist/components/wishlist-header.tsx
// Header màn hình Danh sách yêu thích: Breadcrumb, Tiêu đề & Badge số lượng
// =============================================================

"use client";

import Link from "next/link";
import { ChevronRight, Heart } from "lucide-react";
import React from "react";

interface WishlistHeaderProps {
  totalCount: number;
}

export function WishlistHeader({ totalCount }: WishlistHeaderProps) {
  return (
    <div className="mb-6">
      {/* 1. Breadcrumb điều hướng */}
      <nav aria-label="Đường dẫn" className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="size-3.5 text-slate-400" />
        <span className="font-medium text-slate-800">Danh sách yêu thích</span>
      </nav>

      {/* 2. Tiêu đề chính + Badge số lượng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80">
            <Heart className="size-5 fill-rose-500 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Danh sách yêu thích
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/60">
                {totalCount} sản phẩm
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Lưu giữ các sản phẩm bạn quan tâm để dễ dàng theo dõi và mua sắm sau này.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

