// =============================================================
// features/checkout/hooks/use-sepay-payment.ts
// Hook quản lý trạng thái thanh toán VietQR SePay, đồng hồ đếm ngược và Polling 3s
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  convertOrderToCod,
  getSepayPaymentInfo,
  getSepayPaymentStatus,
  renewSepaySession,
  type SepayPaymentInfo,
  type SepayPaymentStatus,
} from "@/services/payment-api";

export function useSepayPayment(orderCode: string) {
  const [paymentInfo, setPaymentInfo] = useState<SepayPaymentInfo | null>(null);
  const [status, setStatus] = useState<SepayPaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(900); // 15 phút
  const [isPaid, setIsPaid] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Tải thông tin thanh toán VietQR ban đầu
  const loadInfo = useCallback(async () => {
    if (!orderCode) return;
    try {
      setErrorMessage(null);
      const data = await getSepayPaymentInfo(orderCode);
      setPaymentInfo(data);
      setSecondsLeft(data.secondsLeft);
      setIsPaid(data.isPaid);
      setIsExpired(data.isExpired);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Lỗi khi tải thông tin chuyển khoản.");
    } finally {
      setIsLoading(false);
    }
  }, [orderCode]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  // 2. Đồng hồ đếm ngược từng giây
  useEffect(() => {
    if (isPaid) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaid]);

  // 3. Cơ chế Polling ngầm mỗi 3 giây kiểm tra trạng thái thanh toán
  const checkStatus = useCallback(async (isManual = false) => {
    if (!orderCode || isPaid) return;
    if (isManual) setIsChecking(true);

    try {
      const data = await getSepayPaymentStatus(orderCode);
      setStatus(data);

      if (data.isPaid) {
        setIsPaid(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (paymentInfo && data.paidAmount !== paymentInfo.paidAmount) {
        // Khách hàng vừa chuyển một phần tiền (Partial Payment) -> tải lại QR mới cho số tiền còn thiếu
        await loadInfo();
      }
    } catch (err) {
      if (isManual) {
        setErrorMessage(err instanceof Error ? err.message : "Không thể kiểm tra trạng thái.");
      }
    } finally {
      if (isManual) setIsChecking(false);
    }
  }, [isPaid, loadInfo, orderCode, paymentInfo]);

  useEffect(() => {
    if (isPaid || isExpired) return;

    pollingRef.current = setInterval(() => {
      checkStatus(false);
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [checkStatus, isExpired, isPaid]);

  // 4. Hành động bấm nút kiểm tra chủ động
  const handleManualCheck = () => {
    checkStatus(true);
  };

  // 5. Hành động sao chép thông tin vào Clipboard
  const handleCopy = (text: string, fieldName: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // 6. Hành động gia hạn thêm 15 phút khi hết hạn
  const handleRenewSession = async () => {
    if (!orderCode) return;
    try {
      setIsRenewing(true);
      setErrorMessage(null);
      const result = await renewSepaySession(orderCode);
      setSecondsLeft(result.secondsLeft || 900);
      setIsExpired(false);
      await loadInfo();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Lỗi khi gia hạn mã thanh toán.");
    } finally {
      setIsRenewing(false);
    }
  };

  // 7. Hành động chuyển đổi sang thanh toán COD
  const handleConvertToCod = async (onSuccess?: () => void) => {
    if (!orderCode) return;
    try {
      setIsConverting(true);
      setErrorMessage(null);
      await convertOrderToCod(orderCode);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Lỗi khi chuyển sang hình thức COD.");
    } finally {
      setIsConverting(false);
    }
  };

  return {
    paymentInfo,
    status,
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
  };
}

