// =============================================================
// features/vouchers/services/customer-voucher.service.ts
// Service API cho Ví voucher và Lưu mã giảm giá của khách hàng
// =============================================================

import type {
  CustomerVoucherItem,
  CustomerVoucherListResponse,
  CustomerVoucherTab,
} from "../types/customer-voucher";

const BASE_URL = "/api/v1/customer/vouchers";

/**
 * Lấy danh sách mã giảm giá trong ví cá nhân
 */
export async function listCustomerVouchersApi(params?: {
  status?: CustomerVoucherTab;
  page?: number;
  limit?: number;
  subtotal?: number;
}): Promise<CustomerVoucherListResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.subtotal != null) query.set("subtotal", String(params.subtotal));

  const url = `${BASE_URL}${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || `Lỗi tải danh sách ví voucher: ${res.status}`);
  }

  return json.data;
}

/**
 * Lưu một mã giảm giá vào ví cá nhân
 */
export async function saveVoucherApi(code: string): Promise<{
  success: boolean;
  message: string;
  data: CustomerVoucherItem;
}> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || `Lỗi lưu mã giảm giá: ${res.status}`);
  }

  return json;
}

/**
 * Bỏ lưu một mã giảm giá khỏi ví
 */
export async function removeVoucherApi(code: string): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || `Lỗi bỏ lưu mã giảm giá: ${res.status}`);
  }

  return json;
}

/**
 * Lấy danh sách mã code người dùng đã lưu để phục vụ hiển thị nhanh storefront
 */
export async function getSavedVoucherCodesApi(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/ids`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    // If not logged in (401), return empty array gracefully
    if (res.status === 401) {
      return [];
    }
    throw new Error(`Lỗi tải danh sách mã đã lưu: ${res.status}`);
  }

  const json = await res.json();
  return json?.data?.savedCodes || [];
}

/**
 * Đồng bộ danh sách mã từ LocalStorage của khách vào tài khoản
 */
export async function syncVouchersApi(codes: string[]): Promise<{
  success: boolean;
  message: string;
  data: { syncedCount: number };
}> {
  if (!codes || codes.length === 0) {
    return { success: true, message: "Không có mã cần đồng bộ", data: { syncedCount: 0 } };
  }

  const res = await fetch(`${BASE_URL}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes }),
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || `Lỗi đồng bộ mã giảm giá: ${res.status}`);
  }

  return json;
}

