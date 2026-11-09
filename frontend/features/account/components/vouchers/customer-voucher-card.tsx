"use client";

// =============================================================
// features/account/components/vouchers/customer-voucher-card.tsx
// Component thẻ voucher trong trang Ví voucher của khách hàng
// =============================================================

import React, { useState } from "react";
import Link from "next/link";
import { Check, Copy, Trash2, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import type { CustomerVoucherItem } from "@/features/vouchers/types/customer-voucher";
import { formatVND } from "@/features/vouchers/services/voucher.service";

interface CustomerVoucherCardProps {
  voucher: CustomerVoucherItem;
  onRemove?: (code: string) => void;
  onCopySuccess?: (code: string) => void;
}

export function CustomerVoucherCard({
  voucher,
  onRemove,
  onCopySuccess,
}: CustomerVoucherCardProps) {
  const [copied, setCopied] = useState(false);

  const isPercent = voucher.type === "percent";
  const discountDisplay = isPercent ? `${voucher.value}%` : formatVND(voucher.value);
  const isShip = voucher.code.toUpperCase().includes("SHIP");
  const discountLabel = isShip ? "PHÍ SHIP" : "GIẢM GIÁ";

  // Check if expiring in < 24h
  const isExpiringSoon = React.useMemo(() => {
    if (voucher.state !== "ready" || !voucher.endAt) return false;
    const diff = new Date(voucher.endAt).getTime() - Date.now();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [voucher.state, voucher.endAt]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      onCopySuccess?.(voucher.code);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = voucher.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      onCopySuccess?.(voucher.code);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isInactive = voucher.state === "used" || voucher.state === "expired";

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden ${
        isInactive
          ? "border-slate-200 bg-slate-50/70 opacity-75"
          : "border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-blue-200"
      }`}
    >
      {/* Top Banner / Discount Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${
          voucher.state === "ready"
            ? isShip
              ? "bg-blue-600 text-white"
              : "bg-purple-600 text-white"
            : "bg-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight">{discountDisplay}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
            {discountLabel}
          </span>
        </div>

        {/* State / Expiry Badges */}
        <div className="flex items-center gap-1.5">
          {voucher.state === "ready" && isExpiringSoon && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-bold animate-pulse">
              <Clock className="size-3" />
              Sắp hết hạn
            </span>
          )}

          {voucher.state === "ready" && !isExpiringSoon && (
            <span className="inline-flex items-center rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold">
              Có hiệu lực
            </span>
          )}

          {voucher.state === "used" && (
            <span className="inline-flex items-center rounded-full bg-slate-500 text-white px-2 py-0.5 text-[10px] font-bold">
              Đã sử dụng
            </span>
          )}

          {voucher.state === "expired" && (
            <span className="inline-flex items-center rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-bold">
              Hết hiệu lực
            </span>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title / Name */}
          <h4
            title={voucher.name || voucher.code}
            className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mb-2"
          >
            {voucher.name || `Mã giảm giá ${voucher.code}`}
          </h4>

          {/* Details / Conditions */}
          <div className="space-y-1 text-xs text-slate-500 font-medium">
            <p>
              Đơn tối thiểu:{" "}
              <span className="font-semibold text-slate-700">
                {voucher.minOrderAmount > 0 ? formatVND(voucher.minOrderAmount) : "0đ"}
              </span>
            </p>
            {voucher.maxDiscount && (
              <p>
                Giảm tối đa:{" "}
                <span className="font-semibold text-slate-700">
                  {formatVND(voucher.maxDiscount)}
                </span>
              </p>
            )}
            <p className="flex items-center gap-1">
              Hạn dùng: <span className="font-semibold text-slate-700">{voucher.endDate}</span>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Voucher Code Pill with Copy */}
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-800">
            <span>{voucher.code}</span>
            <button
              type="button"
              onClick={handleCopy}
              title="Sao chép mã"
              className="p-0.5 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete / Remove Action */}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(voucher.code)}
                title="Bỏ lưu khỏi ví"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            )}

            {/* Smart Navigation "Dùng ngay" Button */}
            {voucher.state === "ready" && (
              <Link
                href="/products"
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                <span>Dùng ngay</span>
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

