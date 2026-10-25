"use client";

// =============================================================
// features/orders/components/orders-status-tabs.tsx
// Thanh tab lọc theo trạng thái đơn hàng (Tất cả, Chờ xử lý, Đang giao,...)
// =============================================================

import React from "react";
import type { CustomerOrderStatus } from "../types";

type OrdersStatusTabsProps = {
  activeStatus: CustomerOrderStatus;
  counts: Record<CustomerOrderStatus, number>;
  onSelectStatus: (status: CustomerOrderStatus) => void;
};

export function OrdersStatusTabs({
  activeStatus,
  counts,
  onSelectStatus,
}: OrdersStatusTabsProps) {
  const tabs: { key: CustomerOrderStatus; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ xử lý" },
    { key: "shipping", label: "Đang giao" },
    { key: "completed", label: "Hoàn thành" },
    { key: "cancelled", label: "Đã hủy" },
  ];

  return (
    <div className="border-b border-line">
      <nav aria-label="Lọc đơn hàng theo trạng thái" className="flex gap-8 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeStatus === tab.key;
          const count = counts[tab.key] ?? 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectStatus(tab.key)}
              className={`pb-3.5 text-sm font-semibold whitespace-nowrap transition-colors relative ${
                isActive
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-muted hover:text-ink"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </nav>
    </div>
  );
}
