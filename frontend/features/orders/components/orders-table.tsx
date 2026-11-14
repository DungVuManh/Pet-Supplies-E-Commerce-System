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
  totalFilteredOrders?: number;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

// Hàm tính toán các trang cần hiển thị trên thanh phân trang
function getPaginationItems(
  currentPage: number,
  totalPages: number,
): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Ở gần đầu: 1 2 3 4 5 ... totalPages
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  // Ở gần cuối: 1 ... (totalPages - 4) ... totalPages
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // Ở giữa: 1 ... (c - 1) c (c + 1) ... totalPages
  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
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
    case "returned":
      return (
        <span className="inline-block rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
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

export function OrdersTable({
  orders,
  totalOrders,
  totalFilteredOrders,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  onPageChange,
}: OrdersTableProps) {
  const totalFilteredCount = totalFilteredOrders ?? orders.length;
  const startIndex = totalFilteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalFilteredCount);
  const paginationItems = getPaginationItems(currentPage, totalPages);

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
                  href={`/orders/${order.id}`}
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

      {/* Footer bảng & phân trang */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-line text-xs text-muted bg-gray-50/30 gap-4">
        <div>
          {totalFilteredCount === 0 ? (
            <span>Không có đơn hàng nào</span>
          ) : (
            <span>
              Hiển thị <span className="font-semibold text-ink">{startIndex} - {endIndex}</span> trong tổng số{" "}
              <span className="font-semibold text-ink">{totalFilteredCount}</span> đơn hàng
            </span>
          )}
        </div>

        {totalPages > 1 && onPageChange ? (
          <nav aria-label="Phân trang đơn hàng" className="flex items-center gap-1.5">
            {/* Nút Trước */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1.5 rounded-lg border border-line bg-surface text-xs font-medium text-ink hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Trước
            </button>

            {/* Các trang */}
            {paginationItems.map((item, idx) => {
              if (typeof item === "string") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex items-center justify-center min-w-8 px-1.5 py-1.5 text-xs text-muted font-medium select-none"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`min-w-8 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    isCurrent
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "border-line bg-surface text-ink hover:bg-slate-100"
                  }`}
                >
                  {item}
                </button>
              );
            })}

            {/* Nút Sau */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1.5 rounded-lg border border-line bg-surface text-xs font-medium text-ink hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sau →
            </button>
          </nav>
        ) : (
          <span className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink">
            Trang {currentPage} / {totalPages}
          </span>
        )}
      </div>
    </div>
  );
}
