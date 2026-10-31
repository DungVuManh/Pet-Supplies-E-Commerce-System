"use client";

// =============================================================
// features/catalog/components/cardDetailProduct/components/product-actions.tsx
// Component thao tác mua hàng: Bộ đếm số lượng kèm số lượng còn lại,
// Thêm giỏ hàng, Mua ngay, Lưu yêu thích & Cam kết
// =============================================================

import { Heart, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import React from "react";

type ProductActionsProps = {
  quantity: number;
  currentStock?: number;
  isLove: boolean;
  isOutOfStock: boolean;
  isAddingToCart?: boolean;
  isBuyingNow?: boolean;
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
  currentStock = 0,
  isLove,
  isOutOfStock,
  isAddingToCart = false,
  isBuyingNow = false,
  cartFeedback = null,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onToggleLove,
  onAddToCart,
  onBuyNow,
}: ProductActionsProps) {
  const isMaxReached = currentStock > 0 && quantity >= currentStock;

  return (
    <div className="mt-5 space-y-4">
      {/* 1. Hàng chọn số lượng & hiển thị số lượng còn lại của biến thể */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-slate-800 min-w-16">
          Số lượng:
        </span>

        {/* Bộ đếm số lượng [- 1 +] */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          <button
            type="button"
            aria-label="Giảm số lượng"
            disabled={isOutOfStock || quantity <= 1 || isAddingToCart}
            className="px-3.5 py-2 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            onClick={onDecreaseQuantity}
          >
            <Minus size={15} />
          </button>
          <span className="w-12 text-center text-sm font-semibold text-slate-800">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            disabled={isOutOfStock || isMaxReached || isAddingToCart}
            className="px-3.5 py-2 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            onClick={onIncreaseQuantity}
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Số lượng còn lại trong kho của biến thể */}
        <span className="text-xs sm:text-sm text-slate-500">
          {currentStock > 0 ? (
            <>
              <strong className="font-semibold text-slate-800">
                {currentStock.toLocaleString("vi-VN")}
              </strong>{" "}
              sản phẩm có sẵn
            </>
          ) : (
            <strong className="font-semibold text-rose-500">Hết hàng</strong>
          )}
        </span>
      </div>

      {/* 2. Khối nút bấm thao tác mua hàng */}
      <div className="flex flex-wrap items-stretch gap-3">
        {/* Nút Thêm vào giỏ hàng */}
        <button
          type="button"
          disabled={isOutOfStock || isAddingToCart}
          onClick={onAddToCart}
          className="flex flex-1 min-w-36 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 px-4 font-semibold text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-xs"
        >
          <ShoppingBag size={18} />
          <span>{isAddingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}</span>
        </button>

        {/* Nút Mua ngay */}
        <button
          type="button"
          disabled={isOutOfStock || isAddingToCart || isBuyingNow}
          onClick={onBuyNow}
          className="flex flex-1 min-w-32 items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 px-4 font-semibold text-white hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-xs"
        >
          <Zap size={18} />
          <span>{isBuyingNow ? "Đang xử lý..." : "Mua ngay"}</span>
        </button>

        {/* Nút Lưu yêu thích */}
        <button
          type="button"
          aria-label={isLove ? "Bỏ lưu sản phẩm" : "Lưu sản phẩm"}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 font-medium hover:bg-slate-50 transition-colors"
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
          className={`rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-1 ${
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
      <ul className="pt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
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
