"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-info.tsx
// Component hiển thị thông tin cơ bản: Thương hiệu, Đánh giá, Tên, Giá & Mô tả
// =============================================================

import React from "react";

type ProductInfoProps = {
  brand?: string;
  name: string;
  price: number;
  description?: string;
  ratingAvg: number;
  ratingCount: number;
};

export function ProductInfo({
  brand,
  name,
  price,
  description,
  ratingAvg,
  ratingCount,
}: ProductInfoProps) {
  return (
    <div>
      {/* Thương hiệu & Đánh giá */}
      <div className="flex items-start justify-between text-sm">
        {brand ? (
          <span className="font-medium uppercase tracking-wide text-slate-500">
            {brand}
          </span>
        ) : (
          <span />
        )}
        <span className="text-slate-600">
          {ratingCount > 0
            ? `★ ${ratingAvg.toLocaleString("vi-VN")} / 5 · ${ratingCount} đánh giá`
            : "Chưa có đánh giá"}
        </span>
      </div>

      {/* Tên sản phẩm */}
      <h1 className="mt-3 text-[28px] font-semibold text-ink leading-tight break-words">
        {name}
      </h1>

      {/* Giá tiền */}
      <p className="mt-4 text-4xl font-medium text-blue-600">
        {price.toLocaleString("vi-VN")} ₫
      </p>

      {/* Mô tả sản phẩm */}
      {description && (
        <p className="mt-6 text-slate-600 leading-relaxed break-words">{description}</p>
      )}
    </div>
  );
}
