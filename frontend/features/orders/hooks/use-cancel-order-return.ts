import { useState } from "react";
import { cancelReturnRequestApi, OrderReturnApiError } from "../services/order-return.service";

export function useCancelOrderReturn(orderId: string, requestId: string, reload?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      await cancelReturnRequestApi(orderId, requestId);
      reload?.();
      return true;
    } catch (error) {
      if (error instanceof OrderReturnApiError && error.status === 409) reload?.();
      setError(error instanceof Error ? error.message : "Không thể hủy yêu cầu hoàn đơn.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, cancel, clearError: () => setError("") };
}
