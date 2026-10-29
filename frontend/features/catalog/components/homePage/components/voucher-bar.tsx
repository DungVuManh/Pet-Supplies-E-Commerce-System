"use client";

import { Tag, Copy, Check } from "lucide-react";
import type { VoucherItem } from "../types";
import { useVoucherBar } from "../hooks/use-voucher-bar";

const VOUCHERS: readonly VoucherItem[] = [
  {
    code: "PETJOY10",
    discount: "Giảm 10%",
    condition: "Đơn từ 0đ · Tối đa 50k",
    badge: "Thành viên mới",
  },
  {
    code: "FREESHIP",
    discount: "Freeship 30K",
    condition: "Áp dụng đơn từ 250k",
    badge: "Toàn quốc",
  },
  {
    code: "PET50K",
    discount: "Giảm 50.000đ",
    condition: "Áp dụng đơn từ 500k",
    badge: "Hot Deal",
  },
] as const;

export function VoucherBar() {
  const { copiedCode, handleCopy } = useVoucherBar();

  return (
    <section aria-label="Mã giảm giá độc quyền" className="w-full">
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-subtle text-brand">
              <Tag className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-ink sm:text-base">
              Mã giảm giá độc quyền
            </h2>
          </div>
          <span className="text-xs text-muted">Lưu mã, nhập khi thanh toán để nhận ưu đãi</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {VOUCHERS.map((v) => {
            const isCopied = copiedCode === v.code;
            return (
              <div
                key={v.code}
                className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-canvas p-3 transition-colors hover:border-brand/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand">
                      {v.code}
                    </span>
                    <span className="rounded bg-brand-subtle px-1.5 py-0.2 text-[10px] font-semibold text-brand">
                      {v.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-ink leading-snug">{v.discount}</p>
                  <p className="text-[11px] text-muted">{v.condition}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(v.code)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    isCopied
                      ? "bg-emerald-600 text-white"
                      : "bg-surface border border-line text-ink hover:border-brand hover:text-brand"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3.5" />
                      Đã lưu
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Sao chép
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
