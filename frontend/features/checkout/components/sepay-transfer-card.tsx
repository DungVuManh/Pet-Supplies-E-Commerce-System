"use client";

// =============================================================
// features/checkout/components/sepay-transfer-card.tsx
// Thẻ hiển thị mã VietQR động cho bước Checkout (dùng chung VietQrTransferPanel)
// =============================================================

import React from "react";
import { VietQrTransferPanel } from "@/components/payment/vietqr-transfer-panel";
import { useSepayPayment } from "../hooks/use-sepay-payment";

type SepayTransferCardProps = {
  orderCode: string;
  onPaymentSuccess?: () => void;
  onConvertToCodSuccess?: () => void;
};

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

  React.useEffect(() => {
    if (isPaid && onPaymentSuccess) {
      onPaymentSuccess();
    }
  }, [isPaid, onPaymentSuccess]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-xs">
        <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-brand border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-sm text-muted">
          Đang khởi tạo mã thanh toán VietQR...
        </p>
      </div>
    );
  }

  if (errorMessage && !paymentInfo) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger-subtle p-6 text-center text-sm text-danger shadow-xs">
        <p className="font-semibold">
          Có lỗi xảy ra khi tải thông tin thanh toán:
        </p>
        <p className="mt-1">{errorMessage}</p>
      </div>
    );
  }

  if (!paymentInfo) return null;

  return (
    <VietQrTransferPanel
      paymentInfo={paymentInfo}
      secondsLeft={secondsLeft}
      isExpired={isExpired}
      isChecking={isChecking}
      isRenewing={isRenewing}
      isConverting={isConverting}
      copiedField={copiedField}
      errorMessage={errorMessage}
      onManualCheck={handleManualCheck}
      onCopy={handleCopy}
      onRenewSession={handleRenewSession}
      onConvertToCod={() => void handleConvertToCod(onConvertToCodSuccess)}
    />
  );
}
