"use client";

// =============================================================
// features/orders/components/orders-table.tsx
// Bảng danh sách các đơn hàng của khách hàng
// =============================================================

import Link from "next/link";
import React from "react";
import type { CustomerOrder } from "../types";

type OrdersTableProps = {
  orders: CustomerOrder[];
  totalOrders: number;
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

// Hàm render màu sắc badge trạng thái
function renderStatusBadge(status: CustomerOrder["status"], label: string) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          {label}
        </span>
      );
    case "shipping":
      return (
        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-200">
          {label}
        </span>
      );
    case "completed":
      return (
        <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          {label}
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          {label}
        </span>
      );
    default:
      return (
        <span className="inline-block rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-700 border border-gray-200">
          {label}
        </span>
      );
  }
}

export function OrdersTable({ orders, totalOrders }: OrdersTableProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
      {/* Header bảng */}
      <div className="grid grid-cols-12 items-center px-6 py-4 text-xs font-semibold tracking-wider text-muted border-b border-line">
        <div className="col-span-3 uppercase">MÃ ĐƠN / NGÀY ĐẶT</div>
        <div className="col-span-4 uppercase">SẢN PHẨM</div>
        <div className="col-span-2 text-right uppercase">TỔNG TIỀN</div>
        <div className="col-span-2 text-center uppercase">TRẠNG THÁI</div>
        <div className="col-span-1 text-right uppercase">THAO TÁC</div>
      </div>

      {/* Danh sách các dòng đơn hàng */}
      {orders.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted">
          Không tìm thấy đơn hàng nào phù hợp.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {orders.map((order) => (
            <div
              key={order.id}
              className="grid grid-cols-12 items-center px-6 py-5 gap-2 hover:bg-gray-50/50 transition-colors"
            >
              {/* Cột 1: Mã đơn & Ngày đặt */}
              <div className="col-span-3">
                <p className="font-bold text-sm text-ink">{order.orderCode}</p>
                <p className="text-xs text-muted mt-0.5">{order.orderDate}</p>
              </div>

              {/* Cột 2: Sản phẩm tóm tắt & số lượng */}
              <div className="col-span-4 pr-4">
                <p className="font-semibold text-sm text-ink truncate">
                  {order.productsSummary}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {order.itemCount} sản phẩm
                </p>
              </div>

              {/* Cột 3: Tổng tiền */}
              <div className="col-span-2 text-right">
                <span className="font-bold text-sm text-ink">
                  {formatVND(order.totalAmount)}
                </span>
              </div>

              {/* Cột 4: Badge trạng thái */}
              <div className="col-span-2 text-center">
                {renderStatusBadge(order.status, order.statusLabel)}
              </div>

              {/* Cột 5: Thao tác Chi tiết */}
              <div className="col-span-1 text-right">
                <Link
                  href="/checkout/success"
                  className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Chi tiết</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer bảng */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-line text-xs text-muted bg-gray-50/30">
        <span>
          Hiển thị {orders.length} trong {totalOrders} đơn hàng
        </span>
        <span className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink">
          Trang 1 / 1
        </span>
      </div>
    </div>
  );
}
