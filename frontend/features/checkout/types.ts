export type ShippingMethod = {
  id: string;
  name: string;
  price: number;
  estimatedDelivery: string;
};

export type ShippingAddress = {
  fullName: string;
  phone: string;
  address: string;
};

export type PaymentMethodType = "vnpay" | "cod" | "sepay";

export type CheckoutOrderItem = {
  id: string;
  productId: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
};

export type CheckoutSummary = {
  totalQuantity: number;
  subtotal: number;
  // shippingFee: number;
  /** Set only when a voucher applies. */
  discount?: number;
  promotionCode?: string;
  total: number;
};
