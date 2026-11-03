"use client";

import { useCallback, useEffect, useState } from "react";
import { voucherCapLabel, voucherExpiryLabel, voucherMinimumLabel, voucherValueLabel, type PublicVoucher } from "@/lib/voucher";
import { listPublicVouchers } from "@/lib/voucher-api";
import type { VoucherItem } from "../types";

const PAGE_LIMIT = 50;

/** Every code here can be redeemed: vouchers apply to the whole order, so each is "TOÀN SÀN". */
function toVoucherItem(voucher: PublicVoucher): VoucherItem {
  return {
    id: voucher.code,
    type: "TOÀN SÀN",
    value: voucherValueLabel(voucher),
    valueLabel: "GIẢM",
    maxDiscount: voucherCapLabel(voucher),
    title: voucher.name || `Giảm ${voucherValueLabel(voucher)}`,
    minOrder: voucherMinimumLabel(voucher),
    validUntil: voucherExpiryLabel(voucher),
    code: voucher.code,
  };
}

/** The vouchers on the `/voucher` page. `status` drives its loading, empty, and error states. */
export function usePublicVouchers() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listPublicVouchers({ limit: PAGE_LIMIT, signal: controller.signal }).then(
      (items) => {
        setVouchers(items.map(toVoucherItem));
        setStatus("ready");
      },
      () => {
        if (!controller.signal.aborted) setStatus("error");
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);

  return { vouchers, status, retry };
}
