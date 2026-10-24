"use client";

import React from "react";

type PromoCodeCardProps = {
  value: string;
  onChange: (val: string) => void;
  onApply: () => void;
  message: string;
  isError: boolean;
};

export function PromoCodeCard({
  value,
  onChange,
  onApply,
  message,
  isError,
}: PromoCodeCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-base font-bold text-ink">Mã ưu đãi</h3>

      <div className="mt-4">
        <label
          htmlFor="promo-input"
          className="block text-sm font-medium text-ink mb-2"
        >
          Nhập mã của bạn
        </label>
        <input
          id="promo-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ví dụ: PETLY10"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />

        <button
          type="button"
          onClick={onApply}
          className="mt-3 w-full rounded-xl border border-line bg-surface py-3 px-4 text-center text-sm font-semibold text-ink hover:bg-gray-50 transition-colors"
        >
          Áp dụng
        </button>

        <p
          className={`mt-3 text-xs ${
            isError ? "text-red-500" : "text-muted"
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
