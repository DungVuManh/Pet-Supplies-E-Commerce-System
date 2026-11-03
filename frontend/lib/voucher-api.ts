import { apiGet, apiSend } from "./api-client";
import type { PublicVoucher, VoucherQuote, VoucherQuoteItem } from "./voucher";

/** What a code would take off these items. Rejects with `ApiError` code `VOUCHER_INVALID` when it does not apply. */
export function quoteVoucher(code: string, items: VoucherQuoteItem[], phone?: string) {
  return apiSend<VoucherQuote>("POST", "/api/v1/vouchers/quote", { code, items, ...(phone ? { phone } : {}) });
}

/** Vouchers the storefront may advertise. */
export async function listPublicVouchers({ limit, signal }: { limit?: number; signal?: AbortSignal } = {}) {
  const { items } = await apiGet<{ items: PublicVoucher[] }>("/api/v1/vouchers/public", { limit }, { signal });
  return items;
}
