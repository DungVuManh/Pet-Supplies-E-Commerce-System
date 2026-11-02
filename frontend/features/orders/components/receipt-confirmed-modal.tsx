// =============================================================
// features/orders/components/receipt-confirmed-modal.tsx
// Modal xuất hiện sau khi người dùng bấm "Đã nhận được hàng"
// Gồm nút "Đánh giá ngay" (link tới /reviews) và "Trở về" (link tới /)
// =============================================================

"use client";

import Link from "next/link";
import { CheckCircle2, MessageSquareHeart, Star, X } from "lucide-react";
import React from "react";

interface ReceiptConfirmedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptConfirmedModal({
  isOpen,
  onClose,
}: ReceiptConfirmedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xl text-center animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {/* Icon chúc mừng */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
          <CheckCircle2 className="size-9" />
        </div>

        {/* Tiêu đề & nội dung */}
        <h2 id="receipt-modal-title" className="text-xl font-bold text-ink">
          Đã nhận hàng thành công!
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
          Cảm ơn bạn đã mua sắm tại Petjoy. Các sản phẩm bạn vừa nhận dùng có ưng ý không? Hãy chia sẻ đánh giá để giúp những người bạn thú cưng khác nhé!
        </p>

        {/* 2 Nút hành động chính theo yêu cầu */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {/* Nút 1: Đánh giá ngay -> sang trang /reviews (tab Chưa đánh giá) */}
          <Link
            href="/reviews"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-3 px-4 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors hover:bg-brand/90 cursor-pointer"
          >
            <Star className="size-4 fill-amber-300 text-amber-300" />
            <span>Đánh giá ngay</span>
          </Link>

          {/* Nút 2: Trở về -> Trang chủ */}
          <Link
            href="/"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3 px-4 text-xs sm:text-sm font-semibold text-slate-700 transition-colors hover:bg-canvas cursor-pointer"
          >
            <span>Trở về trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

