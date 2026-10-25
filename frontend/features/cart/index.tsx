"use client";

import Link from "next/link";
import React from "react";
import { useCartPage } from "./hooks/use-cart-page";
import { CartItemsTable } from "./components/cart-items-table";
import { CartSummary } from "./components/cart-summary";
import { CartTrustBanner } from "./components/cart-trust-banner";
import { PromoCodeCard } from "./components/promo-code-card";

export function CartView() {
  const {
    items,
    summary,
    isLoading,
    promoCodeInput,
    promoMessage,
    promoError,
    setPromoCodeInput,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    applyPromoCode,
  } = useCartPage();

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
          <li className="font-medium text-ink">Giỏ hàng</li>
        </ol>
      </nav>

      {/* 2. Tiêu đề trang */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink tracking-tight">
          Giỏ hàng của bạn
        </h1>
        <p className="mt-2 text-sm text-muted">
          {summary.distinctCount} sản phẩm khác nhau · {summary.totalQuantity} món đồ dành cho các bé.
        </p>
      </div>

      {/* 3. Bố cục 2 cột chính */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT TRÁI (8/12): Bảng sản phẩm + nút mua sắm + banner */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <CartItemsTable
            items={items}
            isLoading={isLoading}
            onIncreaseQuantity={increaseQuantity}
            onDecreaseQuantity={decreaseQuantity}
            onRemoveItem={removeItem}
          />

          {/* Tiếp tục mua sắm & Ghi chú */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/listProduct/allProducts"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span>←</span>
              <span>Tiếp tục mua sắm</span>
            </Link>

            <p className="text-xs text-muted">
              Giá và số lượng đã được cập nhật.
            </p>
          </div>

          {/* Banner cam kết */}
          <CartTrustBanner />
        </div>

        {/* CỘT PHẢI (4/12): Tóm tắt đơn hàng + Mã ưu đãi */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <CartSummary summary={summary} />

          <PromoCodeCard
            value={promoCodeInput}
            onChange={setPromoCodeInput}
            onApply={applyPromoCode}
            message={promoMessage}
            isError={promoError}
          />
        </div>
      </div>
    </div>
  );
}

export default CartView;
