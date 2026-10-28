"use client";

// =============================================================
// features/checkout/components/order-success-view.tsx
// Màn hình: Cảm ơn đã đặt hàng! (Xác nhận đơn hàng)
// =============================================================

import Link from "next/link";
import React from "react";
import type { CheckoutOrderItem, ShippingAddress } from "../types";

export function OrderSuccessView({
  items = [],
  address = {
    fullName: "Khách hàng",
    phone: "0900000000",
    address: "Việt Nam",
  },
}: {
  items?: CheckoutOrderItem[];
  address?: ShippingAddress;
}) {
  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-muted mb-4">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand transition-colors">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/checkout" className="hover:text-brand transition-colors">
              Thanh toán
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-ink">Xác nhận đơn hàng</li>
        </ol>
      </nav>

      {/* 2. Tiêu đề lời cảm ơn */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-ink tracking-tight">
          Cảm ơn bạn đã đặt hàng!
        </h1>
        <p className="mt-2 text-sm text-muted">
          Đơn hàng của bạn đã được tiếp nhận và đang được xử lý.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink mb-4">Thông tin giao hàng</h2>
        <p className="text-sm font-semibold text-ink">
          {address.fullName} · {address.phone}
        </p>
        <p className="text-sm text-muted mt-1">{address.address}</p>

        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/listProduct/allProducts"
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}
