"use client";

import Image from "next/image";
import React from "react";
import { AlertCircle, Check, Clock, Copy, RefreshCw } from "lucide-react";

export type VietQrPanelData = {
  orderCode: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  memo: string;
  qrUrl: string;
};

type VietQrTransferPanelProps = {
  paymentInfo: VietQrPanelData;
  secondsLeft: number;
  isExpired: boolean;
  isChecking: boolean;
  isRenewing: boolean;
  isConverting: boolean;
  copiedField: string | null;
  errorMessage?: string | null;
  onManualCheck: () => void;
  onCopy: (text: string, fieldName: string) => void;
  onRenewSession: () => void;
  onConvertToCod: () => void;
};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VietQrTransferPanel({
  paymentInfo,
  secondsLeft,
  isExpired,
  isChecking,
  isRenewing,
  isConverting,
  copiedField,
  errorMessage,
  onManualCheck,
  onCopy,
  onRenewSession,
  onConvertToCod,
}: VietQrTransferPanelProps) {
  const transferAmount =
    paymentInfo.remainingAmount > 0
      ? paymentInfo.remainingAmount
      : paymentInfo.total;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs sm:p-8">
      {/* Phần đầu thẻ & Đồng hồ đếm ngược */}
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

        {!isExpired && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold tabular-nums ${
              secondsLeft < 180
                ? "border-danger/20 bg-danger-subtle text-danger"
                : "border-brand/20 bg-brand-subtle text-brand"
            }`}
          >
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            <span>Hết hạn trong: {formatTimer(secondsLeft)}</span>
          </div>
        )}
      </div>

      {/* Thông báo lỗi phát sinh khi thao tác (nếu có) */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Trạng thái phiên QR hết hạn -> Cho phép gia hạn 15p hoặc chuyển sang COD */}
      {isExpired ? (
        <div className="my-6 rounded-2xl border border-warning/20 bg-warning-subtle p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface text-warning border border-warning/20">
            <AlertCircle className="size-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-lg font-bold text-ink">
            Phiên thanh toán đã hết hạn
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Thời gian 15 phút quét mã đã kết thúc. Đơn hàng của bạn vẫn được giữ ở
            trạng thái chờ xử lý. Bạn có thể tạo lại mã mới hoặc chuyển sang thanh
            toán khi nhận hàng (COD).
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRenewSession}
              disabled={isRenewing || isConverting}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${isRenewing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>
                {isRenewing
                  ? "Đang tạo lại mã..."
                  : "Tạo lại mã thanh toán (gia hạn 15p)"}
              </span>
            </button>
            <button
              type="button"
              onClick={onConvertToCod}
              disabled={isConverting || isRenewing}
              className="min-h-11 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConverting
                ? "Đang chuyển..."
                : "Chuyển sang nhận hàng (COD)"}
            </button>
          </div>
        </div>
      ) : (
        /* Nội dung mã VietQR và thông tin chuyển khoản */
        <div className="my-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Cột trái: Ảnh QR */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-canvas p-6 text-center lg:col-span-5">
            <div className="relative size-60 overflow-hidden rounded-xl border border-line bg-surface p-2 sm:size-64">
              <Image
                src={paymentInfo.qrUrl}
                alt={`Mã VietQR thanh toán đơn hàng ${paymentInfo.orderCode}`}
                width={256}
                height={256}
                unoptimized
                className="size-full object-contain"
              />
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-full border border-success/20 bg-success-subtle px-3 py-1.5 text-xs font-semibold text-success">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span>Đang chờ chuyển tiền tự động...</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Quét bằng ứng dụng ngân hàng bất kỳ (VCB, MB, TCB,...)
            </p>
          </div>

          {/* Cột phải: Thông tin tài khoản thụ hưởng */}
          <div className="space-y-4 text-sm lg:col-span-7">
            {paymentInfo.paidAmount > 0 && paymentInfo.remainingAmount > 0 && (
              <div className="rounded-xl border border-brand/20 bg-brand-subtle p-3.5 text-xs text-ink">
                <p className="font-semibold text-brand">
                  Hệ thống đã ghi nhận một phần tiền:
                </p>
                <p className="mt-1">
                  Đã chuyển:{" "}
                  <strong className="text-success tabular-nums">
                    {formatVND(paymentInfo.paidAmount)}
                  </strong>{" "}
                  · Số tiền còn thiếu cần chuyển bù:{" "}
                  <strong className="text-danger tabular-nums">
                    {formatVND(paymentInfo.remainingAmount)}
                  </strong>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-line bg-canvas p-3">
              <span className="text-xs text-muted">Ngân hàng thụ hưởng:</span>
              <span className="font-bold text-ink">{paymentInfo.bankCode}</span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-3">
              <div className="min-w-0">
                <span className="block text-xs text-muted">Số tài khoản:</span>
                <span className="font-mono text-base font-bold text-ink">
                  {paymentInfo.accountNumber || "---"}
                </span>
              </div>
              {paymentInfo.accountNumber && (
                <button
                  type="button"
                  onClick={() => onCopy(paymentInfo.accountNumber, "acc")}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-subtle"
                >
                  {copiedField === "acc" ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {copiedField === "acc" ? "Đã sao chép" : "Sao chép"}
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-3">
              <span className="text-xs text-muted">Tên chủ tài khoản:</span>
              <span className="text-right font-bold uppercase text-ink">
                {paymentInfo.accountHolder}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-3">
              <div className="min-w-0">
                <span className="block text-xs text-muted">
                  Số tiền cần chuyển:
                </span>
                <span className="font-mono text-lg font-bold text-danger tabular-nums">
                  {formatVND(transferAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onCopy(String(transferAmount), "amount")}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-subtle"
              >
                {copiedField === "amount" ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
                <span>
                  {copiedField === "amount" ? "Đã sao chép" : "Sao chép"}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-subtle p-3.5">
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-brand">
                  Nội dung chuyển khoản (Bắt buộc):
                </span>
                <span className="break-all font-mono text-base font-bold text-ink">
                  {paymentInfo.memo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onCopy(paymentInfo.memo, "memo")}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                {copiedField === "memo" ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
                <span>
                  {copiedField === "memo" ? "Đã sao chép" : "Sao chép"}
                </span>
              </button>
            </div>
            <p className="text-[11px] font-medium text-warning">
              * Lưu ý: Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống
              tự động nhận diện và kích hoạt đơn hàng tức thì.
            </p>
          </div>
        </div>
      )}

      {/* Footer & nút kiểm tra thủ công */}
      {!isExpired && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <p className="max-w-sm text-xs text-muted">
            Sau khi chuyển khoản thành công, hệ thống sẽ tự động cập nhật đơn hàng
            sau vài giây mà không cần chụp ảnh biên lai.
          </p>

          <button
            type="button"
            onClick={onManualCheck}
            disabled={isChecking}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking && (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
              />
            )}
            <span>
              {isChecking
                ? "Đang kiểm tra..."
                : "Tôi đã chuyển tiền / Kiểm tra ngay"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

