"use client";

// =============================================================
// features/orders/components/order-cancel-view.tsx
// Màn hình Hủy đơn hàng - Gọi API thật, không dùng mock data
// =============================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { AccountSidebar } from "./account-sidebar";
import { useOrderDetail } from "../hooks/use-order-detail";
import { deleteOrderApi } from "../services/order.service";

type OrderCancelViewProps = {
  orderId?: string;
};

const CANCEL_REASONS = [
  "Tôi muốn thay đổi sản phẩm hoặc số lượng",
  "Tôi muốn đổi địa chỉ giao hàng",
  "Tôi tìm được sản phẩm phù hợp hơn",
  "Tôi không còn nhu cầu mua",
  "Lý do khác",
];

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

export function OrderCancelView({ orderId }: OrderCancelViewProps) {
  const router = useRouter();

  // Gọi API lấy thông tin đơn hàng để hiển thị
  const { order, isLoading, error } = useOrderDetail(orderId);

  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Xử lý khi bấm nút "Xác nhận hủy đơn"
  const handleConfirmCancel = async () => {
    if (!orderId) return;

    try {
      setIsSubmitting(true);

      // Gọi API xóa/hủy đơn hàng trong MongoDB
      await deleteOrderApi(orderId);

      setIsSubmitted(true);

      // Sau 1.5 giây quay về danh sách đơn hàng
      setTimeout(() => {
        router.push("/orders");
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể hủy đơn hàng, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hiển thị loading
  if (isLoading) {
    return (
      <div className="container py-16 text-center text-sm text-muted">
        Đang tải thông tin đơn hàng...
      </div>
    );
  }

  // Hiển thị lỗi
  if (error || !order) {
    return (
      <div className="container py-16 text-center text-sm text-red-600">
        {error || "Không tìm thấy đơn hàng."}
        <div className="mt-4">
          <Link href="/orders" className="text-blue-600 hover:underline">
            Quay lại danh sách đơn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Cột trái: Sidebar tài khoản */}
        <AccountSidebar />

        {/* Cột phải: Nội dung Hủy đơn hàng */}
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
            <Link href={`/orders/${orderId}`} className="hover:text-ink transition-colors">
              Chi tiết
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">Hủy đơn</span>
          </nav>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Hủy đơn hàng
            </h1>
            <p className="text-xs text-muted mt-1">
              Đơn {order.orderCode} đang chờ xử lý và đủ điều kiện hủy.
            </p>
          </div>

          {/* Thông báo hủy thành công */}
          {isSubmitted && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-bold">Hủy đơn hàng thành công!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Đang chuyển hướng về danh sách đơn hàng...
                </p>
              </div>
            </div>
          )}

          {/* Hai cột: Form lý do & Tóm tắt đơn */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Cột trái: Form lý do hủy (7 cột) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <h2 className="text-base font-bold text-ink">
                  Vì sao bạn muốn hủy đơn?
                </h2>
                <p className="text-xs text-muted mt-1 mb-5">
                  Chọn một lý do để Petly phục vụ bạn tốt hơn.
                </p>

                {/* Danh sách các radio lý do */}
                <div className="space-y-3.5">
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className="flex items-center gap-3 cursor-pointer text-sm text-ink group"
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="w-4 h-4 text-blue-600 border-line focus:ring-blue-500 cursor-pointer"
                        disabled={isSubmitted || isSubmitting}
                      />
                      <span className="group-hover:text-blue-600 transition-colors">
                        {reason}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Ô ghi chú thêm */}
                <div className="mt-6 pt-5 border-t border-line">
                  <label
                    htmlFor="cancel-note"
                    className="block text-xs font-semibold text-muted mb-2"
                  >
                    Thông tin thêm (không bắt buộc)
                  </label>
                  <textarea
                    id="cancel-note"
                    rows={3}
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    disabled={isSubmitted || isSubmitting}
                    placeholder="Nhập thông tin thêm nếu có..."
                    className="w-full rounded-xl border border-line bg-surface p-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Nút bấm: Giữ đơn & Xác nhận hủy */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push(`/orders/${orderId}`)}
                  disabled={isSubmitted || isSubmitting}
                  className="px-6 py-2.5 rounded-xl border border-line bg-surface text-sm font-semibold text-ink hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Giữ đơn hàng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isSubmitted || isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Đang hủy đơn..." : "Xác nhận hủy đơn"}
                </button>
              </div>
            </div>

            {/* Cột phải: Thông tin đơn, Hoàn tiền, Lưu ý (5 cột) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Khối 1: Thông tin đơn hàng */}
              <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-ink">Thông tin đơn hàng</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Mã đơn:</span>
                  <span className="font-bold text-ink">{order.orderCode}</span>
                </div>
                <div>
                  <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                    {order.statusLabel}
                  </span>
                </div>
                <div className="text-xs text-muted pt-1">
                  Tổng đơn:{" "}
                  <span className="font-bold text-ink">
                    {formatVND(order.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Khối 2: Hoàn tiền */}
              <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-ink">Hoàn tiền</h3>
                <div className="text-2xl font-extrabold text-blue-600">
                  {formatVND(order.totalAmount)}
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Hoàn toàn bộ số tiền, bao gồm phí vận chuyển, về tài khoản đã
                  thanh toán qua {order.paymentMethod}.
                </p>
                <p className="text-xs text-muted font-medium">
                  Thời gian dự kiến:{" "}
                  <span className="font-bold text-ink">3-7 ngày làm việc</span>
                </p>
              </div>

              {/* Khối 3: Lưu ý trước khi hủy */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex gap-3 text-xs text-amber-800">
                <span className="text-base shrink-0">⚠️</span>
                <div>
                  <p className="font-bold mb-0.5">Lưu ý trước khi hủy</p>
                  <p className="leading-relaxed text-amber-700">
                    Sau khi xác nhận, đơn không thể khôi phục. Bạn có thể đặt lại
                    sản phẩm bất cứ lúc nào.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderCancelView;
