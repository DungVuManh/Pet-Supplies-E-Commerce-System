// =============================================================
// features/orders/hooks/use-order-detail.ts
// Hook lấy chi tiết 1 đơn hàng từ API theo ID
// Tránh unmount UI khi gọi reload() bằng hasLoadedRef
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrderDetailApi } from "../services/order.service";
import type { OrderDetail } from "../types";

export function useOrderDetail(orderId: string | undefined) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    async function loadOrderDetail() {
      try {
        // Chỉ hiện skeleton loading ở lần tải đầu, không unmount khi refetch
        if (!hasLoadedRef.current) {
          setIsLoading(true);
        }
        setError(null);

        const res = await getOrderDetailApi(orderId!);
        if (isMounted) {
          setOrder(res.data?.order || null);
          hasLoadedRef.current = true;
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Không thể tải đơn hàng.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrderDetail();
    return () => {
      isMounted = false;
    };
  }, [orderId, reloadKey]);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  return { order, isLoading, error, reload };
}
