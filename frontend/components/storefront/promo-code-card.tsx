"use client";

import type { FormEvent } from "react";

type PromoCodeCardProps = {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
  message: string;
  isError: boolean;
  pending: boolean;
  /** The code in effect and what it takes off, or null. */
  applied: { code: string; discount: number } | null;
};

export function PromoCodeCard({ value, onChange, onApply, onRemove, message, isError, pending, applied }: PromoCodeCardProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) onApply();
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-base font-bold text-ink">Mã ưu đãi</h3>

      {applied ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-subtle px-4 py-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-bold text-brand">{applied.code}</p>
            <p className="mt-0.5 text-xs text-muted">Giảm {applied.discount.toLocaleString("vi-VN")} đ</p>
          </div>
          <button type="button" onClick={onRemove} aria-label={`Bỏ mã ${applied.code}`} className="min-h-10 shrink-0 text-sm font-semibold text-danger hover:underline">
            Bỏ mã
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate aria-busy={pending} className="mt-4">
          <label htmlFor="promo-input" className="mb-2 block text-sm font-medium text-ink">
            Nhập mã của bạn
          </label>
          <input
            id="promo-input"
            type="text"
            value={value}
            maxLength={60}
            autoComplete="off"
            aria-invalid={isError || undefined}
            aria-describedby="promo-message"
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ví dụ: PETJOY10"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-2 focus:outline-offset-2 focus:outline-brand"
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-3 min-h-11 w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Đang kiểm tra…" : "Áp dụng"}
          </button>
        </form>
      )}

      <p id="promo-message" role={isError ? "alert" : "status"} className={`mt-3 text-xs ${isError ? "text-danger" : "text-muted"}`}>
        {message}
      </p>
    </div>
  );
}
