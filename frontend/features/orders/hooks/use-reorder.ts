"use client";

// =============================================================
// features/orders/hooks/use-reorder.ts
// Hook quản lý thao tác Mua lại đơn hàng hoàn thành
// =============================================================

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ReorderApiError, reorderCompletedOrderApi } from "../services/reorder.service";

export function useReorder() {
  const router = useRouter();
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const handleReorder = useCallback(
    async (orderId: string) => {
      if (reorderingId) return;
      setReorderingId(orderId);
      setReorderError(null);

      try {
        const result = await reorderCompletedOrderApi(orderId);

        // Kích hoạt cập nhật badge giỏ hàng trên Header/TopBar
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cart-updated"));

          // Lưu thông báo kết quả để hiển thị trên trang Giỏ hàng
          if (result.unavailableCount > 0) {
            const unavailableNames = result.unavailableItems.map((i) => i.name).filter(Boolean);
            const detailText = unavailableNames.length > 0 ? `: ${unavailableNames.join(", ")}` : "";
            sessionStorage.setItem(
              "petly_reorder_notice",
              JSON.stringify({
                type: "warning",
                message: `Đã thêm ${result.addedCount} sản phẩm vào giỏ hàng. Có ${result.unavailableCount} sản phẩm không thể thêm do hết hàng hoặc ngừng kinh doanh${detailText}.`,
              }),
            );
          } else {
            sessionStorage.setItem(
              "petly_reorder_notice",
              JSON.stringify({
                type: "success",
                message: `Đã thêm toàn bộ sản phẩm từ đơn hàng #${result.orderCode} vào giỏ hàng thành công!`,
              }),
            );
          }
        }

        router.push("/cart");
      } catch (error) {
        const message =
          error instanceof ReorderApiError
            ? error.message
            : "Chưa thể thực hiện mua lại đơn hàng. Vui lòng thử lại sau.";
        setReorderError(message);
      } finally {
        setReorderingId(null);
      }
    },
    [reorderingId, router],
  );

  return {
    reorderingId,
    isReordering: Boolean(reorderingId),
    reorderError,
    clearReorderError: () => setReorderError(null),
    handleReorder,
  };
}
