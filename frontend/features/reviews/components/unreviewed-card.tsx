// =============================================================
// features/reviews/components/unreviewed-card.tsx
// Thẻ hiển thị sản phẩm đã mua chưa được đánh giá
// Kèm hạn 30 ngày (REVIEW_WINDOW_DAYS) và nút "Đánh giá ngay"
// =============================================================

"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Edit3, ShoppingBag } from "lucide-react";
import React, { useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
import type { UnreviewedProduct } from "../types";

interface UnreviewedCardProps {
  item: UnreviewedProduct;
  onReviewClick: (item: UnreviewedProduct) => void;
}

export function UnreviewedCard({ item, onReviewClick }: UnreviewedCardProps) {
  const [imageError, setImageError] = useState(false);

  // Link đến trang chi tiết sản phẩm nếu có
  const detailUrl = item.productSlug
    ? `/listProduct/detailProduct?id=${encodeURIComponent(item.productId)}`
    : `/listProduct/detailProduct?id=${encodeURIComponent(item.productId)}`;

  // Format ngày hoàn tất đơn hàng
  const completedDateStr = item.completedAt
    ? new Date(item.completedAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* Cột trái: Ảnh và thông tin sản phẩm */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Ảnh sản phẩm */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-canvas">
          {item.productImage && !imageError ? (
            <Image
              src={item.productImage}
              alt={item.productName}
              fill
              sizes="80px"
              className="object-contain p-1.5"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              📦
            </div>
          )}
        </div>

        {/* Chi tiết sản phẩm & đơn hàng */}
        <div className="min-w-0 flex-1">
          <Link
            href={detailUrl}
            className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand transition-colors"
          >
            {item.productName}
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {item.variantSku && (
              <span className="font-mono">SKU: {item.variantSku}</span>
            )}
            {item.price !== undefined && item.price > 0 && (
              <span className="font-semibold text-ink">
                {formatCurrency(item.price)}
              </span>
            )}
          </div>

          {/* Thông tin đơn hàng & hạn đánh giá 30 ngày */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 text-xs text-muted border border-line">
              <ShoppingBag className="size-3" />
              Đơn: {item.orderCode}
            </span>

            {completedDateStr && (
              <span className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 text-xs text-muted border border-line">
                <Calendar className="size-3" />
                Mua ngày: {completedDateStr}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border ${
                item.daysRemaining <= 5
                  ? "bg-rose-50 text-rose-700 border-rose-200 font-semibold"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <Clock className="size-3" />
              Còn {item.daysRemaining} ngày để đánh giá
            </span>
          </div>
        </div>
      </div>

      {/* Cột phải: Nút Đánh giá ngay */}
      <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
        <button
          type="button"
          onClick={() => onReviewClick(item)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand/90 active:scale-98 cursor-pointer"
        >
          <Edit3 className="size-4" />
          <span>Đánh giá ngay</span>
        </button>
      </div>
    </div>
  );
}

