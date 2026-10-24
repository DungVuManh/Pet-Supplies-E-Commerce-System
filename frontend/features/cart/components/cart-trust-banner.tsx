"use client";

import React from "react";

export function CartTrustBanner() {
  return (
    <div className="rounded-2xl border border-blue-100 bg-[#f0f6ff] p-5 flex items-start gap-3.5">
      <div className="size-6 shrink-0 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">
        i
      </div>
      <div>
        <h4 className="text-sm font-bold text-blue-900">
          Yên tâm mua sắm tại Petly
        </h4>
        <p className="mt-0.5 text-xs text-blue-800/80 leading-relaxed">
          Sản phẩm chính hãng, đóng gói cẩn thận. Bạn có thể điều chỉnh giỏ hàng trước khi đặt hàng.
        </p>
      </div>
    </div>
  );
}
