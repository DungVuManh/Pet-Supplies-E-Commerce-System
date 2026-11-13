"use client";

// =============================================================
// features/orders/components/order-summary-sidebar.tsx
// Cột phải chi tiết đơn: Tóm tắt tiền, phương thức thanh toán & nút Xác nhận nhận hàng / Hủy đơn
// Tích hợp ReceiptConfirmedModal trực tiếp tại đây sau khi khách xác nhận đã nhận hàng
// =============================================================

import Link from "next/link";
import React, { useState } from "react";
import { isOrderEligibleForOnlinePayment, type OrderDetail } from "../types";
import {
 confirmOrderReceiptApi,
 OrderReceiptApiError,
} from "../services/receipt-confirmation.service";
import {
 confirmReturnShippedApi,
 OrderReturnApiError,
} from "../services/order-return.service";
import { ReceiptConfirmedModal } from "./receipt-confirmed-modal";

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
 const returnReq = order.returnRequest;
 const isReturnPending = returnReq?.status === "pending";
 const isReturnApproved = returnReq?.status === "approved";
 const isReturnShipped = returnReq?.status === "customer_shipped";
 const isReturnReceived = returnReq?.status === "received";
 const isReturnCompleted =
  returnReq?.status === "completed" || order.status === "returned";
 const isReturnRejected = returnReq?.status === "rejected";

 const canConfirmShipped =
  typeof order.canConfirmShipped === "boolean"
   ? order.canConfirmShipped
   : isReturnApproved;

 const canConfirmReceipt =
  typeof order.canConfirmReceipt === "boolean"
   ? order.canConfirmReceipt
   : order.status === "shipping" && !returnReq?.status;

 const canRequestReturn =
  typeof order.canRequestReturn === "boolean"
   ? order.canRequestReturn
   : order.channel !== "offline" &&
     (order.status === "shipping" || order.status === "completed") &&
     !returnReq?.status;

 const canResumePayment = isOrderEligibleForOnlinePayment(order);
 const paidAmount = order.paidAmount ?? 0;
 const remainingAmount =
  order.remainingAmount ??
  (order.paymentStatusCode === "paid" || order.paymentStatus === "Đã thanh toán"
   ? 0
   : Math.max(0, order.totalAmount - paidAmount));
 const isPartialPaid =
  canResumePayment && paidAmount > 0 && remainingAmount > 0;
 const paymentMethodLabel =
  order.paymentMethodLabel ||
  (order.paymentMethod === "ONLINE"
   ? "Chuyển khoản trực tuyến (VietQR)"
   : order.paymentMethod === "CASH"
     ? "Tiền mặt tại quầy"
     : "Thanh toán khi nhận hàng (COD)");

 let paymentBadgeClass = "border-warning/20 bg-warning-subtle text-warning";
 if (
  order.paymentStatusCode === "paid" ||
  order.paymentStatus === "Đã thanh toán"
 ) {
  paymentBadgeClass = "border-success/20 bg-success-subtle text-success";
 } else if (isPartialPaid) {
  paymentBadgeClass = "border-brand/20 bg-brand-subtle text-brand";
 } else if (order.paymentStatusCode === "failed") {
  paymentBadgeClass = "border-danger/20 bg-danger-subtle text-danger";
 }
 const [confirmingReceipt, setConfirmingReceipt] = useState(false);
 const [confirmingReceiptBusy, setConfirmingReceiptBusy] = useState(false);
 const [receiptError, setReceiptError] = useState("");
 const [showReceiptModal, setShowReceiptModal] = useState(false);

 const [confirmingShipped, setConfirmingShipped] = useState(false);
 const [confirmingShippedBusy, setConfirmingShippedBusy] = useState(false);
 const [shippedError, setShippedError] = useState("");

 async function confirmShipped() {
  if (confirmingShippedBusy) return;
  if (!confirmingShipped) {
   setConfirmingShipped(true);
   setShippedError("");
   return;
  }
  setConfirmingShippedBusy(true);
  setShippedError("");
  try {
   await confirmReturnShippedApi(order.id);
   setConfirmingShipped(false);
   onReceiptConfirmed?.();
  } catch (error) {
   setShippedError(
    error instanceof OrderReturnApiError
     ? error.message
     : "Chưa xác nhận được kết quả. Hãy tải lại đơn hàng để kiểm tra.",
   );
   setConfirmingShipped(false);
  } finally {
   setConfirmingShippedBusy(false);
  }
 }

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
   setConfirmingReceipt(false);
   setShowReceiptModal(true);
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
      <span className="min-w-0 break-words">
       Giảm giá{order.promotionCode ? ` (${order.promotionCode})` : ""}
      </span>
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
   <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-3">
    <h2 className="text-base font-bold text-ink">{paymentMethodLabel}</h2>

    <div>
     <span
      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${paymentBadgeClass}`}
     >
      {order.paymentStatus}
     </span>
    </div>

    {isPartialPaid && (
     <div className="space-y-1.5 rounded-xl border border-brand/20 bg-brand-subtle p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
       <span className="text-muted">Đã thanh toán</span>
       <span className="font-semibold text-success tabular-nums">
        {formatVND(paidAmount)}
       </span>
      </div>
      <div className="flex items-center justify-between gap-2">
       <span className="text-muted">Còn thiếu</span>
       <span className="font-bold text-danger tabular-nums">
        {formatVND(remainingAmount)}
       </span>
      </div>
     </div>
    )}
   </div>

   {/* Khối Hoàn trả hàng: Trạng thái yêu cầu hoàn trả (Pending, Approved, Rejected) */}
   {isReturnPending && (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-3">
     <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold">
       ⏳
      </span>
      <h3 className="text-sm font-bold text-amber-900">Chờ xử lý hoàn trả</h3>
     </div>
     <p className="text-xs text-amber-800 leading-relaxed">
      Bạn đã gửi yêu cầu hoàn trả cho đơn hàng này (
      {returnReq?.reasonLabel || returnReq?.reason}). Nhân viên đang kiểm tra
      thông tin và sẽ phản hồi sớm nhất.
     </p>
     {returnReq?.description && (
      <div className="text-xs text-amber-900/80 bg-white/70 rounded-lg p-2.5 border border-amber-100">
       <strong>Mô tả của bạn:</strong> {returnReq.description}
      </div>
     )}
     {returnReq?.bankAccount && (
      <div className="text-xs text-amber-900/80 bg-white/70 rounded-lg p-2.5 border border-amber-100">
       <strong>Tài khoản nhận hoàn tiền:</strong>{" "}
       {returnReq.bankAccount.bankName} · {returnReq.bankAccount.accountNumber}{" "}
       · {returnReq.bankAccount.accountHolder}
      </div>
     )}
    </div>
   )}

   {isReturnApproved && (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 space-y-3">
     <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
       <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-800 text-xs font-bold">
        ✓
       </span>
       <h3 className="text-sm font-bold text-blue-900">
        Yêu cầu hoàn trả đã được duyệt
       </h3>
      </div>
     </div>
     <p className="text-xs text-blue-800 leading-relaxed">
      Cửa hàng đã đồng ý yêu cầu hoàn trả. Vui lòng đóng gói và gửi hàng về địa
      chỉ của shop trong vòng 3 ngày. Sau khi gửi bưu kiện, bạn hãy bấm nút{" "}
      <strong>Xác nhận đã gửi trả hàng</strong> bên dưới.
     </p>
     {canConfirmShipped && (
      <div className="pt-2 space-y-2 border-t border-blue-100">
       {shippedError && (
        <p
         role="alert"
         className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
         {shippedError}
        </p>
       )}
       {confirmingShipped && (
        <p
         role="status"
         className="rounded-xl border border-blue-200 bg-white/90 px-3 py-2 text-xs text-blue-800"
        >
         Xác nhận bạn đã gửi kiện hàng trả về shop?
        </p>
       )}
       <div className="flex flex-wrap gap-2">
        <button
         type="button"
         onClick={() => void confirmShipped()}
         disabled={confirmingShippedBusy}
         className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-sm"
        >
         {confirmingShippedBusy
          ? "Đang xác nhận…"
          : confirmingShipped
            ? "Đồng ý, tôi đã gửi hàng"
            : "Xác nhận đã gửi trả hàng"}
        </button>
        {confirmingShipped && (
         <button
          type="button"
          onClick={() => {
           setConfirmingShipped(false);
           setShippedError("");
          }}
          disabled={confirmingShippedBusy}
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
         >
          Hủy
         </button>
        )}
       </div>
      </div>
     )}
    </div>
   )}

   {isReturnShipped && (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 space-y-3">
     <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-200 text-indigo-800 text-xs font-bold">
       📦
      </span>
      <h3 className="text-sm font-bold text-indigo-900">
       Đã gửi trả hàng · Chờ shop tiếp nhận
      </h3>
     </div>
     <p className="text-xs text-indigo-800 leading-relaxed">
      Bạn đã xác nhận gửi trả kiện hàng về shop. Cửa hàng sẽ kiểm tra và xác
      nhận ngay khi bưu kiện được giao tới.
     </p>
    </div>
   )}

   {isReturnReceived && (
    <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5 space-y-3">
     <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold">
       🔍
      </span>
      <h3 className="text-sm font-bold text-purple-900">
       Cửa hàng đã nhận được hàng
      </h3>
     </div>
     <p className="text-xs text-purple-800 leading-relaxed">
      Kiện hàng trả về đã đến cửa hàng. Nhân viên đang tiến hành mở kiện và kiểm
      tra tình trạng hàng hóa trước khi thực hiện chuyển tiền hoàn.
     </p>
    </div>
   )}

   {isReturnCompleted && (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3">
     <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold">
       ✓
      </span>
      <h3 className="text-sm font-bold text-emerald-900">
       Hoàn tất hoàn trả thành công
      </h3>
     </div>
     <p className="text-xs text-emerald-800 leading-relaxed">
      Quy trình hoàn trả đơn hàng đã hoàn tất thành công.
      {returnReq?.refundAmount
       ? ` Số tiền đã được chuyển hoàn: ${formatVND(returnReq.refundAmount)}.`
       : ""}
     </p>
    </div>
   )}

   {isReturnRejected && (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 space-y-3">
     <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-200 text-rose-800 text-xs font-bold">
       ✕
      </span>
      <h3 className="text-sm font-bold text-rose-900">
       Yêu cầu hoàn trả bị từ chối
      </h3>
     </div>
     <div className="text-xs text-rose-900 bg-white/80 rounded-lg p-3 border border-rose-200 space-y-1">
      <p className="font-semibold text-rose-800">Lý do từ chối từ nhân viên:</p>
      <p className="leading-relaxed">
       {returnReq?.rejectionReason || "Không đủ điều kiện hoàn trả hàng."}
      </p>
     </div>
    </div>
   )}

   {/* Khối 3: Thao tác Tiếp tục thanh toán, Xác nhận nhận hàng, Hoàn trả, Hủy đơn & Hỗ trợ */}
   <div className="space-y-3">
    {canResumePayment && (
     <div className="space-y-2 rounded-2xl border border-brand/20 bg-brand-subtle/60 p-4">
      <Link
       href={`/orders/${encodeURIComponent(order.id)}/pay`}
       className="flex min-h-11 w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
      >
       {isPartialPaid ? "Tiếp tục thanh toán" : "Thanh toán ngay"}
      </Link>
      <p className="text-center text-xs text-muted">
       {isPartialPaid
        ? `Mở lại mã VietQR để chuyển bù ${formatVND(remainingAmount)}.`
        : "Mở lại mã VietQR để hoàn tất thanh toán trực tuyến."}
      </p>
     </div>
    )}
    {canConfirmReceipt && (
     <>
      {receiptError && (
       <p
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
       >
        {receiptError}
       </p>
      )}
      {confirmingReceipt && (
       <p
        role="status"
        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
       >
        Xác nhận bạn đã nhận được toàn bộ hàng trong đơn?
       </p>
      )}
      <div className="flex flex-wrap gap-3">
       <button
        type="button"
        onClick={() => void confirmReceipt()}
        disabled={confirmingReceiptBusy}
        className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
       >
        {confirmingReceiptBusy
         ? "Đang xác nhận…"
         : confirmingReceipt
           ? "Xác nhận đã nhận hàng"
           : "Đã nhận được hàng"}
       </button>
       {confirmingReceipt && (
        <button
         type="button"
         onClick={() => {
          setConfirmingReceipt(false);
          setReceiptError("");
         }}
         disabled={confirmingReceiptBusy}
         className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
         Quay lại
        </button>
       )}
      </div>
     </>
    )}

    {canRequestReturn && (
     <Link
      href={`/orders/${order.id}/return`}
      className="flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-3 text-center text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
     >
      Hoàn trả hàng
     </Link>
    )}

    {canCancel &&
     (onRequestCancel ? (
      <button
       type="button"
       onClick={onRequestCancel}
       className="w-full rounded-xl bg-rose-50 border border-rose-200 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-sm cursor-pointer"
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
     ))}

    <div className="text-center">
     <Link
      href="/support"
      className="text-xs text-muted hover:text-ink font-medium inline-block py-1 hover:underline transition-colors"
     >
      Liên hệ hỗ trợ
     </Link>
    </div>
   </div>

   {/* Modal hiển thị khi nhận đơn hàng thành công */}
   <ReceiptConfirmedModal
    isOpen={showReceiptModal}
    onClose={() => {
     setShowReceiptModal(false);
     onReceiptConfirmed?.();
    }}
   />
  </div>
 );
}
