"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { DeliveryAddressCard } from "./components/delivery-address-card";
import { OrderReviewCard } from "./components/order-review-card";
import { PaymentMethodCard } from "./components/payment-method-card";
import { ShippingMethodCard } from "./components/shipping-method-card";
import {
  MOCK_CHECKOUT_ITEMS,
  MOCK_SHIPPING_ADDRESS,
  MOCK_SHIPPING_METHOD,
} from "./mock-data";
import type { CheckoutSummary, PaymentMethodType } from "./types";
export * from "./types";
export * from "./mock-data";

export function CheckoutView() {
  // State phương thức thanh toán ("vnpay" hoặc "cod")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("vnpay");

  // Dữ liệu mẫu sản phẩm và địa chỉ
  const [items] = useState(MOCK_CHECKOUT_ITEMS);
  const [address] = useState(MOCK_SHIPPING_ADDRESS);
  const [shippingMethod] = useState(MOCK_SHIPPING_METHOD);

  // Tính tổng kết đơn hàng
  const summary: CheckoutSummary = useMemo(() => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingFee = shippingMethod.price;
    const discount = 0;
    const total = subtotal + shippingFee - discount;

    return {
      totalQuantity,
      subtotal,
      shippingFee,
      discount,
      total,
    };
  }, [items, shippingMethod]);

  function handleSubmitOrder() {
    alert(
      `Đặt hàng thành công với phương thức: ${
        paymentMethod === "vnpay" ? "VNPay" : "COD (Tiền mặt)"
      }!\nTổng thanh toán: ${summary.total.toLocaleString("vi-VN")} đ`
    );
  }

  return (
    <div className="w-full">
      {/* 1. Breadcrumbs & Bước thanh toán */}
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

        {/* Badge bước thực hiện */}
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
        {/* CỘT TRÁI (7/12 hoặc 8/12): Các bước thông tin */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          {/* 1. Địa chỉ giao hàng */}
          <DeliveryAddressCard address={address} />

          {/* 2. Phương thức vận chuyển */}
          <ShippingMethodCard method={shippingMethod} />

          {/* 3. Phương thức thanh toán */}
          <PaymentMethodCard
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
          />

          {/* Điều khoản cam kết */}
          <p className="text-xs text-muted leading-relaxed">
            Bằng việc đặt hàng, bạn đồng ý với Điều khoản mua hàng và Chính sách bảo mật của Petly.
          </p>
        </div>

        {/* CỘT PHẢI (5/12 hoặc 4/12): Xem lại đơn hàng & Đặt hàng */}
        <div className="lg:col-span-5 xl:col-span-4">
          <OrderReviewCard
            items={items}
            summary={summary}
            paymentMethod={paymentMethod}
            onSubmitOrder={handleSubmitOrder}
          />
        </div>
      </div>
    </div>
  );
}

export default CheckoutView;
