"use client";

// =============================================================
// features/orders/components/order-summary-sidebar.tsx
// Cột phải chi tiết đơn: Tóm tắt tiền, phương thức thanh toán & nút Hủy đơn
// =============================================================

import Link from "next/link";
import React, { useState } from "react";
import type { OrderDetail } from "../types";
import { confirmOrderReceiptApi, OrderReceiptApiError } from "../services/receipt-confirmation.service";

type OrderSummarySidebarProps = {
  order: OrderDetail;
  onRequestCancel?: () => void;
  onReceiptConfirmed?: () => void;
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function OrderSummarySidebar({
  order,
  onRequestCancel,
  onReceiptConfirmed,
}: OrderSummarySidebarProps) {
  const canCancel = order.status === "pending";
  const canConfirmReceipt = order.status === "shipping";
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [confirmingReceiptBusy, setConfirmingReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  async function confirmReceipt() {
    if (confirmingReceiptBusy) return;
    if (!confirmingReceipt) {
      setConfirmingReceipt(true);
      setReceiptError("");
      return;
    }
    setConfirmingReceiptBusy(true);
    setReceiptError("");
    try {
      await confirmOrderReceiptApi(order.id);
      onReceiptConfirmed?.();
    } catch (error) {
      setReceiptError(
        error instanceof OrderReceiptApiError
          ? error.message
          : "Chưa xác nhận được kết quả. Hãy tải lại đơn hàng để kiểm tra.",
      );
      setConfirmingReceipt(false);
    } finally {
      setConfirmingReceiptBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Khối 1: Tóm tắt đơn hàng */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-ink">Tóm tắt đơn hàng</h2>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>Tạm tính ({order.itemCount} sản phẩm)</span>
            <span className="font-semibold text-ink">
              {formatVND(order.subtotal)}
            </span>
          </div>

          <div className="flex justify-between text-muted">
            <span>Phí vận chuyển</span>
            <span className="font-semibold text-ink">
              {formatVND(order.shippingFee)}
            </span>
          </div>

          <div className="flex justify-between text-muted">
            <span>Giảm giá</span>
            <span className="font-semibold text-ink">
              {formatVND(order.discount)}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-line flex items-baseline justify-between">
          <span className="text-sm font-bold text-ink">Tổng thanh toán</span>
          <span className="text-xl font-extrabold text-blue-600">
            {formatVND(order.totalAmount)}
          </span>
        </div>
      </div>

      {/* Khối 2: Phương thức thanh toán */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-ink">
          Thanh toán qua {order.paymentMethod}
        </h2>

        <div>
          <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            {order.paymentStatus}
          </span>
        </div>

        <p className="text-xs text-muted font-mono">
          Mã giao dịch: {order.transactionCode}
        </p>
      </div>

      {/* Khối 3: Thao tác Hủy đơn & Hỗ trợ */}
      <div className="space-y-3">
        {canConfirmReceipt && (
          <>
            {receiptError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{receiptError}</p>}
            {confirmingReceipt && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Xác nhận bạn đã nhận được toàn bộ hàng trong đơn?</p>}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void confirmReceipt()}
                disabled={confirmingReceiptBusy}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmingReceiptBusy ? "Đang xác nhận…" : confirmingReceipt ? "Xác nhận đã nhận hàng" : "Đã nhận được hàng"}
              </button>
              {confirmingReceipt && (
                <button
                  type="button"
                  onClick={() => { setConfirmingReceipt(false); setReceiptError(""); }}
                  disabled={confirmingReceiptBusy}
                  className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quay lại
                </button>
              )}
            </div>
          </>
        )}
        {canCancel && (
          onRequestCancel ? (
            <button
              type="button"
              onClick={onRequestCancel}
              className="w-full rounded-xl bg-rose-50 border border-rose-200 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-sm"
            >
              Hủy đơn hàng
            </button>
          ) : (
            <Link
              href={`/orders/${order.id}/cancel`}
              className="block text-center w-full rounded-xl bg-rose-50 border border-rose-200 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-sm"
            >
              Hủy đơn hàng
            </Link>
          )
        )}

        <div className="text-center">
          <a
            href="tel:1900636789"
            className="text-xs text-muted hover:text-ink font-medium inline-block py-1 hover:underline transition-colors"
          >
            Liên hệ hỗ trợ
          </a>
        </div>
      </div>
    </div>
  );
}
