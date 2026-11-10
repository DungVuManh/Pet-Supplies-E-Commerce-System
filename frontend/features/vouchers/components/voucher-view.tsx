"use client";

// =============================================================
// features/vouchers/components/voucher-view.tsx
// Màn hình "Mã giảm giá" - Fetch API Promotion model từ Database
// Dùng useEffect, hỗ trợ lưu mã vào ví và lọc tab "Tất cả" / "Mã đã lưu"
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronRight, CheckCircle2, Bookmark, Sparkles } from "lucide-react";
import { VoucherCard } from "./voucher-card";
import { PromotionBanners } from "./promotion-banners";
import type { VoucherItem } from "../types";
import { fetchPromotions, promotionToVoucherItem } from "../services/voucher.service";
import { useCustomerVouchers } from "../hooks/use-customer-vouchers";
import { useAuth } from "@/features/auth/auth-provider";

type VoucherFilterTab = "all" | "saved";

export function VoucherView() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // State lưu danh sách voucher lấy trực tiếp từ API Promotion model
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<VoucherFilterTab>("all");

  // Hook quản lý ví voucher người dùng
  const { savedCodes, isSaved, toggleSaveVoucher } = useCustomerVouchers();

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

  // Xử lý lưu voucher (yêu cầu đăng nhập, chỉ lưu 1 lần)
  const handleToggleSave = async (code: string) => {
    // 1. Nếu chưa đăng nhập: chuyển hướng ngay sang trang đăng nhập
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || "/voucher")}`);
      return;
    }

    // 2. Nếu đã lưu rồi: không làm gì
    if (isSaved(code)) {
      return;
    }

    // 3. Nếu đã đăng nhập: thực hiện lưu vào ví
    try {
      const nowSaved = await toggleSaveVoucher(code);
      if (nowSaved) {
        showToast(`Đã lưu mã ${code} vào ví!`);
      }
    } catch (err: any) {
      showToast(err.message || "Không thể cập nhật ví voucher.");
    }
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

  // Lọc voucher hiển thị theo tab
  const displayedVouchers = useMemo(() => {
    if (currentTab === "saved") {
      return vouchers.filter((v) => isSaved(v.code));
    }
    return vouchers;
  }, [vouchers, currentTab, isSaved]);

  const savedCount = useMemo(() => {
    return vouchers.filter((v) => isSaved(v.code)).length;
  }, [vouchers, isSaved]);

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

      {/* 1. KHỐI 3 BANNER QUẢNG CÁO: KHUYẾN MÃI & ƯU ĐÃI */}
      <PromotionBanners />

      {/* 2. KHỐI DANH SÁCH MÃ GIẢM GIÁ */}
      <section>
        {/* Header tiêu đề */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
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

          {/* Tab chuyển đổi: Tất cả mã vs Mã đã lưu */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentTab("all")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                currentTab === "all"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>Tất cả mã</span>
              <span className="ml-1 rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] text-slate-700">
                {vouchers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("saved")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                currentTab === "saved"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bookmark className="size-3.5" />
              <span>Mã đã lưu</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  savedCount > 0
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-200/80 text-slate-700"
                }`}
              >
                {savedCount}
              </span>
            </button>
          </div>
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

        {/* Trạng thái Rỗng chung */}
        {!isLoading && !errorMessage && vouchers.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-[#8E95A5]">Hiện chưa có mã giảm giá nào đang áp dụng.</p>
          </div>
        )}

        {/* Trạng thái Rỗng riêng cho tab Mã đã lưu */}
        {!isLoading && !errorMessage && vouchers.length > 0 && currentTab === "saved" && displayedVouchers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
              <Bookmark className="size-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Bạn chưa lưu mã giảm giá nào</h3>
            <p className="mt-1 text-sm text-[#8E95A5] max-w-md mx-auto">
              Hãy nhấn nút "Lưu" trên các mã ưu đãi để thêm vào ví và áp dụng nhanh khi thanh toán.
            </p>
            <button
              type="button"
              onClick={() => setCurrentTab("all")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Khám phá mã giảm giá
            </button>
          </div>
        )}

        {/* Lưới card: 5 cột trên desktop, 2 cột tablet, 1 cột mobile */}
        {!isLoading && !errorMessage && displayedVouchers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {displayedVouchers.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                isSaved={isSaved(voucher.code)}
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
