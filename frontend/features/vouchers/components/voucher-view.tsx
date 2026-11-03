"use client";

// =============================================================
// features/vouchers/components/voucher-view.tsx
// Màn hình "Mã giảm giá" - Thiết kế chuẩn theo layout
// Bố cục: 5 cột desktop, 2 cột tablet, 1 cột mobile; khoảng cách ~24px
// =============================================================

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, CheckCircle2, Copy } from "lucide-react";
import { VoucherCard } from "./voucher-card";
import { MOCK_VOUCHERS } from "../mock-data";

export function VoucherView() {
  // Quản lý danh sách ID voucher đã lưu (lưu vào localStorage)
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Đọc danh sách voucher đã lưu từ localStorage khi mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("petjoy_saved_vouchers");
      if (stored) {
        setSavedIds(JSON.parse(stored));
      }
    } catch {
      // Bỏ qua nếu không truy cập được localStorage
    }
  }, []);

  // Xử lý bật/tắt lưu voucher
  const handleToggleSave = (id: string) => {
    setSavedIds((prev) => {
      let updated: string[];
      if (prev.includes(id)) {
        updated = prev.filter((item) => item !== id);
        showToast("Đã bỏ lưu mã giảm giá");
      } else {
        updated = [...prev, id];
        showToast("Đã lưu mã giảm giá vào ví!");
      }
      try {
        localStorage.setItem("petjoy_saved_vouchers", JSON.stringify(updated));
      } catch {
        // Ignored
      }
      return updated;
    });
  };

  // Hiển thị toast thông báo tạm thời
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2500);
  };

  const handleCopySuccess = (code: string) => {
    showToast(`Đã sao chép mã "${code}" vào clipboard!`);
  };

  return (
    <div className="w-full">
      {/* Breadcrumb điều hướng */}
      <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="size-3.5 text-slate-400" />
        <span className="font-semibold text-ink">Mã giảm giá</span>
      </nav>

      {/* Header tiêu đề: "Mã giảm giá" đậm có nét highlight vàng #FFD600 bên dưới chữ */}
      <div className="mb-8">
        <div className="relative inline-block">
          <h1 className="relative z-10 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mã giảm giá
          </h1>
          {/* Nét highlight vàng (#FFD600) phía dưới chữ */}
          <span
            className="absolute bottom-1 left-0 z-0 h-3 w-full rounded-full bg-[#FFD600] opacity-95"
            aria-hidden="true"
          />
        </div>
        <p className="mt-2 text-sm text-[#8E95A5] font-medium">
          Lưu về ví, dùng khi thanh toán
        </p>
      </div>

      {/* Lưới card: 5 cột trên desktop, 2 cột tablet, 1 cột mobile; khoảng cách đều ~24px (gap-6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {MOCK_VOUCHERS.map((voucher) => (
          <VoucherCard
            key={voucher.id}
            voucher={voucher}
            isSaved={savedIds.includes(voucher.id)}
            onToggleSave={handleToggleSave}
            onCopySuccess={handleCopySuccess}
          />
        ))}
      </div>

      {/* Toast thông báo góc dưới phải */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 px-5 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-sm animate-fadeIn">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default VoucherView;

