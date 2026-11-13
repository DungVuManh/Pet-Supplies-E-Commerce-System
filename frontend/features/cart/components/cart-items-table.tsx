"use client";

import Image from "next/image";
import React from "react";
import type { CartItem } from "../types";

type CartItemsTableProps = {
 items: CartItem[];
 isLoading?: boolean;
 onIncreaseQuantity: (id: string) => void;
 onDecreaseQuantity: (id: string) => void;
 onRemoveItem: (id: string) => void;
 selectedItems?: Record<string, boolean>;
 onToggleSelect?: (id: string) => void;
};

function formatVND(value: number): string {
 return value.toLocaleString("vi-VN") + " đ";
}

export function CartItemsTable({
 items,
 isLoading = false,
 onIncreaseQuantity,
 onDecreaseQuantity,
 onRemoveItem,
 selectedItems = {},
 onToggleSelect,
}: CartItemsTableProps) {
 if (isLoading) {
  return (
   <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">
    <div className="inline-block size-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    <p className="mt-3 text-sm font-medium">Đang tải giỏ hàng...</p>
   </div>
  );
 }

 if (items.length === 0) {
  return (
   <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted">
    <p className="text-base font-semibold text-ink">
     Giỏ hàng của bạn đang trống.
    </p>
    <p className="mt-1 text-xs text-muted">
     Hãy thêm những món đồ ưng ý cho thú cưng của bạn nhé!
    </p>
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
     const isSelected = Boolean(selectedItems[item.id]);
     const itemTotal = isSelected ? item.product.price * item.quantity : 0;
     
     const maxStock = item.product.availableStock ?? item.product.stock;
     const isMaxReached = maxStock !== undefined && item.quantity >= maxStock;

     return (
      <div
       key={item.id}
       className="grid grid-cols-12 items-center px-6 py-6 gap-4"
      >
       {/* Checkbox + Ảnh + Thông tin */}
       <div className="col-span-6 flex items-center gap-4">
        <input
         type="checkbox"
         checked={isSelected}
         onChange={() => onToggleSelect?.(item.id)}
         className="size-4 rounded border-line text-blue-600 focus:ring-blue-500 cursor-pointer"
         aria-label={`Chọn mua ${item.product.name}`}
        />
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

         <p className="text-xs text-muted mt-0.5">
          {item.product.sku} · {formatVND(item.product.price)}
         </p>

         {/* Thông báo nếu stock không đủ hoặc đã đạt tối đa */}
         {maxStock !== undefined && maxStock <= 0 ? (
          <p className="text-xs text-rose-500 mt-1 font-medium">
           Sản phẩm hiện đã hết hàng
          </p>
         ) : isMaxReached ? (
          <p className="text-xs text-rose-500 mt-1 font-medium">
           Kho chỉ còn {maxStock} sản phẩm có sẵn
          </p>
         ) : null}
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
          disabled={isMaxReached}
          onClick={() => {
           if (!isMaxReached) {
            onIncreaseQuantity(item.id);
           }
          }}
          className="size-7 flex items-center justify-center text-muted hover:text-ink transition-colors font-medium text-base disabled:opacity-30 disabled:cursor-not-allowed"
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
