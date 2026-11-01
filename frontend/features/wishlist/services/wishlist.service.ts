// =============================================================
// features/wishlist/services/wishlist.service.ts
// Các hàm gọi API Wishlist từ backend
// =============================================================

import type { WishlistResponse, ToggleWishlistResponse } from "../types";

const BASE_URL = "/api/v1/wishlist";

/**
 * 1. Lấy danh sách sản phẩm yêu thích từ server
 */
export async function getWishlistApi(): Promise<WishlistResponse> {
  const res = await fetch(`${BASE_URL}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Lỗi tải danh sách yêu thích: ${res.status}`);
  }

  return res.json();
}

/**
 * 2. Bật / Tắt lưu sản phẩm vào danh sách yêu thích
 */
export async function toggleWishlistApi(productId: string): Promise<ToggleWishlistResponse> {
  const res = await fetch(`${BASE_URL}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Lỗi thao tác yêu thích: ${res.status}`);
  }

  return data;
}

/**
 * 3. Xóa một sản phẩm khỏi danh sách yêu thích
 */
export async function removeWishlistItemApi(productId: string): Promise<ToggleWishlistResponse> {
  const res = await fetch(`${BASE_URL}/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Lỗi xóa sản phẩm khỏi yêu thích: ${res.status}`);
  }

  return data;
}

/**
 * 4. Xóa toàn bộ sản phẩm trong danh sách yêu thích
 */
export async function clearWishlistApi(): Promise<{ success: boolean; data: { message: string } }> {
  const res = await fetch(`${BASE_URL}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Lỗi xóa toàn bộ yêu thích: ${res.status}`);
  }

  return data;
}

/**
 * 5. Kiểm tra một sản phẩm đã có trong wishlist hay chưa
 */
export async function checkWishlistStatusApi(productId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/check/${encodeURIComponent(productId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.data?.inWishlist);
  } catch {
    return false;
  }
}

