"use client";

import Image from "next/image";
import React from "react";
import type { CheckoutOrderItem, CheckoutSummary } from "../types";

type OrderReviewCardProps = {
  items: CheckoutOrderItem[];
  summary: CheckoutSummary;
  paymentMethod: "vnpay" | "cod";
  isSubmitting: boolean;
  onSubmitOrder: () => void;
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function OrderReviewCard({
  items,
  summary,
  paymentMethod,
  isSubmitting,
  onSubmitOrder,
}: OrderReviewCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink mb-5">Xem lại đơn hàng</h2>

      {/* Danh sách sản phẩm mua */}
      <div className="divide-y divide-line">
        {items.map((item) => (
          <div key={item.id} className="py-4 first:pt-0 flex items-start gap-3.5">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-line/60">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-contain p-1"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-ink leading-snug">
                {item.name}
              </h3>
              <p className="text-xs text-muted mt-0.5">{item.description}</p>
              <p className="text-xs text-muted mt-0.5">
                SKU: {item.sku} · {formatVND(item.price)} × {item.quantity}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <span className="font-semibold text-sm text-ink">
                {formatVND(item.price * item.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chi tiết tiền */}
      <div className="mt-5 pt-5 border-t border-line space-y-3 text-sm">
        <div className="flex justify-between text-muted">
          <span>Tạm tính ({summary.totalQuantity} sản phẩm):</span>
          <span className="font-semibold text-ink">
            {formatVND(summary.subtotal)}
          </span>
        </div>

        <div className="flex justify-between text-muted">
          <span>Phí vận chuyển:</span>
          <span className="font-semibold text-ink">
            {formatVND(summary.shippingFee)}
          </span>
        </div>

        <div className="flex justify-between text-muted">
          <span>Giảm giá:</span>
          <span className="font-semibold text-ink">
            {formatVND(summary.discount)}
          </span>
        </div>
      </div>

      {/* Tổng thanh toán */}
      <div className="mt-5 pt-5 border-t border-line">
        <div className="flex items-baseline justify-between">
          <span className="font-bold text-base text-ink">Tổng thanh toán</span>
          <span className="text-2xl font-bold text-blue-600">
            {formatVND(summary.total)}
          </span>
        </div>
      </div>

      {/* Nút đặt hàng */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onSubmitOrder}
        className="mt-6 w-full rounded-xl bg-blue-600 py-3.5 px-4 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang tạo đơn hàng..." : "Đặt hàng & thanh toán"}
      </button>

      {/* Ghi chú an toàn */}
      <p className="mt-3 text-center text-xs text-muted">
        {paymentMethod === "vnpay"
          ? "Thanh toán an toàn qua cổng VNPay"
          : "Thanh toán khi nhận hàng (COD)"}
      </p>
    </div>
  );
}
