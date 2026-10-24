"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-actions.tsx
// Component thao tác mua hàng: Bộ đếm số lượng, Thêm giỏ hàng, Mua ngay, Lưu yêu thích & Cam kết
// =============================================================

import { Heart, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import React from "react";

type ProductActionsProps = {
  quantity: number;
  isLove: boolean;
  isOutOfStock: boolean;
  isAddingToCart?: boolean;
  cartFeedback?: {
    type: "success" | "error";
    message: string;
  } | null;
  onIncreaseQuantity: () => void;
  onDecreaseQuantity: () => void;
  onToggleLove: () => void;
  onAddToCart?: () => void;
  onBuyNow?: () => void;
};

export function ProductActions({
  quantity,
  isLove,
  isOutOfStock,
  isAddingToCart = false,
  cartFeedback = null,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onToggleLove,
  onAddToCart,
  onBuyNow,
}: ProductActionsProps) {
  return (
    <div>
      {/* Khối nút bấm thao tác */}
      <div className="mt-6 flex flex-wrap items-stretch gap-3">
        {/* Bộ đếm số lượng [- 1 +] */}
        <div className="flex items-center rounded-md border border-line bg-surface">
          <button
            type="button"
            aria-label="Giảm số lượng"
            disabled={isOutOfStock || quantity <= 1 || isAddingToCart}
            className="px-3.5 py-3 hover:bg-gray-50 transition-colors disabled:opacity-40"
            onClick={onDecreaseQuantity}
          >
            <Minus size={16} />
          </button>
          <span className="w-9 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            disabled={isOutOfStock || isAddingToCart}
            className="px-3.5 py-3 hover:bg-gray-50 transition-colors disabled:opacity-40"
            onClick={onIncreaseQuantity}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Nút Thêm vào giỏ hàng */}
        <button
          type="button"
          disabled={isOutOfStock || isAddingToCart}
          onClick={onAddToCart}
          className="flex flex-1 min-w-36 items-center justify-center gap-2 rounded-md bg-blue-600 py-3 px-4 font-semibold text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
        >
          <ShoppingBag size={18} />
          <span>{isAddingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}</span>
        </button>

        {/* Nút Mua ngay */}
        <button
          type="button"
          disabled={isOutOfStock || isAddingToCart}
          onClick={onBuyNow}
          className="flex flex-1 min-w-32 items-center justify-center gap-2 rounded-md bg-orange-500 py-3 px-4 font-semibold text-white hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
        >
          <Zap size={18} />
          <span>Mua ngay</span>
        </button>

        {/* Nút Lưu yêu thích */}
        <button
          type="button"
          aria-label={isLove ? "Bỏ lưu sản phẩm" : "Lưu sản phẩm"}
          className="flex items-center gap-2 rounded-md border border-line bg-surface px-5 font-medium hover:bg-gray-50 transition-colors"
          onClick={onToggleLove}
        >
          <Heart
            size={18}
            fill={isLove ? "#ef4444" : "none"}
            color={isLove ? "#ef4444" : "currentColor"}
          />
          <span className="text-sm">Lưu</span>
        </button>
      </div>

      {/* Thông báo kết quả thêm giỏ hàng (thành công hoặc lỗi tồn kho) */}
      {cartFeedback && (
        <div
          className={`mt-3 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-1 ${
            cartFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{cartFeedback.type === "success" ? "✅" : "⚠️"}</span>
          <span>{cartFeedback.message}</span>
        </div>
      )}

      {/* Cam kết của shop */}
      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        <li className="flex items-center gap-1.5">
          <span className="text-blue-600 font-bold">✔</span> 100% chính hãng
        </li>
        <li className="flex items-center gap-1.5">
          <span>🚚</span> Giao trong 2–3 ngày
        </li>
        <li className="flex items-center gap-1.5">
          <span>↺</span> Đổi trả trong 7 ngày
        </li>
      </ul>
    </div>
  );
}
