"use client";

// =============================================================
// features/orders/components/order-timeline.tsx
// Thanh tiến trình trạng thái đơn hàng (Đã đặt hàng -> Chuẩn bị -> Đang giao -> Hoàn thành)
// =============================================================

import React from "react";
import type { OrderTimelineStep } from "../types";

type OrderTimelineProps = {
  steps: OrderTimelineStep[];
};

export function OrderTimeline({ steps }: OrderTimelineProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between relative">
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Điểm mốc trạng thái */}
              <div className="flex flex-col items-center text-center relative z-10 min-w-28">
                {/* Vòng tròn biểu tượng */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : isActive
                      ? "border-2 border-blue-600 bg-surface text-blue-600"
                      : "border-2 border-line bg-surface text-muted"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-line" />
                  )}
                </div>

                {/* Tên bước */}
                <span
                  className={`mt-2 text-xs font-semibold ${
                    isCompleted || isActive ? "text-ink" : "text-muted"
                  }`}
                >
                  {step.title}
                </span>

                {/* Thời gian / Ghi chú */}
                <span className="text-[11px] text-muted mt-0.5 whitespace-nowrap">
                  {step.description}
                </span>
              </div>

              {/* Đường nối giữa các bước */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 bg-line -mt-8 relative">
                  <div
                    className={`h-full transition-all ${
                      isCompleted ? "bg-blue-600" : "bg-line"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
