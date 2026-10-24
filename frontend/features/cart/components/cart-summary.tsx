"use client";

import Link from "next/link";
import React from "react";
import type { CartSummary as CartSummaryType } from "../types";

type CartSummaryProps = {
  summary: CartSummaryType;
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function CartSummary({ summary }: CartSummaryProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-lg font-bold text-ink">Tóm tắt đơn hàng</h2>

      <div className="mt-5 space-y-3.5 text-sm">
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

      <div className="mt-6 pt-5 border-t border-line">
        <div className="flex items-baseline justify-between">
          <span className="font-bold text-base text-ink">Tổng thanh toán</span>
          <span className="text-2xl font-bold text-blue-600">
            {formatVND(summary.total)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">Đã bao gồm VAT (nếu có).</p>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block w-full rounded-xl bg-blue-600 py-3.5 px-4 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        Tiến hành thanh toán
      </Link>
    </div>
  );
}
