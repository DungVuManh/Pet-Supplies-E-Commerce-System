// =============================================================
// features/cart/services/cart.service.ts
// Service gọi API backend giỏ hàng (MongoDB)
// =============================================================

import type { BackendCartResponse } from "../types";

const GUEST_TOKEN_KEY = "petly_guest_token";

// Lấy hoặc tạo guest token trong localStorage
export function getOrCreateGuestToken(): string {
  if (typeof window === "undefined") return "";

  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

// 1. POST /api/v1/cart/items - Thêm sản phẩm vào giỏ trong DB
export async function addToCartApi(payload: {
  productId: string;
  variantSku: string;
  quantity: number;
}): Promise<BackendCartResponse> {
  const guestToken = getOrCreateGuestToken();

  const response = await fetch("/api/v1/cart/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-guest-token": guestToken,
    },
    credentials: "include",
    body: JSON.stringify({
      ...payload,
      guestToken,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Không thể thêm vào giỏ hàng");
  }

  if (data.data?.guestToken && typeof window !== "undefined") {
    localStorage.setItem(GUEST_TOKEN_KEY, data.data.guestToken);
  }

  return data;
}

// 2. GET /api/v1/cart - Lấy dữ liệu giỏ hàng từ DB
export async function getCartApi(): Promise<BackendCartResponse> {
  const guestToken = getOrCreateGuestToken();

  const response = await fetch(`/api/v1/cart?guestToken=${encodeURIComponent(guestToken)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-guest-token": guestToken,
    },
    credentials: "include",
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Không thể tải giỏ hàng");
  }

  if (data.data?.guestToken && typeof window !== "undefined") {
    localStorage.setItem(GUEST_TOKEN_KEY, data.data.guestToken);
  }

  return data;
}

// 2. PATCH /api/v1/cart/items/:sku - Cập nhật số lượng sản phẩm trong DB
export async function updateCartItemQuantityApi(
  sku: string,
  quantity: number
): Promise<BackendCartResponse> {
  const guestToken = getOrCreateGuestToken();

  const response = await fetch(`/api/v1/cart/items/${encodeURIComponent(sku)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-guest-token": guestToken,
    },
    credentials: "include",
    body: JSON.stringify({ quantity, guestToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Không thể cập nhật số lượng");
  }

  return data;
}

// 3. DELETE /api/v1/cart/items/:sku - Xóa sản phẩm khỏi giỏ trong DB
export async function removeCartItemApi(sku: string): Promise<BackendCartResponse> {
  const guestToken = getOrCreateGuestToken();

  const response = await fetch(
    `/api/v1/cart/items/${encodeURIComponent(sku)}?guestToken=${encodeURIComponent(guestToken)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-guest-token": guestToken,
      },
      credentials: "include",
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Không thể xóa sản phẩm khỏi giỏ");
  }

  return data;
}
