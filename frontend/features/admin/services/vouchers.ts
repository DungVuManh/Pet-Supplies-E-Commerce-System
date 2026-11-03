import { apiGet, apiSend } from "@/lib/api-client";
import type { AdminVoucherDetail, AdminVoucherRow, Page, VoucherCounts, VoucherFields, VoucherFilter } from "../types";

const url = (code: string) => `/api/v1/admin/vouchers/${encodeURIComponent(code)}`;

export function listVouchers(query: VoucherFilter & { page: number; pageSize: number }, signal: AbortSignal) {
  return apiGet<Page<AdminVoucherRow, VoucherCounts>>("/api/v1/admin/vouchers", query, { signal });
}

export function createVoucher(fields: VoucherFields) {
  return apiSend<AdminVoucherDetail>("POST", "/api/v1/admin/vouchers", fields);
}

/** The server compares against the stored voucher, so the form sends every field plus the `updatedAt` it loaded. */
export function updateVoucher(code: string, fields: VoucherFields, expectedUpdatedAt: string) {
  return apiSend<AdminVoucherDetail & { changed: boolean }>("PATCH", url(code), { ...fields, expectedUpdatedAt });
}

export function deleteVoucher(code: string) {
  return apiSend<{ code: string }>("DELETE", url(code));
}

export function enableVoucher(code: string) {
  return apiSend<AdminVoucherDetail>("POST", `${url(code)}/enable`);
}

export function disableVoucher(code: string) {
  return apiSend<AdminVoucherDetail>("POST", `${url(code)}/disable`);
}
