// features/catalog/components/cardDetailProduct/services/cart.service.ts
// Service gửi yêu cầu thêm sản phẩm vào giỏ hàng lưu vào MongoDB

const GUEST_TOKEN_KEY = "petly_guest_token";

// Helper lấy hoặc sinh guest token cho khách chưa đăng nhập
export function getOrCreateGuestToken(): string {
  if (typeof window === "undefined") return "";

  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

export type AddToCartPayload = {
  productId: string;
  variantSku: string;
  quantity: number;
};

export type AddToCartResponse = {
  success: boolean;
  data?: {
    cart: unknown;
    guestToken?: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
  };
};

/**
 * Gọi API POST /api/v1/cart/items để lưu sản phẩm vào MongoDB
 */
export async function addToCartApi(
  payload: AddToCartPayload
): Promise<AddToCartResponse> {
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
    throw new Error(data.error?.message || "Không thể thêm sản phẩm vào giỏ hàng");
  }

  if (data.data?.guestToken && typeof window !== "undefined") {
    localStorage.setItem(GUEST_TOKEN_KEY, data.data.guestToken);
  }

  return data;
}
