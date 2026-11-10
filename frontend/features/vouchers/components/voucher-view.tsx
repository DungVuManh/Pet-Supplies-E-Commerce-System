"use client";

// =============================================================
// features/vouchers/components/voucher-view.tsx
// Màn hình "Mã giảm giá" - Fetch API Promotion model từ Database
// Dùng useEffect, chỉ hiển thị tất cả các mã có isActive là true
// =============================================================

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { VoucherCard } from "./voucher-card";
import { PromotionBanners } from "./promotion-banners";
import type { VoucherItem } from "../types";
import { fetchPromotions, promotionToVoucherItem } from "../services/voucher.service";

export function VoucherView() {
  // State lưu danh sách voucher lấy trực tiếp từ API Promotion model
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quản lý danh sách ID voucher đã lưu (lưu vào localStorage)
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch API Promotion model từ Backend dùng useEffect
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadPromotions() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const promotions = await fetchPromotions(controller.signal);

        if (isMounted) {
          // Chỉ lấy tất cả các promotion có isActive: true từ MongoDB
          const activePromotions = (promotions || []).filter(
            (p) => p.isActive === true || (p.isActive as any) === "true"
          );

          // Chuyển đổi dữ liệu model sang định dạng VoucherItem cho thẻ card
          const items = activePromotions.map(promotionToVoucherItem);
          setVouchers(items);
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && isMounted) {
          console.error("Lỗi khi tải mã giảm giá:", err);
          setErrorMessage("Không thể tải danh sách mã giảm giá. Vui lòng thử lại sau.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPromotions();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Thử lại khi gặp lỗi
  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchPromotions()
      .then((promotions) => {
        const activePromotions = (promotions || []).filter(
          (p) => p.isActive === true || (p.isActive as any) === "true"
        );
        setVouchers(activePromotions.map(promotionToVoucherItem));
      })
      .catch((err) => {
        console.error("Lỗi khi thử lại:", err);
        setErrorMessage("Không thể tải danh sách mã giảm giá. Vui lòng thử lại sau.");
      })
      .finally(() => setIsLoading(false));
  };

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
        <span className="font-semibold text-ink">Khuyến mãi & Ưu đãi</span>
      </nav>

      {/* 1. KHỐI 3 BANNER QUẢNG CÁO: KHUYẾN MÃI & ƯU ĐÃI (1 banner lớn phía trên, 2 banner đôi phía dưới) */}
      <PromotionBanners />

      {/* 2. KHỐI DANH SÁCH MÃ GIẢM GIÁ (GỌI TỪ API PROMOTION MODEL THẬT) */}
      <section>
        {/* Header tiêu đề: "Mã giảm giá" đậm có nét highlight vàng #FFD600 bên dưới chữ */}
        <div className="mb-8">
          <div className="relative inline-block">
            <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Mã giảm giá
            </h2>
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

        {/* Trạng thái Loading khi đang fetch API */}
        {isLoading && (
          <div className="py-20 text-center">
            <div className="inline-block size-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm text-[#8E95A5] font-medium">Đang tải mã giảm giá...</p>
          </div>
        )}

        {/* Trạng thái Lỗi */}
        {!isLoading && errorMessage && (
          <div role="alert" className="py-16 text-center">
            <p className="text-sm text-rose-600 font-semibold">{errorMessage}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Trạng thái Rỗng */}
        {!isLoading && !errorMessage && vouchers.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-[#8E95A5]">Hiện chưa có mã giảm giá nào đang áp dụng.</p>
          </div>
        )}

        {/* Lưới card: 5 cột trên desktop, 2 cột tablet, 1 cột mobile; khoảng cách đều ~24px (gap-6) */}
        {!isLoading && !errorMessage && vouchers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {vouchers.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                isSaved={savedIds.includes(voucher.id)}
                onToggleSave={handleToggleSave}
                onCopySuccess={handleCopySuccess}
              />
            ))}
          </div>
        )}
      </section>

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
