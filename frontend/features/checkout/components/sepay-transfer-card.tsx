"use client";

// =============================================================
// features/checkout/components/sepay-transfer-card.tsx
// Thẻ hiển thị mã VietQR động, thông tin chuyển khoản và đồng bộ thời gian thực
// =============================================================

import React from "react";
import Image from "next/image";
import { useSepayPayment } from "../hooks/use-sepay-payment";

type SepayTransferCardProps = {
 orderCode: string;
 onPaymentSuccess?: () => void;
 onConvertToCodSuccess?: () => void;
};

function formatVND(value: number): string {
 return value.toLocaleString("vi-VN") + " đ";
}

function formatTimer(seconds: number): string {
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function SepayTransferCard({
 orderCode,
 onPaymentSuccess,
 onConvertToCodSuccess,
}: SepayTransferCardProps) {
 const {
  paymentInfo,
  isLoading,
  isChecking,
  isRenewing,
  isConverting,
  errorMessage,
  copiedField,
  secondsLeft,
  isPaid,
  isExpired,
  handleManualCheck,
  handleCopy,
  handleRenewSession,
  handleConvertToCod,
 } = useSepayPayment(orderCode);

 // Khi thanh toán thành công, kích hoạt callback chuyển view
 React.useEffect(() => {
  if (isPaid && onPaymentSuccess) {
   onPaymentSuccess();
  }
 }, [isPaid, onPaymentSuccess]);

 if (isLoading) {
  return (
   <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
    <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
    <p className="mt-4 text-sm text-muted">
     Đang khởi tạo mã thanh toán VietQR...
    </p>
   </div>
  );
 }

 if (errorMessage && !paymentInfo) {
  return (
   <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-sm">
    <p className="font-semibold">Có lỗi xảy ra khi tải thông tin thanh toán:</p>
    <p className="mt-1">{errorMessage}</p>
   </div>
  );
 }

 if (!paymentInfo) return null;

 return (
  <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
   {/* 1. Header & Đồng hồ đếm ngược */}
   <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
    <div>
     <h2 className="text-xl font-bold text-ink">
      Thanh toán chuyển khoản qua VietQR
     </h2>
     <p className="mt-1 text-xs text-muted">
      Mã đơn hàng:{" "}
      <span className="font-mono font-bold text-ink">
       #{paymentInfo.orderCode}
      </span>
     </p>
    </div>

    {/* Đồng hồ đếm ngược */}
    {!isExpired && (
     <div
      className={`flex items-center gap-2 rounded-xl px-4 py-2 border text-sm font-semibold ${
       secondsLeft < 180
        ? "border-red-200 bg-red-50 text-red-600"
        : "border-blue-200 bg-blue-50 text-blue-700"
      }`}
     >
      <svg
       xmlns="http://www.w3.org/2000/svg"
       width="18"
       height="18"
       viewBox="0 0 24 24"
       fill="none"
       stroke="currentColor"
       strokeWidth="2"
       strokeLinecap="round"
       strokeLinejoin="round"
      >
       <circle cx="12" cy="12" r="10" />
       <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>Hết hạn trong: {formatTimer(secondsLeft)}</span>
     </div>
    )}
   </div>

   {/* 2. Cảnh báo khi phiên thanh toán hết hạn */}
   {isExpired ? (
    <div className="my-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center">
     <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
      <svg
       xmlns="http://www.w3.org/2000/svg"
       width="24"
       height="24"
       viewBox="0 0 24 24"
       fill="none"
       stroke="currentColor"
       strokeWidth="2"
       strokeLinecap="round"
       strokeLinejoin="round"
      >
       <circle cx="12" cy="12" r="10" />
       <line x1="12" x2="12" y1="8" y2="12" />
       <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
     </div>
     <h3 className="mt-3 text-lg font-bold text-amber-900">
      Phiên thanh toán đã hết hạn
     </h3>
     <p className="mt-1 text-sm text-amber-700 max-w-md mx-auto">
      Thời gian 15 phút quét mã đã kết thúc. Đơn hàng của bạn vẫn được giữ ở
      trạng thái chờ xử lý. Bạn có thể gia hạn mã mới hoặc chuyển sang thanh
      toán COD.
     </p>

     <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <button
       type="button"
       onClick={handleRenewSession}
       disabled={isRenewing}
       className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
       {isRenewing
        ? "Đang tạo lại mã..."
        : "Tạo lại mã thanh toán (gia hạn 15p)"}
      </button>
      <button
       type="button"
       onClick={() => handleConvertToCod(onConvertToCodSuccess)}
       disabled={isConverting}
       className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
       {isConverting ? "Đang chuyển..." : "Chuyển sang nhận hàng (COD)"}
      </button>
     </div>
    </div>
   ) : (
    /* 3. Màn hình quét mã VietQR và chi tiết tài khoản */
    <div className="my-6 grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
     {/* Cột trái: Ảnh mã VietQR động */}
     <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-line/80 bg-gray-50/50 p-6 text-center">
      <div className="relative size-60 sm:size-64 overflow-hidden rounded-xl border border-line bg-white p-2 shadow-sm">
       <img
        src={paymentInfo.qrUrl}
        alt={`Mã VietQR thanh toán đơn hàng ${paymentInfo.orderCode}`}
        className="size-full object-contain"
       />
      </div>

      {/* Trạng thái lắng nghe thời gian thực */}
      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
       <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
       </span>
       <span>Đang chờ chuyển tiền tự động...</span>
      </div>
      <p className="mt-2 text-[11px] text-muted">
       Quét bằng ứng dụng ngân hàng bất kỳ (VCB, MB, TCB,...)
      </p>
     </div>

     {/* Cột phải: Thông tin chi tiết để chuyển khoản thủ công */}
     <div className="lg:col-span-7 space-y-4 text-sm">
      {/* Cảnh báo thanh toán thiếu nếu có */}
      {paymentInfo.paidAmount > 0 && paymentInfo.remainingAmount > 0 && (
       <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-800">
        <p className="font-semibold">Hệ thống đã nhận một phần tiền:</p>
        <p className="mt-0.5">
         Đã chuyển:{" "}
         <strong className="text-emerald-700">
          {formatVND(paymentInfo.paidAmount)}
         </strong>{" "}
         · Số tiền còn thiếu cần chuyển bù:{" "}
         <strong className="text-red-600">
          {formatVND(paymentInfo.remainingAmount)}
         </strong>
        </p>
       </div>
      )}

      {/* Ngân hàng */}
      <div className="flex items-center justify-between rounded-xl bg-gray-50/60 p-3 border border-line/60">
       <span className="text-muted text-xs">Ngân hàng thụ hưởng:</span>
       <span className="font-bold text-ink">{paymentInfo.bankCode}</span>
      </div>

      {/* Số tài khoản */}
      <div className="flex items-center justify-between rounded-xl bg-gray-50/60 p-3 border border-line/60">
       <div>
        <span className="block text-muted text-xs">Số tài khoản:</span>
        <span className="font-mono font-bold text-ink text-base">
         {paymentInfo.accountNumber}
        </span>
       </div>
       <button
        type="button"
        onClick={() => handleCopy(paymentInfo.accountNumber, "acc")}
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 border border-line shadow-xs hover:bg-blue-50 transition-colors"
       >
        {copiedField === "acc" ? "✓ Đã sao chép" : "Sao chép"}
       </button>
      </div>

      {/* Chủ tài khoản */}
      <div className="flex items-center justify-between rounded-xl bg-gray-50/60 p-3 border border-line/60">
       <span className="text-muted text-xs">Tên chủ tài khoản:</span>
       <span className="font-bold text-ink uppercase">
        {paymentInfo.accountHolder}
       </span>
      </div>

      {/* Số tiền cần chuyển */}
      <div className="flex items-center justify-between rounded-xl bg-gray-50/60 p-3 border border-line/60">
       <div>
        <span className="block text-muted text-xs">Số tiền cần chuyển:</span>
        <span className="font-mono font-bold text-red-600 text-lg">
         {formatVND(
          paymentInfo.remainingAmount > 0
           ? paymentInfo.remainingAmount
           : paymentInfo.total,
         )}
        </span>
       </div>
       <button
        type="button"
        onClick={() =>
         handleCopy(
          String(
           paymentInfo.remainingAmount > 0
            ? paymentInfo.remainingAmount
            : paymentInfo.total,
          ),
          "amount",
         )
        }
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 border border-line shadow-xs hover:bg-blue-50 transition-colors"
       >
        {copiedField === "amount" ? "✓ Đã sao chép" : "Sao chép"}
       </button>
      </div>

      {/* Nội dung chuyển khoản */}
      <div className="flex items-center justify-between rounded-xl bg-blue-50/50 p-3.5 border border-blue-200/80">
       <div>
        <span className="block text-blue-800 text-xs font-semibold">
         Nội dung chuyển khoản (Bắt buộc):
        </span>
        <span className="font-mono font-bold text-blue-900 text-base">
         {paymentInfo.memo}
        </span>
       </div>
       <button
        type="button"
        onClick={() => handleCopy(paymentInfo.memo, "memo")}
        className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
       >
        {copiedField === "memo" ? "✓ Đã sao chép" : "Sao chép"}
       </button>
      </div>
      <p className="text-[11px] text-amber-700 font-medium">
       * Lưu ý: Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống tự
       động nhận diện và kích hoạt đơn hàng tức thì.
      </p>
     </div>
    </div>
   )}

   {/* 4. Footer & Nút kiểm tra trạng thái */}
   {!isExpired && (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
     <p className="text-xs text-muted max-w-sm">
      Sau khi chuyển khoản thành công, hệ thống sẽ tự động cập nhật đơn hàng sau
      vài giây mà không cần chụp ảnh biên lai.
     </p>

     <button
      type="button"
      onClick={handleManualCheck}
      disabled={isChecking}
      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
     >
      {isChecking && (
       <div className="size-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
      )}
      <span>
       {isChecking ? "Đang kiểm tra..." : "Tôi đã chuyển tiền / Kiểm tra ngay"}
      </span>
     </button>
    </div>
   )}
  </div>
 );
}
