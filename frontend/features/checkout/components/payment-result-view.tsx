"use client";

// =============================================================
// features/checkout/components/payment-result-view.tsx
// Màn hình thông báo Đặt hàng thành công (hiển thị Mã đơn, Số tiền, Phương thức, Thời gian)
// =============================================================

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";

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
  const paymentMethod = searchParams.get("paymentMethod") || "COD";
  const createdAt = searchParams.get("createdAt");

  const displayMethod =
    paymentMethod === "COD"
      ? "COD · Thanh toán khi nhận hàng"
      : paymentMethod === "ONLINE"
      ? "VNPay · Thanh toán trực tuyến"
      : paymentMethod;

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
          <li className="font-medium text-ink">Kết quả đặt hàng</li>
        </ol>
      </nav>

      {/* 2. Thẻ thông báo Đặt hàng thành công */}
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
        {/* Tag trạng thái */}
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
            Đặt hàng thành công
          </span>
        </div>

        {/* Icon tick xanh và lời chúc */}
        <div className="text-center my-4">
          <div className="mx-auto size-16 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-ink">
            Đặt hàng thành công!
          </h1>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto leading-relaxed">
            Cảm ơn bạn đã mua hàng tại Petly. Đơn hàng của bạn đã được ghi nhận vào hệ thống và đang được chuẩn bị.
          </p>
        </div>

        {/* 3. Khung chi tiết 4 trường bắt buộc: Mã đơn, Số tiền, Phương thức, Thời gian */}
        <div className="my-6 rounded-xl bg-gray-50/80 p-5 border border-line/60 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Mã đơn hàng:</span>
            <span className="font-bold text-ink font-mono text-base">
              #{orderCode}
            </span>
          </div>

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

        {/* 4. Nút hành động */}
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

      {/* ================================================================
        TODO: THANH TOÁN ONLINE - Mở comment khi tích hợp VNPay / Stripe

        --- TRƯỜNG HỢP 1: Thanh toán online THÀNH CÔNG ---
        (dùng khi status từ VNPay trả về = "success")

        <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
              Thanh toán thành công
            </span>
          </div>
          <div className="text-center my-4">
            <div className="mx-auto size-16 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-bold text-ink">Thanh toán thành công!</h1>
            <p className="mt-2 text-sm text-muted">
              Đơn hàng đã được thanh toán và xác nhận.
            </p>
          </div>
          -- Hiển thị 4 trường: orderCode, total, paymentMethod, createdAt --
        </div>

        --- TRƯỜNG HỢP 2: Thanh toán online THẤT BẠI ---
        (dùng khi status từ VNPay trả về = "failed")

        <div className="rounded-2xl border border-red-200 bg-surface p-8 shadow-sm">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-red-50 px-3.5 py-1 text-xs font-semibold text-red-700 border border-red-100">
              Thanh toán thất bại
            </span>
          </div>
          <div className="text-center my-4">
            <div className="mx-auto size-16 rounded-full border-2 border-red-400 bg-red-50 text-red-600 flex items-center justify-center text-2xl font-bold">
              ✗
            </div>
            <h1 className="mt-4 text-2xl font-bold text-ink">Thanh toán thất bại!</h1>
            <p className="mt-2 text-sm text-muted">
              Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác.
            </p>
          </div>
          <div className="space-y-3 mt-8">
            <button className="block w-full rounded-xl bg-red-600 py-3.5 text-center text-sm font-semibold text-white">
              Thử lại thanh toán
            </button>
            <Link href="/cart" className="block w-full rounded-xl border border-line py-3.5 text-center text-sm font-semibold text-ink">
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>

      ================================================================ */}
    </div>
  );
}

export default PaymentResultView;
