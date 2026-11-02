// =============================================================
// features/orders/services/order.service.ts
// Service gọi API đặt hàng, hủy đơn hàng, lấy danh sách đơn của tôi & Mua ngay
// =============================================================

import { getOrCreateGuestToken } from "@/features/cart/services/cart.service";

export const BUY_NOW_SESSION_KEY = "petly_buy_now_session";

export type BuyNowPreviewPayload = {
  productId: string;
  variantSku?: string;
  quantity?: number;
};

export type BuyNowSessionData = {
  item: {
    id: string;
    productId: string;
    name: string;
    brand?: string;
    description?: string;
    sku: string;
    label?: string;
    price: number;
    quantity: number;
    itemTotal: number;
    image: string;
    availableStock?: number;
  };
  summary: {
    totalQuantity: number;
    subtotal: number;
    total: number;
  };
};

export type CreateOrderItemPayload = {
  productId: string;
  variantSku: string;
  qty: number;
};

export type CreateOrderPayload = {
  items: CreateOrderItemPayload[];
  shippingAddress?: {
    recipientName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    street: string;
  };
  guestInfo?: {
    name: string;
    phone: string;
    email?: string;
  };
  paymentMethod?: "COD" | "ONLINE";
  guestToken?: string;
  isBuyNow?: boolean;
};

// 0. POST /api/v1/orders/buy-now-preview - Kiểm tra tính hợp lệ & tồn kho cho Mua ngay
export async function previewBuyNowApi(payload: BuyNowPreviewPayload): Promise<{
  success: boolean;
  data: BuyNowSessionData;
  message?: string;
}> {
  const response = await fetch("/api/v1/orders/buy-now-preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Không thể chuẩn bị đơn hàng Mua ngay.");
  }

  return data;
}

// Lưu session Mua ngay vào sessionStorage (ghi đè session cũ, không cộng dồn)
export function saveBuyNowSession(data: BuyNowSessionData): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BUY_NOW_SESSION_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Lỗi khi lưu Buy Now session:", err);
  }
}

// Đọc session Mua ngay từ sessionStorage
export function getBuyNowSession(): BuyNowSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BUY_NOW_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Lỗi khi đọc Buy Now session:", err);
    return null;
  }
}

// Xóa session Mua ngay sau khi đặt hàng thành công
export function clearBuyNowSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(BUY_NOW_SESSION_KEY);
  } catch (err) {
    console.error("Lỗi khi xóa Buy Now session:", err);
  }
}

// 1. POST /api/v1/orders - Tạo đơn hàng trực tiếp vào MongoDB
export async function createOrderApi(payload: CreateOrderPayload) {
  const guestToken = payload.guestToken || getOrCreateGuestToken();

  const response = await fetch("/api/v1/orders", {
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
    throw new Error(data.message || "Không thể tạo đơn hàng.");
  }

  return data;
}

// 2. PATCH /api/v1/orders/:id/cancel - Hủy đơn hàng (cập nhật trạng thái sang 'cancelled')
export async function cancelOrderApi(orderId: string, reason?: string, note?: string) {
  const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ reason, note }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Không thể hủy đơn hàng.");
  }

  return data;
}

// Giữ alias deleteOrderApi để tương thích code cũ nếu có
export const deleteOrderApi = cancelOrderApi;

// 3. GET /api/v1/orders/my-orders - Lấy danh sách đơn hàng của user đang đăng nhập
export async function getMyOrdersApi() {
  const response = await fetch("/api/v1/orders/my-orders", {
    method: "GET",
    credentials: "include", // Gửi cookie để backend biết ai đang đăng nhập
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách đơn hàng.");
  }

  return data; // { success: true, data: { orders: [...] } }
}

// 4. GET /api/v1/orders/:id - Lấy chi tiết 1 đơn hàng theo ID
export async function getOrderDetailApi(orderId: string) {
  const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Không thể tải chi tiết đơn hàng.");
  }

  return data; // { success: true, data: { order: {...} } }
}
