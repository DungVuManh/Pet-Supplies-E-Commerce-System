"use client";

// =============================================================
// features/orders/components/order-detail-view.tsx
// Màn hình Chi tiết đơn hàng - Gọi API từ MongoDB theo orderId
// =============================================================

import Link from "next/link";
import React from "react";
import { AccountSidebar } from "./account-sidebar";
import { OrderDetailItems } from "./order-detail-items";
import { OrderSummarySidebar } from "./order-summary-sidebar";
import { OrderTimeline } from "./order-timeline";
import { useOrderDetail } from "../hooks/use-order-detail";
import { ChevronRight } from "lucide-react";


type OrderDetailViewProps = {
  orderId?: string;
};

export function OrderDetailView({ orderId }: OrderDetailViewProps) {
  // Gọi API lấy chi tiết đơn hàng theo ID
  const { order, isLoading, error, reload } = useOrderDetail(orderId);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Cột trái: Sidebar tài khoản */}
        <AccountSidebar />

        {/* Cột phải: Chi tiết đơn hàng */}
        <div className="flex-1 min-w-0">
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
            <span className="font-semibold text-ink">Đánh giá của tôi</span>
          </nav>

          {/* Đang tải */}
          {isLoading && (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center text-sm text-muted">
              Đang tải chi tiết đơn hàng...
            </div>
          )}

          {/* Lỗi */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Nội dung khi đã có dữ liệu */}
          {!isLoading && order && (
            <>
              {/* Header: Tiêu đề đơn hàng & badge trạng thái */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-ink">
                    Đơn hàng {order.orderCode}
                  </h1>
                  <p className="text-xs text-muted mt-1">
                    Đặt ngày {order.orderDate} lúc {order.orderTime} · {order.itemCount} sản phẩm
                  </p>
                </div>

                {/* Badge trạng thái */}
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border ${order.status === "pending"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : order.status === "completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : order.status === "cancelled"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : order.status === "returned"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-600 border-blue-200"
                    }`}
                >
                  {order.statusLabel}
                </span>
              </div>

              {/* Thanh tiến trình trạng thái (Timeline) */}
              <OrderTimeline steps={order.timeline} />

              {/* Hai cột: Danh sách sản phẩm & Tóm tắt thanh toán */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Cột trái (7 cột): Sản phẩm & Địa chỉ */}
                <div className="lg:col-span-7">
                  <OrderDetailItems
                    items={order.items}
                    shippingAddress={order.shippingAddress}
                  />
                </div>

                {/* Cột phải (5 cột): Tóm tắt tiền, phương thức & nút xác nhận nhận hàng / hủy đơn */}
                <div className="lg:col-span-5">
                  <OrderSummarySidebar
                    order={order}
                    onReceiptConfirmed={reload}
                  />
                </div>
              </div>
            </>
          )}

          {/* Không tìm thấy đơn */}
          {!isLoading && !order && !error && (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center text-sm text-muted">
              Không tìm thấy đơn hàng.{" "}
              <Link href="/orders" className="text-blue-600 hover:underline">
                Quay lại danh sách đơn
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
