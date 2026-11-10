"use client";

import { Tag, Copy, Check } from "lucide-react";
import { voucherCapLabel, voucherMinimumLabel, voucherValueLabel } from "@/lib/voucher";
import { useVoucherBar } from "../hooks/use-voucher-bar";

export function VoucherBar() {
  const { vouchers, copiedCode, handleCopy } = useVoucherBar();

  if (vouchers.length === 0) return null;

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
          {vouchers.map((v) => {
            const isCopied = copiedCode === v.code;
            return (
              <div
                key={v.code}
                className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-canvas p-3 transition-colors hover:border-brand/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs font-bold uppercase tracking-wider text-brand">
                    {v.code}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink leading-snug">Giảm {voucherValueLabel(v)}</p>
                  <p className="text-[11px] text-muted">{[voucherMinimumLabel(v), voucherCapLabel(v)].filter(Boolean).join(" · ")}</p>
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
