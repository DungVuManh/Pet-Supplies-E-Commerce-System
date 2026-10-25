"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-variants.tsx
// Component chọn biến thể (khối lượng/quy cách) & hiển thị trạng thái tồn kho
// =============================================================

import React from "react";
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
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
      {/* Chỉ hiển thị bộ chọn biến thể khi sản phẩm có từ 1 biến thể thật trở lên */}
      {variants.length > 0 && (
        <>
          <span className="text-slate-500 font-medium">Quy cách:</span>
          {variants.map((v, idx) => {
            const isSelected = selectedIndex === idx;

            return (
              <button
                key={v.sku || idx}
                type="button"
                onClick={() => onSelectVariant(idx)}
                className={`rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-blue-100 text-blue-700 font-semibold ring-1 ring-blue-500/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </>
      )}

      {/* Badge tồn kho thật */}
      <span
        className={`rounded-full px-3 py-1 font-medium text-xs ${
          currentStock > 0
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-600 border border-red-200"
        }`}
      >
        {currentStock > 0
          ? `Còn hàng · ${currentStock} sản phẩm`
          : "Tạm hết hàng"}
      </span>
    </div>
  );
}
