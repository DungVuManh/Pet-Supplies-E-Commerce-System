"use client";

// =============================================================
// features/orders/index.tsx
// Màn hình chính "Đơn hàng của tôi" - Tích hợp toàn bộ components con
// =============================================================

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { AccountSidebar } from "./components/account-sidebar";
import { OrdersSearchBar } from "./components/orders-search-bar";
import { OrdersStatusTabs } from "./components/orders-status-tabs";
import { OrdersTable } from "./components/orders-table";
import { MOCK_CUSTOMER_ORDERS } from "./mock-data";
import type { CustomerOrderStatus } from "./types";

export function OrdersView() {
  const [activeStatus, setActiveStatus] = useState<CustomerOrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(() => {
    return {
      all: MOCK_CUSTOMER_ORDERS.length,
      pending: MOCK_CUSTOMER_ORDERS.filter((o) => o.status === "pending").length,
      shipping: MOCK_CUSTOMER_ORDERS.filter((o) => o.status === "shipping").length,
      completed: MOCK_CUSTOMER_ORDERS.filter((o) => o.status === "completed").length,
      cancelled: MOCK_CUSTOMER_ORDERS.filter((o) => o.status === "cancelled").length,
    };
  }, []);

  const filteredOrders = useMemo(() => {
    return MOCK_CUSTOMER_ORDERS.filter((order) => {
      // Lọc theo tab
      const matchStatus =
        activeStatus === "all" || order.status === activeStatus;

      // Lọc theo từ khóa tìm kiếm (mã đơn hoặc tên sản phẩm)
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        order.orderCode.toLowerCase().includes(query) ||
        order.productsSummary.toLowerCase().includes(query);

      return matchStatus && matchSearch;
    });
  }, [activeStatus, searchQuery]);

  return (
    <div className="container">
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Cột trái: Sidebar tài khoản */}
        <AccountSidebar />

        {/* Cột phải: Nội dung Đơn hàng của tôi */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-muted mb-2 flex items-center gap-1.5">
            <Link href="/" className="hover:text-ink transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="hover:text-ink transition-colors">Tài khoản</span>
            <span>/</span>
            <span className="text-ink font-medium">Đơn hàng</span>
          </nav>

          {/* Tiêu đề trang & mô tả */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Đơn hàng của tôi
            </h1>
            <p className="text-xs text-muted mt-1">
              Theo dõi hành trình giao hàng và quản lý các đơn mua của bạn.
            </p>
          </div>

          {/* Thanh Tab trạng thái */}
          <OrdersStatusTabs
            activeStatus={activeStatus}
            counts={counts}
            onSelectStatus={setActiveStatus}
          />

          {/* Thanh tìm kiếm */}
          <OrdersSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {/* Bảng danh sách đơn hàng */}
          <OrdersTable
            orders={filteredOrders}
            totalOrders={MOCK_CUSTOMER_ORDERS.length}
          />
        </div>
      </div>
    </div>
  );
}

export default OrdersView;
