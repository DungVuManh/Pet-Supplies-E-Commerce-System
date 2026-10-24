"use client";

// =============================================================
// features/checkout/components/payment-result-view.tsx
// Màn hình 1: Kết quả thanh toán (Thành công & Chưa hoàn tất)
// =============================================================

import Link from "next/link";
import React, { useState } from "react";

export function PaymentResultView() {
  // Cho phép chuyển đổi xem thử trạng thái Thành công hay Không thành công
  const [activeTab, setActiveTab] = useState<"both" | "success" | "failed">("both");

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
          <li className="font-medium text-ink">Kết quả</li>
        </ol>
      </nav>

      {/* 2. Tiêu đề trang */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">
            Kết quả thanh toán
          </h1>
          <p className="mt-1 text-sm text-muted">
            Hai trạng thái thay thế của bước thanh toán — chỉ một trạng thái xuất hiện cho mỗi giao dịch.
          </p>
        </div>

        {/* Nút lọc tab để người học dễ test từng trạng thái */}
        <div className="inline-flex rounded-xl border border-line bg-surface p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("both")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "both" ? "bg-blue-600 text-white" : "text-muted hover:text-ink"
            }`}
          >
            Xem cả hai
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("success")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "success" ? "bg-emerald-600 text-white" : "text-muted hover:text-ink"
            }`}
          >
            Chỉ Thành công
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("failed")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "failed" ? "bg-rose-600 text-white" : "text-muted hover:text-ink"
            }`}
          >
            Chỉ Thất bại
          </button>
        </div>
      </div>

      {/* 3. Lưới hiển thị 2 trạng thái theo đúng thiết kế */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* ========================================================= */}
        {/* TRẠNG THÁI A: THÀNH CÔNG */}
        {/* ========================================================= */}
        {(activeTab === "both" || activeTab === "success") && (
          <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm flex flex-col justify-between">
            {/* Tag trạng thái */}
            <div className="mb-6">
              <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                Trạng thái A · Thành công
              </span>
            </div>

            {/* Icon tick xanh và thông báo */}
            <div className="text-center my-4">
              <div className="mx-auto size-16 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <h2 className="mt-4 text-2xl font-bold text-ink">
                Thanh toán thành công
              </h2>
              <p className="mt-1.5 text-xs text-muted max-w-sm mx-auto">
                Petly đã nhận thanh toán. Đơn hàng của bạn đang được chuẩn bị.
              </p>
            </div>

            {/* Khung thông tin hóa đơn */}
            <div className="my-6 rounded-xl bg-gray-50/80 p-5 border border-line/60 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Đơn hàng:</span>
                <span className="font-semibold text-ink">#PA261012018</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Số tiền:</span>
                <span className="font-semibold text-ink">1.100.000 đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Phương thức:</span>
                <span className="font-semibold text-ink">VNPay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Mã giao dịch:</span>
                <span className="font-semibold text-ink">VNP261012083842</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Thời gian:</span>
                <span className="font-semibold text-ink">12/10/2026 · 10:42</span>
              </div>
            </div>

            {/* 2 nút thao tác */}
            <div className="space-y-3">
              <Link
                href="/checkout/success"
                className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Xem xác nhận đơn hàng
              </Link>
              <Link
                href="/listProduct/allProducts"
                className="block w-full rounded-xl border border-line bg-surface py-3 text-center text-sm font-semibold text-ink hover:bg-gray-50 transition-colors"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TRẠNG THÁI B: CHƯA HOÀN TẤT (THẤT BẠI) */}
        {/* ========================================================= */}
        {(activeTab === "both" || activeTab === "failed") && (
          <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm flex flex-col justify-between">
            {/* Tag trạng thái */}
            <div className="mb-6">
              <span className="inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-100">
                Trạng thái B · Không thành công
              </span>
            </div>

            {/* Icon gạch chéo đỏ và thông báo */}
            <div className="text-center my-4">
              <div className="mx-auto size-16 rounded-full border-2 border-rose-500 bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold">
                ✕
              </div>
              <h2 className="mt-4 text-2xl font-bold text-ink">
                Thanh toán chưa hoàn tất
              </h2>
              <p className="mt-1.5 text-xs text-muted max-w-sm mx-auto">
                Giao dịch không thành công do quá thời gian thanh toán. Bạn chưa bị trừ tiền.
              </p>
            </div>

            {/* Khung thông tin giao dịch lỗi */}
            <div className="my-6 rounded-xl bg-gray-50/80 p-5 border border-line/60 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Đơn hàng:</span>
                <span className="font-semibold text-ink">#PA261012018</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Số tiền:</span>
                <span className="font-semibold text-ink">1.100.000 đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Phương thức:</span>
                <span className="font-semibold text-ink">VNPay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Mã lỗi:</span>
                <span className="font-semibold text-rose-600">VNP-15 · Hết thời gian</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Thời gian:</span>
                <span className="font-semibold text-ink">12/10/2026 · 10:42</span>
              </div>
            </div>

            {/* 2 nút thao tác */}
            <div className="space-y-3">
              <Link
                href="/checkout"
                className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Thử thanh toán lại
              </Link>
              <Link
                href="/checkout"
                className="block w-full rounded-xl border border-line bg-surface py-3 text-center text-sm font-semibold text-ink hover:bg-gray-50 transition-colors"
              >
                Đổi phương thức thanh toán
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Dòng ghi chú hỗ trợ ở dưới cùng */}
      <p className="mt-8 text-center text-xs text-muted">
        Nếu tài khoản đã bị trừ tiền nhưng chưa có xác nhận, vui lòng liên hệ{" "}
        <a href="tel:1900636789" className="text-blue-600 font-semibold hover:underline">
          1900 636 789
        </a>{" "}
        và cung cấp mã đơn hàng.
      </p>
    </div>
  );
}
