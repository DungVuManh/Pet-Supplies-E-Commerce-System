"use client";

// =============================================================
// features/checkout/components/payment-result-view.tsx
// Màn hình thông báo Đặt hàng thành công & Tích hợp VietQR SePay
// =============================================================

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { SepayTransferCard } from "./sepay-transfer-card";

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return new Date().toLocaleString("vi-VN");
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} · ${hours}:${minutes}`;
}

export function PaymentResultView() {
  const searchParams = useSearchParams();

  // Đọc các trường trả về từ URL
  const orderCode = searchParams.get("orderCode") || "ORD-PENDING";
  const total = Number(searchParams.get("total") || 0);
  const initialPaymentMethod = searchParams.get("paymentMethod") || "COD";
  const paymentProvider = searchParams.get("paymentProvider") || "";
  const createdAt = searchParams.get("createdAt");
  const promotionCode = searchParams.get("promotionCode");
  const discount = Number(searchParams.get("discount") || 0);

  const [isPaid, setIsPaid] = useState(false);
  const [currentMethod, setCurrentMethod] = useState(initialPaymentMethod);

  // Đơn hàng chuyển khoản SePay đang chờ quét mã
  const isSepayPending =
    (paymentProvider === "sepay" || initialPaymentMethod === "ONLINE") &&
    currentMethod === "ONLINE" &&
    !isPaid;

  const displayMethod =
    currentMethod === "COD"
      ? "COD · Thanh toán khi nhận hàng"
      : paymentProvider === "sepay"
        ? "VietQR · Chuyển khoản ngân hàng qua SePay"
        : currentMethod === "ONLINE"
          ? "VNPay · Thanh toán trực tuyến"
          : currentMethod;

  return (
    <div className="w-full max-w-2xl mx-auto">
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
          <li className="font-medium text-ink">
            {isSepayPending ? "Quét mã chuyển khoản" : "Kết quả đặt hàng"}
          </li>
        </ol>
      </nav>

      {/* 2. Nếu là đơn chuyển khoản SePay chưa thanh toán -> Hiển thị thẻ VietQR */}
      {isSepayPending ? (
        <SepayTransferCard
          orderCode={orderCode}
          onPaymentSuccess={() => setIsPaid(true)}
          onConvertToCodSuccess={() => setCurrentMethod("COD")}
        />
      ) : (
        /* 3. Thẻ thông báo Đặt hàng / Thanh toán thành công */
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
          {/* Tag trạng thái */}
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
              {isPaid || currentMethod !== "COD"
                ? "Thanh toán thành công"
                : "Đặt hàng thành công"}
            </span>
          </div>

          {/* Icon tick xanh và lời chúc */}
          <div className="text-center my-4">
            <div className="mx-auto size-16 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-bold text-ink">
              {isPaid
                ? "Thanh toán thành công!"
                : "Đặt hàng thành công!"}
            </h1>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto leading-relaxed">
              {isPaid
                ? "Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đã được xác nhận thanh toán và đang được chuẩn bị đóng gói."
                : "Cảm ơn bạn đã mua hàng tại Petly. Đơn hàng của bạn đã được ghi nhận vào hệ thống và đang được chuẩn bị."}
            </p>
          </div>

          {/* 4. Khung chi tiết 4 trường: Mã đơn, Số tiền, Phương thức, Thời gian */}
          <div className="my-6 rounded-xl bg-gray-50/80 p-5 border border-line/60 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Mã đơn hàng:</span>
              <span className="font-bold text-ink font-mono text-base">
                #{orderCode}
              </span>
            </div>

            {promotionCode && discount > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-words text-muted">
                  Giảm giá ({promotionCode}):
                </span>
                <span className="shrink-0 font-semibold text-danger">
                  -{formatVND(discount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted">Số tiền:</span>
              <span className="font-bold text-blue-600 text-lg">
                {formatVND(total)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted">Phương thức:</span>
              <span className="font-semibold text-ink">
                {displayMethod}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted">Thời gian:</span>
              <span className="font-medium text-ink">
                {formatDateTime(createdAt)}
              </span>
            </div>
          </div>

          {/* 5. Nút hành động */}
          <div className="space-y-3 mt-8">
            <Link
              href="/orders"
              className="block w-full rounded-xl bg-blue-600 py-3.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Xem danh sách đơn hàng
            </Link>
            <Link
              href="/listProduct/allProducts"
              className="block w-full rounded-xl border border-line bg-surface py-3.5 text-center text-sm font-semibold text-ink hover:bg-gray-50 transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentResultView;
