"use client";

// =============================================================
// features/checkout/components/voucher-wallet-modal.tsx
// Modal chọn mã giảm giá từ Ví voucher cá nhân tại Checkout & Giỏ hàng
// Tự động phân tích và đưa mã có mức giảm cao nhất ("Tốt nhất") lên đầu
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { X, Sparkles, Check, AlertCircle, Ticket, ArrowRight } from "lucide-react";
import type { CustomerVoucherItem } from "@/features/vouchers/types/customer-voucher";
import { listCustomerVouchersApi } from "@/features/vouchers/services/customer-voucher.service";
import { fetchPromotions, formatVND, promotionToVoucherItem } from "@/features/vouchers/services/voucher.service";
import { useAuth } from "@/features/auth/auth-provider";
import { getGuestSavedVouchers } from "@/lib/voucher-storage";

interface VoucherWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  selectedCode?: string;
  onSelectVoucher: (code: string) => void;
}

interface EvaluatedVoucher {
  voucher: CustomerVoucherItem;
  isEligible: boolean;
  missingAmount: number;
  potentialDiscount: number;
  isBest: boolean;
}

export function VoucherWalletModal({
  isOpen,
  onClose,
  subtotal,
  selectedCode,
  onSelectVoucher,
}: VoucherWalletModalProps) {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<CustomerVoucherItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadWalletVouchers() {
      setIsLoading(true);
      setError(null);

      try {
        if (user) {
          const res = await listCustomerVouchersApi({ status: "ready", subtotal });
          if (isMounted) {
            setVouchers(res.items || []);
          }
        } else {
          // Guest mode: get guest saved codes and match with public promotions
          const guestCodes = getGuestSavedVouchers();
          if (guestCodes.length === 0) {
            if (isMounted) setVouchers([]);
            return;
          }
          const promotions = await fetchPromotions();
          const matched = (promotions || [])
            .filter((p) => guestCodes.includes(p.code.toUpperCase()) && p.isActive)
            .map((p) => ({
              _id: p._id,
              voucherId: p._id,
              code: p.code,
              name: p.name || "",
              type: p.type,
              value: p.value,
              maxDiscount: p.maxDiscount,
              minOrderAmount: p.minOrderAmount || 0,
              startAt: p.startAt,
              endAt: p.endAt,
              endDate: p.endAt ? new Date(p.endAt).toISOString().slice(0, 10) : "Không giới hạn",
              savedAt: new Date().toISOString(),
              state: "ready" as const,
              isApplicable: subtotal >= (p.minOrderAmount || 0),
            }));
          if (isMounted) {
            setVouchers(matched);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Không thể tải danh sách mã từ ví.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadWalletVouchers();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user, subtotal]);

  // Evaluate eligibility, compute discount, and pick the BEST voucher
  const evaluatedList = useMemo<EvaluatedVoucher[]>(() => {
    if (vouchers.length === 0) return [];

    const list = vouchers.map((v) => {
      const minOrder = v.minOrderAmount || 0;
      const isEligible = subtotal >= minOrder;
      const missingAmount = Math.max(0, minOrder - subtotal);

      let potentialDiscount = 0;
      if (isEligible) {
        if (v.type === "percent") {
          const raw = Math.floor((subtotal * v.value) / 100);
          potentialDiscount = v.maxDiscount != null ? Math.min(raw, v.maxDiscount) : raw;
        } else {
          potentialDiscount = Math.min(v.value, subtotal);
        }
      }

      return {
        voucher: v,
        isEligible,
        missingAmount,
        potentialDiscount,
        isBest: false,
      };
    });

    // Find best among eligible vouchers
    let maxDiscount = 0;
    let bestIndex = -1;

    list.forEach((item, idx) => {
      if (item.isEligible && item.potentialDiscount > maxDiscount) {
        maxDiscount = item.potentialDiscount;
        bestIndex = idx;
      }
    });

    if (bestIndex !== -1 && maxDiscount > 0) {
      list[bestIndex].isBest = true;
    }

    // Sort: Best first, then eligible by discount desc, then ineligible
    return list.sort((a, b) => {
      if (a.isBest) return -1;
      if (b.isBest) return 1;
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      if (a.isEligible && b.isEligible) {
        return b.potentialDiscount - a.potentialDiscount;
      }
      return a.missingAmount - b.missingAmount;
    });
  }, [vouchers, subtotal]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Ticket className="size-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Chọn từ Ví voucher</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && (
            <div className="py-12 text-center">
              <div className="inline-block size-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-2 text-xs text-slate-500">Đang tìm mã ưu đãi trong ví...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-xl bg-rose-50 p-4 text-center text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          {!isLoading && !error && evaluatedList.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
                <Ticket className="size-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Ví voucher của bạn đang trống</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                Bạn chưa lưu mã giảm giá nào còn hiệu lực. Hãy truy cập trang Khuyến mãi để lưu mã nhé!
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            evaluatedList.map(({ voucher, isEligible, missingAmount, potentialDiscount, isBest }) => {
              const isSelected = selectedCode?.toUpperCase() === voucher.code.toUpperCase();
              const isPercent = voucher.type === "percent";
              const discountText = isPercent ? `${voucher.value}%` : formatVND(voucher.value);

              return (
                <div
                  key={voucher.code}
                  className={`relative rounded-xl border p-4 transition-all ${
                    isBest
                      ? "border-amber-400 bg-amber-50/40 shadow-xs ring-1 ring-amber-400/50"
                      : isEligible
                      ? "border-slate-200 bg-white hover:border-blue-300"
                      : "border-slate-200 bg-slate-50/60 opacity-60"
                  }`}
                >
                  {/* "Tốt nhất" badge */}
                  {isBest && (
                    <div className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-xs">
                      <Sparkles className="size-3" />
                      <span>Giảm nhiều nhất</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">{discountText}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
                          {voucher.code}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 line-clamp-1">
                        {voucher.name || `Giảm ${discountText} cho đơn từ ${formatVND(voucher.minOrderAmount)}`}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Đơn tối thiểu {formatVND(voucher.minOrderAmount)} • HSD {voucher.endDate}
                      </p>
                      {isEligible && potentialDiscount > 0 && (
                        <p className="text-xs font-bold text-emerald-600">
                          Tiết kiệm: {formatVND(potentialDiscount)}
                        </p>
                      )}
                      {!isEligible && (
                        <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                          <AlertCircle className="size-3 shrink-0" />
                          Cần mua thêm {formatVND(missingAmount)} để áp dụng
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 pt-1">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                          <Check className="size-3.5" />
                          Đang dùng
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!isEligible}
                          onClick={() => {
                            onSelectVoucher(voucher.code);
                            onClose();
                          }}
                          className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                            isEligible
                              ? isBest
                                ? "bg-amber-600 text-white shadow-xs hover:bg-amber-700 cursor-pointer"
                                : "bg-blue-600 text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          Áp dụng
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Tự động tính giảm giá tốt nhất cho bạn</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

