"use client";

// =============================================================
// features/account/components/vouchers/customer-vouchers-view.tsx
// Màn hình trang Ví voucher trong Quản lý tài khoản (/account/vouchers)
// =============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ticket,
  Search,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  History,
  AlertCircle,
} from "lucide-react";
import { CustomerVoucherCard } from "./customer-voucher-card";
import type {
  CustomerVoucherItem,
  CustomerVoucherCounts,
  CustomerVoucherTab,
} from "@/features/vouchers/types/customer-voucher";
import {
  listCustomerVouchersApi,
  removeVoucherApi,
} from "@/features/vouchers/services/customer-voucher.service";

type ActiveTab = "ready" | "used" | "expired";

export function CustomerVouchersView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("ready");
  const [items, setItems] = useState<CustomerVoucherItem[]>([]);
  const [counts, setCounts] = useState<CustomerVoucherCounts>({
    all: 0,
    ready: 0,
    used: 0,
    expired: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchVouchers = useCallback(async (tab: ActiveTab) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await listCustomerVouchersApi({ status: tab });
      setItems(res.items || []);
      setCounts(res.counts || { all: 0, ready: 0, used: 0, expired: 0 });
    } catch (err: any) {
      console.error("[CustomerVouchersView] Lỗi tải ví voucher:", err);
      setErrorMessage(err.message || "Không thể tải danh sách ví voucher.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVouchers(activeTab);
  }, [activeTab, fetchVouchers]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((cur) => (cur === message ? null : cur));
    }, 2500);
  };

  const handleRemove = async (code: string) => {
    try {
      await removeVoucherApi(code);
      setItems((prev) => prev.filter((i) => i.code !== code));
      setCounts((prev) => ({
        ...prev,
        all: Math.max(0, prev.all - 1),
        [activeTab]: Math.max(0, prev[activeTab] - 1),
      }));
      showToast(`Đã bỏ lưu mã "${code}" khỏi ví.`);
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xóa mã giảm giá.");
    }
  };

  const handleCopySuccess = (code: string) => {
    showToast(`Đã sao chép mã "${code}" vào clipboard!`);
  };

  // Filter by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        (item.name && item.name.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="size-6 text-blue-600" />
            Ví voucher của tôi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Quản lý và sử dụng các mã giảm giá bạn đã lưu
          </p>
        </div>

        <Link
          href="/voucher"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-blue-50 text-blue-700 px-4 py-2 text-xs font-bold hover:bg-blue-100 transition-colors"
        >
          <Sparkles className="size-4" />
          <span>Khám phá thêm voucher</span>
        </Link>
      </div>

      {/* 3 Tabs & Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("ready")}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "ready"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingBag className="size-3.5" />
            <span>Có hiệu lực</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "ready"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {counts.ready}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("used")}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "used"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="size-3.5" />
            <span>Đã sử dụng</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "used"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {counts.used}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("expired")}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "expired"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertCircle className="size-3.5" />
            <span>Hết hiệu lực</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "expired"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {counts.expired}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mã..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center">
          <div className="inline-block size-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-500">Đang tải mã giảm giá...</p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
          <button
            type="button"
            onClick={() => fetchVouchers(activeTab)}
            className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && filteredItems.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
            <Ticket className="size-6" />
          </div>
          {searchQuery ? (
            <>
              <h3 className="text-sm font-bold text-slate-800">
                Không tìm thấy mã nào phù hợp với "{searchQuery}"
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Vui lòng thử tìm kiếm với từ khóa hoặc mã khác.
              </p>
            </>
          ) : activeTab === "ready" ? (
            <>
              <h3 className="text-sm font-bold text-slate-800">
                Ví của bạn chưa có mã giảm giá nào còn hiệu lực
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Hãy khám phá trang khuyến mãi và bấm "Lưu" để thu thập những ưu đãi hấp dẫn nhất.
              </p>
              <Link
                href="/voucher"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                Khám phá mã giảm giá
              </Link>
            </>
          ) : activeTab === "used" ? (
            <>
              <h3 className="text-sm font-bold text-slate-800">
                Chưa có mã giảm giá nào đã sử dụng
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Các mã giảm giá bạn đã áp dụng cho đơn hàng sẽ hiển thị tại đây.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-800">
                Không có mã giảm giá nào hết hiệu lực
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Các mã đã quá hạn sử dụng sẽ hiển thị tại đây trong vòng 30 ngày.
              </p>
            </>
          )}
        </div>
      )}

      {/* Grid of Voucher Cards */}
      {!isLoading && !errorMessage && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((voucher) => (
            <CustomerVoucherCard
              key={voucher._id || voucher.code}
              voucher={voucher}
              onRemove={handleRemove}
              onCopySuccess={handleCopySuccess}
            />
          ))}
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 px-5 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-sm animate-fadeIn">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default CustomerVouchersView;

