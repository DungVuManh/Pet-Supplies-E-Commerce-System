"use client";

// Màn hình Chi tiết đơn hàng
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useMemo } from "react";
import { AccountSidebar } from "./account-sidebar";
import { OrderDetailItems } from "./order-detail-items";
import { OrderSummarySidebar } from "./order-summary-sidebar";
import { OrderTimeline } from "./order-timeline";
import { MOCK_ORDER_DETAIL } from "../mock-data";
import type { OrderDetail } from "../types";

type OrderDetailViewProps = {
  orderId?: string;
};

export function OrderDetailView({ orderId }: OrderDetailViewProps) {
  const searchParams = useSearchParams();
  const isCancelled = searchParams.get("cancelled") === "true";

  const order: OrderDetail = useMemo(() => {
    if (!isCancelled) return MOCK_ORDER_DETAIL;

    return {
      ...MOCK_ORDER_DETAIL,
      status: "cancelled",
      statusLabel: "Đã hủy",
      timeline: MOCK_ORDER_DETAIL.timeline.map((step) =>
        step.id === "step-2"
          ? {
              ...step,
              title: "Đã hủy đơn",
              description: "Bởi khách hàng",
              status: "completed" as const,
            }
          : step
      ),
    };
  }, [isCancelled]);

  return (
    <div className="container">
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Cột trái: Sidebar tài khoản */}
        <AccountSidebar />

        {/* Cột phải: Chi tiết đơn hàng */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-muted mb-2 flex items-center gap-1.5">
            <Link href="/" className="hover:text-ink transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href="/orders" className="hover:text-ink transition-colors">
              Đơn hàng
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">Chi tiết</span>
          </nav>

          {/* Thông báo nếu vừa hủy đơn thành công */}
          {isCancelled && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-3">
              <span className="text-base">ℹ️</span>
              <div>
                <p className="font-bold">Đơn hàng đã được hủy thành công</p>
                <p className="text-rose-700 mt-0.5">
                  Số tiền 1.100.000 đ sẽ được hoàn về tài khoản VNPay trong 3-7 ngày làm việc.
                </p>
              </div>
            </div>
          )}

          {/* Header: Tiêu đề đơn hàng & badge trạng thái */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                Đơn hàng {order.orderCode}
              </h1>
              <p className="text-xs text-muted mt-1">
                Đặt ngày {order.orderDate} lúc {order.orderTime} ·{" "}
                {order.itemCount} sản phẩm
              </p>
            </div>

            {/* Badge trạng thái */}
            <div>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border ${
                  order.status === "pending"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : order.status === "completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : order.status === "cancelled"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-blue-50 text-blue-600 border-blue-200"
                }`}
              >
                {order.statusLabel}
              </span>
            </div>
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

            {/* Cột phải (5 cột): Tóm tắt tiền, phương thức & nút hủy đơn */}
            <div className="lg:col-span-5">
              <OrderSummarySidebar order={order} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailView;
