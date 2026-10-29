"use client";

// =============================================================
// features/catalog/components/homePage/hooks/use-voucher-bar.ts
// Hook quản lý logic sao chép mã giảm giá vào clipboard
// =============================================================

import { useState } from "react";

export function useVoucherBar() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
    copiedCode,
    handleCopy,
  };
}
