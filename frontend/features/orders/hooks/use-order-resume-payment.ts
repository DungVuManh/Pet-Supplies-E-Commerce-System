import { useCallback, useEffect, useRef, useState } from "react";
import {
  convertOrderToCodApi,
  getOrderPaymentSessionApi,
  renewOrderPaymentSessionApi,
  ResumePaymentApiError,
} from "../services/resume-payment.service";
import type { CustomerOrderPaymentSession } from "../types";

export function useOrderResumePayment(orderId: string | undefined) {
  const [session, setSession] = useState<CustomerOrderPaymentSession | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderId));
  const [isChecking, setIsChecking] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);

  const hasLoadedRef = useRef(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExpiryIsoRef = useRef<string | null>(null);

  const applySession = useCallback((next: CustomerOrderPaymentSession) => {
    setSession(next);
    setErrorMessage(null);
    setErrorStatus(null);
    if (next.state === "eligible" && next.paymentInfo) {
      const nextExpiry = next.paymentInfo.paymentExpiredAt;
      if (lastExpiryIsoRef.current !== nextExpiry) {
        lastExpiryIsoRef.current = nextExpiry;
      }
      setSecondsLeft(Math.max(0, next.paymentInfo.secondsLeft));
    } else {
      setSecondsLeft(0);
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getOrderPaymentSessionApi(orderId!);
        if (!cancelled) {
          applySession(data);
          hasLoadedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ResumePaymentApiError) {
            setErrorMessage(err.message);
            setErrorStatus(err.status);
          } else {
            setErrorMessage(
              err instanceof Error
                ? err.message
                : "Không thể tải thông tin thanh toán."
            );
            setErrorStatus(0);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [applySession, orderId, reloadTick]);

  const reloadSession = useCallback(() => {
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setErrorMessage(null);
    setErrorStatus(null);
    setReloadTick((v) => v + 1);
  }, []);

  const isEligible = session?.state === "eligible";
  const isExpired = Boolean(isEligible && secondsLeft <= 0);

  // Đồng hồ đếm ngược 1 giây khi phiên vẫn còn hiệu lực (Q3: A - không tự gia hạn)
  useEffect(() => {
    if (!isEligible || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isEligible, secondsLeft]);

  const refreshFromServer = useCallback(
    async (isManual: boolean) => {
      if (!orderId) return;
      if (isManual) setIsChecking(true);
      try {
        const next = await getOrderPaymentSessionApi(orderId);
        applySession(next);
      } catch (err) {
        if (isManual) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Không thể kiểm tra trạng thái thanh toán."
          );
          if (err instanceof ResumePaymentApiError) {
            setErrorStatus(err.status);
          }
        }
      } finally {
        if (isManual) setIsChecking(false);
      }
    },
    [applySession, orderId]
  );

  // Polling ngầm 3 giây khi mã QR còn hiệu lực
  useEffect(() => {
    if (!isEligible || isExpired) return;
    const interval = setInterval(() => {
      void refreshFromServer(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [isEligible, isExpired, refreshFromServer]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleManualCheck = useCallback(() => {
    void refreshFromServer(true);
  }, [refreshFromServer]);

  const handleCopy = useCallback((text: string, fieldName: string) => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedField(fieldName);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  }, []);

  const handleRenewSession = useCallback(async () => {
    if (!orderId || isRenewing) return;
    setIsRenewing(true);
    setErrorMessage(null);
    try {
      const result = await renewOrderPaymentSessionApi(orderId);
      setSecondsLeft(Math.max(0, result.secondsLeft));
      await refreshFromServer(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không thể gia hạn mã thanh toán."
      );
      await refreshFromServer(false);
    } finally {
      setIsRenewing(false);
    }
  }, [isRenewing, orderId, refreshFromServer]);

  const handleConvertToCod = useCallback(async () => {
    if (!orderId || isConverting) return;
    setIsConverting(true);
    setErrorMessage(null);
    try {
      await convertOrderToCodApi(orderId);
      await refreshFromServer(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không thể chuyển sang phương thức COD."
      );
      await refreshFromServer(false);
    } finally {
      setIsConverting(false);
    }
  }, [isConverting, orderId, refreshFromServer]);

  return {
    session,
    isLoading,
    isChecking,
    isRenewing,
    isConverting,
    errorMessage,
    errorStatus,
    copiedField,
    secondsLeft,
    isExpired,
    reloadSession,
    handleManualCheck,
    handleCopy,
    handleRenewSession,
    handleConvertToCod,
  };
}

