"use client";

import React from "react";
import type { PaymentMethodType } from "../types";

type PaymentMethodCardProps = {
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
};

export function PaymentMethodCard({
  selectedMethod,
  onSelectMethod,
}: PaymentMethodCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink mb-4">
        2. Phương thức thanh toán
      </h2>

      <div className="space-y-3">
        {/* Tùy chọn 1: Chuyển khoản VietQR qua SePay */}
        <div
          onClick={() => onSelectMethod("sepay")}
          className={`rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${selectedMethod === "sepay"
            ? "border-2 border-blue-500 bg-[#f8fbff]"
            : "border border-line bg-surface hover:border-gray-300"
            }`}
        >
          {/* Radio indicator */}
          <div
            className={`size-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selectedMethod === "sepay" ? "border-blue-600" : "border-gray-300"
              }`}
          >
            {selectedMethod === "sepay" && (
              <div className="size-2.5 rounded-full bg-blue-600" />
            )}
          </div>

          {/* Icon QR / Ngân hàng */}
          <div className="text-blue-600 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="5" height="5" x="3" y="3" rx="1" />
              <rect width="5" height="5" x="16" y="3" rx="1" />
              <rect width="5" height="5" x="3" y="16" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
              <path d="M21 21v.01" />
              <path d="M12 7v3a2 2 0 0 1-2 2H7" />
              <path d="M3 12h.01" />
              <path d="M12 3h.01" />
              <path d="M12 16v.01" />
              <path d="M16 12h1" />
              <path d="M21 12v.01" />
              <path d="M12 21v-1" />
            </svg>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-ink">
                Chuyển khoản ngân hàng (VietQR qua SePay)
              </p>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-200">
                Tự động
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Quét mã QR tự động trên ứng dụng Mobile Banking (VCB, MB, TCB,...)
            </p>
          </div>
        </div>

        {/* Tùy chọn 2: VNPay */}
        {/* <div
          onClick={() => onSelectMethod("vnpay")}
          className={`rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${selectedMethod === "vnpay"
            ? "border-2 border-blue-500 bg-[#f8fbff]"
            : "border border-line bg-surface hover:border-gray-300"
            }`}
        > */}
        {/* Radio indicator */}
        {/* <div
            className={`size-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selectedMethod === "vnpay" ? "border-blue-600" : "border-gray-300"
              }`}
          >
            {selectedMethod === "vnpay" && (
              <div className="size-2.5 rounded-full bg-blue-600" />
            )}
          </div> */}

        {/* Icon thẻ ngân hàng */}
        {/* <div className="text-ink shrink-0">
      <svg
       xmlns="http://www.w3.org/2000/svg"
       width="22"
       height="22"
       viewBox="0 0 24 24"
       fill="none"
       stroke="currentColor"
       strokeWidth="1.8"
       strokeLinecap="round"
       strokeLinejoin="round"
      >
       <rect width="20" height="14" x="2" y="5" rx="2" />
       <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
     </div>

     <div>
      <p className="font-semibold text-sm text-ink">Thanh toán qua VNPay</p>
      <p className="text-xs text-muted mt-0.5">
       Thẻ ngân hàng quốc tế hoặc nội địa
      </p>
     </div> */}
        {/* </div> */}

        {/* Tùy chọn 3: COD */}
        <div
          onClick={() => onSelectMethod("cod")}
          className={`rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${selectedMethod === "cod"
            ? "border-2 border-blue-500 bg-[#f8fbff]"
            : "border border-line bg-surface hover:border-gray-300"
            }`}
        >
          {/* Radio indicator */}
          <div
            className={`size-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selectedMethod === "cod" ? "border-blue-600" : "border-gray-300"
              }`}
          >
            {selectedMethod === "cod" && (
              <div className="size-2.5 rounded-full bg-blue-600" />
            )}
          </div>

          {/* Icon tiền mặt */}
          <div className="text-ink shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="12" x="2" y="6" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </div>

          <div>
            <p className="font-semibold text-sm text-ink">
              Thanh toán khi nhận hàng (COD)
            </p>
            <p className="text-xs text-muted mt-0.5">
              Thanh toán tiền mặt cho đơn vị vận chuyển
            </p>
          </div>
        </div>
      </div>
    </div >
  );
}
