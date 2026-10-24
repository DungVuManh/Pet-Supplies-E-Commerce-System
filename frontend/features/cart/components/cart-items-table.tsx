"use client";

import Image from "next/image";
import React from "react";
import type { CartItem } from "../types";

type CartItemsTableProps = {
  items: CartItem[];
  onIncreaseQuantity: (id: string) => void;
  onDecreaseQuantity: (id: string) => void;
  onRemoveItem: (id: string) => void;
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function CartItemsTable({
  items,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveItem,
}: CartItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">
        Giỏ hàng của bạn đang trống.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      {/* Header bảng */}
      <div className="grid grid-cols-12 items-center px-6 py-4 text-xs font-semibold tracking-wider text-muted border-b border-line">
        <div className="col-span-6 uppercase">SẢN PHẨM</div>
        <div className="col-span-3 text-center uppercase">SỐ LƯỢNG</div>
        <div className="col-span-3 text-right uppercase pr-8">THÀNH TIỀN</div>
      </div>

      {/* Danh sách từng sản phẩm */}
      <div className="divide-y divide-line">
        {items.map((item) => {
          const itemTotal = item.product.price * item.quantity;

          return (
            <div
              key={item.id}
              className="grid grid-cols-12 items-center px-6 py-6 gap-4"
            >
              {/* Ảnh + Thông tin */}
              <div className="col-span-6 flex items-center gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-line/60">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink text-[15px] leading-snug">
                    {item.product.name}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {item.product.description}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    SKU: {item.product.sku} · {formatVND(item.product.price)}
                  </p>
                </div>
              </div>

              {/* Bộ tăng giảm số lượng */}
              <div className="col-span-3 flex justify-center">
                <div className="inline-flex items-center rounded-lg border border-line bg-surface px-2 py-1">
                  <button
                    type="button"
                    onClick={() => onDecreaseQuantity(item.id)}
                    className="size-7 flex items-center justify-center text-muted hover:text-ink transition-colors font-medium text-base"
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-ink">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncreaseQuantity(item.id)}
                    className="size-7 flex items-center justify-center text-muted hover:text-ink transition-colors font-medium text-base"
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Thành tiền + Thùng rác */}
              <div className="col-span-3 flex items-center justify-end gap-3">
                <span className="font-semibold text-ink text-[15px]">
                  {formatVND(itemTotal)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-muted hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                  aria-label="Xóa sản phẩm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
