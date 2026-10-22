"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recoverSale, SaleApiError, submitSale, type SaleInput, type SaleReceipt } from "./sale-api";

export function useSaleSubmission(userId: string | undefined) {
  const router = useRouter();
  const requestId = useRef("");
  const intent = useRef<SaleInput | null>(null);
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const storageKey = `petly-pending-sale:${userId}`;
  const finish = useCallback((order: SaleReceipt) => {
    try { sessionStorage.removeItem(storageKey); } catch { /* Retry still works in memory when storage is unavailable. */ }
    router.replace(`/staff/orders/${order.id}`);
  }, [router, storageKey]);
  const authRedirect = useCallback((failure: unknown) => {
    if (!(failure instanceof SaleApiError)) return false;
    if (failure.status === 401 || failure.code === "PROFILE_INCOMPLETE") { router.replace("/login"); return true; }
    if (failure.code === "FORBIDDEN") { router.replace("/forbidden"); return true; }
    return false;
  }, [router]);

  const lookupPending = useCallback(() => recoverSale(requestId.current).then(finish, (failure: unknown) => {
      if (authRedirect(failure)) return;
      if (failure instanceof SaleApiError && failure.code === "CREATION_NOT_FOUND") {
        setRecoveryRequired(false);
      } else {
        setRecoveryRequired(true);
        setError("Chưa thể kiểm tra đơn trước đó. Hãy kiểm tra lại trước khi tạo đơn mới.");
      }
    }).finally(() => setChecking(false)), [authRedirect, finish]);
  const checkPending = useCallback(async () => {
    setChecking(true);
    setError("");
    await lookupPending();
  }, [lookupPending]);

  useEffect(() => {
    if (!userId) return;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(storageKey); } catch { /* Storage is optional; no customer data is persisted. */ }
    const pending = saved && /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(saved) ? saved : null;
    requestId.current = pending || crypto.randomUUID();
    void lookupPending();
  }, [userId, storageKey, lookupPending]);

  useEffect(() => {
    if (!busy && !uncertain) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, uncertain]);

  async function submit(input: SaleInput) {
    if (sending.current || checking || recoveryRequired || !requestId.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    intent.current ??= input;
    try {
      try { sessionStorage.setItem(storageKey, requestId.current); } catch { /* Keep the same request ID in memory. */ }
      finish(await submitSale(intent.current, requestId.current));
    } catch (failure) {
      if (authRedirect(failure)) return;
      if (failure instanceof SaleApiError && failure.code === "IDEMPOTENCY_CONFLICT") {
        setRecoveryRequired(true);
        await checkPending();
        return;
      }
      const knownAbort = failure instanceof SaleApiError &&
        ([400, 404, 409, 415].includes(failure.status) || ["CSRF_INVALID", "TRANSACTIONS_REQUIRED"].includes(failure.code));
      setUncertain(!knownAbort);
      if (knownAbort) intent.current = null;
      setError(failure instanceof SaleApiError ? failure.message : "Chưa thể xác nhận kết quả. Hãy gửi lại cùng yêu cầu.");
    } finally { sending.current = false; setBusy(false); }
  }
  return { submit, busy, checking, recoveryRequired, uncertain, error, checkPending };
}
