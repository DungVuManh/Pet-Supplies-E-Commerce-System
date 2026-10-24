// =============================================================
// features/orders/hooks/use-order-detail.ts
// Hook lấy chi tiết 1 đơn hàng từ API theo ID
// =============================================================

import { useEffect, useState } from "react";
import { getOrderDetailApi } from "../services/order.service";
import type { OrderDetail } from "../types";

export function useOrderDetail(orderId: string | undefined) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Không gọi API nếu chưa có ID
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    async function loadOrderDetail() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await getOrderDetailApi(orderId!);
        // res.data.order là object chi tiết đơn hàng từ backend
        setOrder(res.data?.order || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải đơn hàng.");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrderDetail();
  }, [orderId]); // Chạy lại khi orderId thay đổi

  return { order, isLoading, error };
}
