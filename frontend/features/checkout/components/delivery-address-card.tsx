"use client";

import React from "react";
import type { CheckoutAddress } from "../services/checkout.service";

type DeliveryAddressCardProps = {
  address: CheckoutAddress;
  onChangeClick?: () => void;
};

export function DeliveryAddressCard({
  address,
  onChangeClick,
}: DeliveryAddressCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink mb-4">1. Địa chỉ giao hàng</h2>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {/* Icon vị trí ghim */}
          <div className="size-8 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mt-0.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>

          <div>
            <p className="font-semibold text-sm text-ink">
              {address.recipientName} · {address.phone}
            </p>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              {address.street},{address.ward},{address.district},{address.province}
            </p>
          </div>
        </div>

        {/* Nút thay đổi */}
        <button
          type="button"
          onClick={onChangeClick}
          className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors pt-0.5"
        >
          Thay đổi
        </button>
      </div>
    </div>
  );
}
