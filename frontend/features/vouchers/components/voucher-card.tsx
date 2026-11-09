"use client";

// =============================================================
// features/vouchers/components/voucher-card.tsx
// Component thẻ mã giảm giá (Voucher Card)
// Có hiệu ứng răng cưa tròn (scalloped edge) bằng CSS radial-gradient
// =============================================================

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { VoucherItem } from "../types";

type VoucherCardProps = {
  voucher: VoucherItem;
  isSaved?: boolean;
  onToggleSave?: (code: string) => void;
  onCopySuccess?: (code: string) => void;
};

// Cấu hình màu sắc theo loại mã giảm giá
const VOUCHER_THEMES = {
  "TOÀN SÀN": {
    headerBg: "#6B00FF", // Tím
    tagBg: "#FFE600", // Vàng
    tagText: "#000000",
  },
  "PHÍ SHIP": {
    headerBg: "#0B4DFF", // Xanh dương
    tagBg: "#FFE600", // Vàng
    tagText: "#000000",
  },
  "SẢN PHẨM": {
    headerBg: "#FF8A14", // Cam
    tagBg: "#0B4DFF", // Xanh dương
    tagText: "#FFFFFF",
  },
};

export function VoucherCard({
  voucher,
  isSaved = false,
  onToggleSave,
  onCopySuccess,
}: VoucherCardProps) {
  const [copied, setCopied] = useState(false);
  const theme = VOUCHER_THEMES[voucher.type] || VOUCHER_THEMES["TOÀN SÀN"];

  const isExpiringSoon = React.useMemo(() => {
    if (!voucher.raw?.endAt) return false;
    const end = new Date(voucher.raw.endAt).getTime();
    const now = Date.now();
    const diff = end - now;
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [voucher.raw?.endAt]);

  // Sao chép mã vào clipboard
  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      if (onCopySuccess) onCopySuccess(voucher.code);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback nếu trình duyệt chặn clipboard API
      const input = document.createElement("input");
      input.value = voucher.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      if (onCopySuccess) onCopySuccess(voucher.code);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Bấm lưu mã giảm giá (Lưu 1 chiều, không thể hủy lưu)
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) return;
    if (onToggleSave) {
      onToggleSave(voucher.code);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-[24px] bg-[#F3F4FA] overflow-hidden shadow-xs hover:shadow-md transition-all duration-300">
      {/* 1. PHẦN TRÊN CÓ MÀU THEO LOẠI */}
      <div
        className="relative pt-3.5 pb-6 px-4 text-white select-none"
        style={{
          backgroundColor: theme.headerBg,
          // Hiệu ứng răng cưa tròn (scalloped edge) bằng CSS radial-gradient ở mép dưới
          maskImage:
            "radial-gradient(circle at 7px 100%, transparent 0, transparent 3.5px, black 4px)",
          WebkitMaskImage:
            "radial-gradient(circle at 7px 100%, transparent 0, transparent 3.5px, black 4px)",
          maskSize: "14px 100%",
          WebkitMaskSize: "14px 100%",
          maskRepeat: "repeat-x",
          WebkitMaskRepeat: "repeat-x",
        }}
      >
        {/* Hàng trên: Tag loại mã & Logo paddy */}
        <div className="flex items-center justify-between">
          {/* Tag nhỏ góc trên trái */}
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest shadow-xs"
              style={{
                backgroundColor: theme.tagBg,
                color: theme.tagText,
              }}
            >
              {voucher.type}
            </span>
            {isExpiringSoon && (
              <span className="inline-flex items-center rounded-full bg-rose-500 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-xs animate-pulse">
                Sắp hết hạn
              </span>
            )}
          </div>

          {/* Logo paddy góc trên phải */}
          <span className="font-extrabold text-[17px] tracking-tight text-white lowercase">
            petjoy
          </span>
        </div>

        {/* Giá trị giảm cỡ lớn kèm nhãn nhỏ GIẢM / SHIP */}
        <div className="mt-3.5 flex items-baseline gap-1.5">
          <span className="text-[26px] sm:text-[30px] font-black leading-none tracking-tight text-white">
            {voucher.value}
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-white/95">
            {voucher.valueLabel}
          </span>
        </div>

        {/* Dòng phụ tối đa xx.000đ (nếu có, để min-height để giữ card đều nhau) */}
        <div className="mt-1 min-h-[16px]">
          {voucher.maxDiscount ? (
            <p className="text-[11px] font-medium text-white/90 leading-tight">
              {voucher.maxDiscount}
            </p>
          ) : (
            <div className="h-[16px]" />
          )}
        </div>

        {/* Dải răng cưa tròn bổ trợ (CSS radial-gradient) tạo đường viền sắc nét ở mép dưới */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 7px 8px, #F3F4FA 0, #F3F4FA 3.5px, transparent 4px)",
            backgroundSize: "14px 8px",
            backgroundRepeat: "repeat-x",
          }}
          aria-hidden="true"
        />
      </div>

      {/* 2. PHẦN THÂN CARD (Nền #F3F4FA) */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 pt-3">
        {/* Tên khuyến mãi (đậm, tối đa 2 dòng) */}
        <h3
          title={voucher.title}
          className="font-bold text-slate-900 text-[13px] sm:text-sm leading-snug line-clamp-2 h-[38px] mb-3"
        >
          {voucher.title}
        </h3>

        {/* Hàng điều kiện: "Từ xxx.000đ" bên trái và hạn dùng bên phải */}
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#8E95A5] mb-4 font-medium">
          <span>{voucher.minOrder}</span>
          <span>{voucher.validUntil}</span>
        </div>

        {/* Dưới cùng: Pill chứa mã và Nút Lưu */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
          <div className="flex rounded-[30px] border-radius-[30px]  font-bold  border border-indigo bg-purple-500 px-5 py-1.5">
            <span>{voucher.code}</span>
          </div>

          {/* Nút Lưu xanh dương bo tròn (chỉ lưu 1 lần, khi đã lưu sẽ khóa cố định) */}
          <button
            type="button"
            disabled={isSaved}
            onClick={handleSave}
            title={isSaved ? "Mã giảm giá đã có trong ví của bạn" : "Nhấn để lưu mã vào ví"}
            className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              isSaved
                ? "bg-[#E2E8F0] text-[#64748B] cursor-default opacity-90 shadow-none pointer-events-none select-none"
                : "bg-[#0B4DFF] text-white shadow-xs hover:bg-blue-700 active:scale-95 cursor-pointer"
            }`}
          >
            {isSaved ? "Đã lưu" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoucherCard;
