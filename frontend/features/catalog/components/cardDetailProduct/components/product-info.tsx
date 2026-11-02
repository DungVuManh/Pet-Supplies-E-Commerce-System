"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-info.tsx
// Component hiển thị thông tin cơ bản: Tên sản phẩm, Đánh giá sao, Đã bán, Giá & Mô tả
// Cấu trúc chuẩn theo thiết kế: Tên sản phẩm -> Rating (5 sao, điểm, số đánh giá) | Đã bán
// =============================================================

import React from "react";
import { Star } from "lucide-react";

type ProductInfoProps = {
  brand?: string;
  name: string;
  price: number;
  description?: string;
  ratingAvg: number;
  ratingCount: number;
  soldCount?: number;
};

function formatRatingCount(count: number): string {
  if (!count) return "0 đánh giá";
  if (count >= 1000) {
    const k = (count / 1000).toFixed(count % 1000 === 0 ? 0 : 1);
    return `${k}k đánh giá`;
  }
  return `${count} đánh giá`;
}

function formatSoldCount(count: number): string {
  if (!count) return "0";
  if (count >= 1000) {
    const k = (count / 1000).toFixed(count % 1000 === 0 ? 0 : 1);
    return `${k}k+`;
  }
  return count.toLocaleString("vi-VN");
}

export function ProductInfo({
  brand,
  name,
  price,
  description,
  ratingAvg = 0,
  ratingCount = 0,
  soldCount = 0,
}: ProductInfoProps) {
  const effectiveRating = ratingAvg > 0 ? ratingAvg : 0;

  return (
    <div>
      {/* Thương hiệu (nếu có) */}
      {brand && (
        <div className="mb-2">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-500">
            {brand}
          </span>
        </div>
      )}

      {/* 1. Tên sản phẩm ở trên cùng */}
      <h1 className="text-2xl sm:text-[26px] font-bold text-[#1e293b] leading-tight break-words">
        {name}
      </h1>

      {/* 2. Hàng đánh giá & số lượng đã bán ngay bên dưới: ⭐⭐⭐⭐⭐ 5.0 (4k đánh giá) | Đã bán 166k+ */}
      <div className="mt-2.5 flex items-center flex-wrap gap-2 text-sm text-slate-600">
        {/* 5 ngôi sao */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`size-4 ${ratingCount > 0 && i < Math.round(effectiveRating)
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200"
                }`}
            />
          ))}
        </div>

        {/* Điểm đánh giá & số lượt đánh giá */}
        {ratingCount > 0 ? (
          <>
            <span className="font-bold text-gray-900 ml-0.5">
              {effectiveRating.toFixed(1)}
            </span>
            <span className="text-gray-500">({formatRatingCount(ratingCount)})</span>
          </>
        ) : (
          <span className="text-slate-400 text-xs sm:text-sm">Chưa có đánh giá</span>
        )}

        {/* Dấu gạch đứng ngăn cách */}
        <span className="text-gray-300 mx-1">|</span>

        {/* Số lượng đã bán */}
        <span className="text-slate-600">Đã bán {formatSoldCount(soldCount)}</span>
      </div>

      {/* 3. Giá tiền */}
      <p className="mt-4 text-3xl sm:text-4xl font-bold text-blue-600">
        {price.toLocaleString("vi-VN")} ₫
      </p>

      {/* 4. Mô tả sản phẩm */}
      {description && (
        <p className="mt-5 text-slate-600 text-sm leading-relaxed break-words">
          {description}
        </p>
      )}
    </div>
  );
}
