// =============================================================
// features/orders/services/order.service.ts
// Service gọi API đặt hàng và hủy đơn hàng (dùng chung cho Mua ngay & Giỏ hàng)
// =============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
};

// 1. POST /api/v1/orders - Tạo đơn hàng trực tiếp vào MongoDB
export async function createOrderApi(payload: CreateOrderPayload) {
  const response = await fetch(`${BASE_URL}/api/v1/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Không thể tạo đơn hàng.");
  }

  return data;
}

// 2. DELETE /api/v1/orders/:id - Hủy và xóa đơn hàng vừa tạo trong DB
export async function deleteOrderApi(orderId: string) {
  const response = await fetch(`${BASE_URL}/api/v1/orders/${encodeURIComponent(orderId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Không thể xóa đơn hàng.");
  }

  return data;
}
