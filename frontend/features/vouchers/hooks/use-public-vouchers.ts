"use client";

// =============================================================
// features/vouchers/hooks/use-public-vouchers.ts
// Hook fetch dữ liệu danh sách Promotion từ Backend API
// Hỗ trợ xử lý cả type: "percent" và type: "fixed"
// =============================================================

import { useCallback, useEffect, useState } from "react";
import type { VoucherItem } from "../types";
import { fetchPromotions, promotionToVoucherItem } from "../services/voucher.service";

export function usePublicVouchers() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    fetchPromotions(controller.signal)
      .then((promotions) => {
        // Chuyển đổi danh sách model promotion từ MongoDB sang VoucherItem hiển thị UI
        const mappedItems: VoucherItem[] = (promotions || []).map(promotionToVoucherItem);
        setVouchers(mappedItems);
        setStatus("ready");
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Lỗi khi tải mã giảm giá:", err);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((v) => v + 1);
  }, []);

  return { vouchers, status, retry };
}

export default usePublicVouchers;
