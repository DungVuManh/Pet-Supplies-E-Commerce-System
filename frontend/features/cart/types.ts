// =============================================================
// features/cart/types.ts
// Các kiểu dữ liệu cho Giỏ hàng (Cart)
// =============================================================

export type CartProduct = {
  id: string;
  productId: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  image: string;
  brand?: string;
  label?: string;
  stock?: number;
  availableStock?: number;
};

export type CartItem = {
  id: string;
  product: CartProduct;
  quantity: number;
};

export type CartSummary = {
  distinctCount: number;
  totalQuantity: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
};

export type BackendCartItem = {
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
  stock: number;
  availableStock: number;
};

export type BackendCartResponse = {
  success: boolean;
  data: {
    cart: {
      _id: string;
      userId?: string;
      guestToken?: string;
      items: BackendCartItem[];
      summary: CartSummary;
    };
    guestToken?: string;
  };
};
