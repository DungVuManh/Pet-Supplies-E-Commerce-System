// features/catalog/components/cardDetailProduct/services/cart.service.ts
// Re-export từ service giỏ hàng dùng chung để đồng bộ hành vi (Guest -> localStorage, User -> MongoDB)

export {
  addToCartApi,
  getCartApi,
  updateCartItemQuantityApi,
  removeCartItemApi,
  getOrCreateGuestToken,
  clearGuestCart,
  type AddToCartPayload,
} from "@/features/cart/services/cart.service";

export type AddToCartResponse = {
  success: boolean;
  data?: {
    cart: unknown;
    guestToken?: string;
    message?: string;
  };
  error?: {
    code: string;
    message: string;
  };
};
