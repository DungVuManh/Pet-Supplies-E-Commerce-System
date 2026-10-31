"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-variants.tsx
// Component hiển thị danh sách biến thể / phân loại hàng để người dùng chọn mua
// Hiển thị trực quan số lượng tồn kho còn lại của từng biến thể khi được chọn
// =============================================================

import React from "react";
import { Check } from "lucide-react";
import type { ProductVariantItem } from "../types";

type ProductVariantsProps = {
  variants: ProductVariantItem[];
  selectedIndex: number;
  currentStock: number;
  onSelectVariant: (index: number) => void;
};

export function ProductVariants({
  variants,
  selectedIndex,
  currentStock,
  onSelectVariant,
}: ProductVariantsProps) {
  if (!variants || variants.length === 0) return null;

  // Nếu chỉ có 1 biến thể và là "mặc định" (default) thì không cần hiển thị khối lựa chọn
  const isSingleDefault =
    variants.length <= 1 &&
    (!variants[0]?.label ||
      /^(mặc\s*định|mac\s*dinh|default|tiêu\s*chuẩn|tieu\s*chuan)$/i.test(
        variants[0].label.trim()
      ));

  if (isSingleDefault) return null;

  const selectedVariant = variants[selectedIndex] || variants[0];

  return (
    <div className="mt-6 space-y-3.5 border-t border-b border-slate-100 py-4">
      {/* Tiêu đề & Biến thể đang chọn */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Phân loại / Quy cách:</span>
          {selectedVariant && (
            <span className="text-slate-600 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full text-xs">
              {selectedVariant.label}
            </span>
          )}
        </div>

        {/* Trạng thái tồn kho của biến thể đang chọn */}
        <div className="flex items-center gap-1.5 text-xs">
          {currentStock > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Còn {currentStock.toLocaleString("vi-VN")} sản phẩm
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
              <span className="size-1.5 rounded-full bg-rose-500" />
              Tạm hết hàng
            </span>
          )}
        </div>
      </div>

      {/* Danh sách các nút chọn biến thể */}
      <div className="flex flex-wrap gap-2.5 max-h-60 overflow-y-auto pr-1">
        {variants.map((v, idx) => {
          const isSelected = selectedIndex === idx;
          const stock = v.availableStock ?? v.stock ?? 0;
          const isOut = stock <= 0;

          return (
            <button
              key={v.sku || idx}
              type="button"
              disabled={isOut}
              onClick={() => onSelectVariant(idx)}
              className={`group relative flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs ring-1 ring-blue-600"
                  : isOut
                  ? "border-dashed border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed line-through"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-slate-50"
              }`}
            >
              {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
              <span>{v.label}</span>
              {isOut && (
                <span className="text-[11px] text-red-500 font-normal no-underline ml-1">
                  (Hết)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
