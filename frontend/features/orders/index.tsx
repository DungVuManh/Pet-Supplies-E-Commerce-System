"use client";

// =============================================================
// features/orders/index.tsx
// Màn hình "Đơn hàng của tôi" - Gọi API từ MongoDB, không dùng mock data
// =============================================================

import Link from "next/link";
import React from "react";
import { AccountSidebar } from "./components/account-sidebar";
import { OrdersSearchBar } from "./components/orders-search-bar";
import { OrdersStatusTabs } from "./components/orders-status-tabs";
import { OrdersTable } from "./components/orders-table";
import { useOrdersPage } from "./hooks/use-orders-page";

export function OrdersView() {
  // Lấy toàn bộ logic từ hook: gọi API, lọc, đếm, loading...
  const {
    isLoading,
    error,
    filteredOrders,
    counts,
    activeStatus,
    setActiveStatus,
    searchQuery,
    setSearchQuery,
    totalOrders,
  } = useOrdersPage();

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

          {/* Tiêu đề trang */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Đơn hàng của tôi
            </h1>
            <p className="text-xs text-muted mt-1">
              Theo dõi hành trình giao hàng và quản lý các đơn mua của bạn.
            </p>
          </div>

          {/* Hiển thị lỗi nếu gọi API thất bại */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

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

          {/* Loading khi đang gọi API */}
          {isLoading ? (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center text-sm text-muted">
              Đang tải đơn hàng...
            </div>
          ) : (
            <OrdersTable
              orders={filteredOrders}
              totalOrders={totalOrders}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default OrdersView;
export { OrderDetailView } from "./components/order-detail-view";
export { OrderCancelView } from "./components/order-cancel-view";
