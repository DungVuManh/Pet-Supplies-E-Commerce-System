"use client";

// =============================================================
// features/checkout/index.tsx
// Màn hình Thanh toán: Tải sản phẩm từ API giỏ hàng hiện tại (MongoDB)
// =============================================================

import Link from "next/link";
import React from "react";
import { DeliveryAddressCard } from "./components/delivery-address-card";
import { OrderReviewCard } from "./components/order-review-card";
import { PaymentMethodCard } from "./components/payment-method-card";
import { ShippingMethodCard } from "./components/shipping-method-card";
import { useCheckout } from "./hooks/use-checkout";

export * from "./types";

export function CheckoutView() {
  const {
    address,
    handleSubmitOrder,
    isLoading,
    isSubmitting,
    items,
    loadCart,
    loadError,
    paymentMethod,
    setPaymentMethod,
    submitError,
    summary,
    shippingMethod,
  } = useCheckout();

  if (loadError) {
    return (
      <div className="w-full py-16 text-center" role="alert">
        <p className="text-sm text-red-700">{loadError}</p>
        <button
          type="button"
          onClick={() => void loadCart()}
          className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  // Giao diện khi giỏ hàng trống
  if (!isLoading && items.length === 0) {
    return (
      <div className="w-full py-16 text-center">
        <h2 className="text-2xl font-bold text-ink">Giỏ hàng của bạn đang trống</h2>
        <p className="mt-2 text-sm text-muted">Vui lòng chọn sản phẩm vào giỏ trước khi tiến hành thanh toán.</p>
        <Link
          href="/listProduct/allProducts"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 1. Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-brand transition-colors">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/cart" className="hover:text-brand transition-colors">
                Giỏ hàng
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-ink">Thanh toán</li>
          </ol>
        </nav>

        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-100/80">
          Bước 2 / 3 · Đặt hàng
        </span>
      </div>

      {/* 2. Tiêu đề trang */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink tracking-tight">
          Thanh toán
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Kiểm tra thông tin giao hàng và hoàn tất đơn mua của bạn.
        </p>
      </div>

      {/* 3. Bố cục 2 cột chính */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {submitError && (
          <p className="lg:col-span-12 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {submitError}
          </p>
        )}

        {/* CỘT TRÁI: Địa chỉ giao hàng & Phương thức */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <DeliveryAddressCard address={address} />
          <ShippingMethodCard method={shippingMethod} />
          <PaymentMethodCard
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
          />
          <p className="text-xs text-muted leading-relaxed">
            Bằng việc đặt hàng, bạn đồng ý với Điều khoản mua hàng và Chính sách bảo mật của Petly.
          </p>
        </div>

        {/* CỘT PHẢI: Xem lại đơn hàng & Đặt hàng */}
        <div className="lg:col-span-5 xl:col-span-4">
          <OrderReviewCard
            items={items}
            summary={summary}
            paymentMethod={paymentMethod}
            isSubmitting={isSubmitting}
            onSubmitOrder={handleSubmitOrder}
          />
        </div>
      </div>
    </div>
  );
}

export default CheckoutView;
