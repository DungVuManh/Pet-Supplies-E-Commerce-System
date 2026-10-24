// =============================================================
// features/orders/services/order.service.ts
// Service gọi API đặt hàng, hủy đơn hàng, và lấy danh sách đơn của tôi
// =============================================================

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
  const response = await fetch("/api/v1/orders", {
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
  const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
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
