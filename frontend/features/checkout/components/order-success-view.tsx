"use client";

// =============================================================
// features/checkout/components/order-success-view.tsx
// Màn hình 2: Cảm ơn đã đặt hàng! (Xác nhận đơn hàng)
// =============================================================

import Image from "next/image";
import Link from "next/link";
import React from "react";
import {
  MOCK_CHECKOUT_ITEMS,
  MOCK_SHIPPING_ADDRESS,
} from "../mock-data";

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function OrderSuccessView() {
  const items = MOCK_CHECKOUT_ITEMS;
  const address = MOCK_SHIPPING_ADDRESS;

  return (
    <div className="w-full">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-muted mb-3">
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink tracking-tight">
          Cảm ơn Minh Anh đã đặt hàng!
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Xác nhận đơn hàng đã được gửi đến <span className="text-ink font-medium">minhanh.nguyen@gmail.com</span>.
        </p>
      </div>

      {/* 3. Banner thông báo ghi nhận đơn hàng */}
      <div className="rounded-2xl border border-emerald-100 bg-[#f4fbf7] p-5 flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3.5">
          <div className="size-8 shrink-0 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
            ✓
          </div>
          <div>
            <h3 className="font-bold text-ink text-base">
              Đơn hàng #PA261012018 đã được ghi nhận
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Đặt lúc 10:42, ngày 12/10/2026 · Dự kiến nhận hàng 14–15/10/2026
            </p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          Đã thanh toán
        </span>
      </div>

      {/* 4. Bố cục 2 cột chính */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT TRÁI (8/12): Danh sách sản phẩm + Địa chỉ giao & Vận chuyển */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card: Sản phẩm đã đặt */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink mb-5">Sản phẩm đã đặt</h2>

            <div className="divide-y divide-line">
              {items.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 flex items-start gap-4">
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
          </div>

          {/* 2 Card nhỏ song song: Giao đến + Vận chuyển & thanh toán */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Card: Giao đến */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
              <h3 className="font-bold text-sm text-ink mb-3">Giao đến</h3>
              <p className="font-semibold text-xs text-ink">
                {address.fullName} · {address.phone}
              </p>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {address.address}
              </p>
            </div>

            {/* Card: Vận chuyển & thanh toán */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
              <h3 className="font-bold text-sm text-ink mb-3">Vận chuyển & thanh toán</h3>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="text-muted">Vận chuyển: </span>
                  <span className="font-semibold text-ink">Tiêu chuẩn</span>
                </p>
                <p>
                  <span className="text-muted">Thanh toán: </span>
                  <span className="font-semibold text-ink">VNPay · Đã thanh toán</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (4/12): Tóm tắt đơn hàng & Thao tác */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink mb-5">Tóm tắt đơn hàng</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>Tạm tính (4 sản phẩm):</span>
                <span className="font-semibold text-ink">1.070.000 đ</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Phí vận chuyển:</span>
                <span className="font-semibold text-ink">30.000 đ</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Giảm giá:</span>
                <span className="font-semibold text-ink">0 đ</span>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-line">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-base text-ink">Tổng thanh toán</span>
                <span className="text-2xl font-bold text-blue-600">
                  1.100.000 đ
                </span>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => alert("Chức năng theo dõi đơn hàng đang phát triển.")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 px-4 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <span>📦</span>
                <span>Theo dõi đơn hàng</span>
              </button>

              <Link
                href="/listProduct/allProducts"
                className="block w-full rounded-xl border border-line bg-surface py-3.5 px-4 text-center text-sm font-semibold text-ink hover:bg-gray-50 transition-colors"
              >
                Tiếp tục mua sắm
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted text-center leading-relaxed">
              Petly sẽ thông báo khi đơn hàng được bàn giao cho đơn vị vận chuyển. Bạn có thể theo dõi trong Đơn hàng của tôi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
