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
import { ChevronRight } from "lucide-react";


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
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Breadcrumb */}
      <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-brand transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="size-3.5 text-slate-400" />
        <Link href="/account/profile" className="hover:text-brand transition-colors">
          Tài khoản
        </Link>
        <ChevronRight className="size-3.5 text-slate-400" />
        <span className="font-semibold text-ink">Đơn hàng </span>
      </nav>
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Cột trái: Sidebar tài khoản */}
        <AccountSidebar />

        {/* Cột phải: Nội dung Đơn hàng của tôi */}
        <div className="flex-1 min-w-0">


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
export { OrderTrackingView } from "./components/order-tracking-view";
