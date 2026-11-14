import "server-only";
import { serverGet } from "@/lib/server-api";
import type { AdminVoucherDetail } from "../types";

/** Renders the not-found page for an unknown code; call it inside a Suspense child. */
export function getVoucher(code: string) {
  return serverGet<AdminVoucherDetail>(`/api/v1/admin/vouchers/${encodeURIComponent(code)}`);
}
