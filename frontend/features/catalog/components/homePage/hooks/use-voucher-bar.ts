"use client";

// =============================================================
// features/catalog/components/homePage/hooks/use-voucher-bar.ts
// Hook quản lý logic sao chép mã giảm giá vào clipboard
// =============================================================

import { useEffect, useState } from "react";
import type { PublicVoucher } from "@/lib/voucher";
import { listPublicVouchers } from "@/lib/voucher-api";

export function useVoucherBar() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<PublicVoucher[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    listPublicVouchers({ signal: controller.signal }).then(
      setVouchers,
      // The homepage still loads without the bar.
      () => {},
    );
    return () => controller.abort();
  }, []);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  return {
    vouchers,
    copiedCode,
    handleCopy,
  };
}
