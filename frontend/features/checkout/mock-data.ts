// =============================================================
// features/checkout/mock-data.ts
// Dữ liệu mẫu ban đầu cho màn hình Thanh toán (khớp 100% ảnh thiết kế)
// =============================================================

import type {
  CheckoutOrderItem,
  ShippingAddress,
  ShippingMethod,
} from "./types";

export const MOCK_SHIPPING_ADDRESS: ShippingAddress = {
  fullName: "Nguyễn Minh Anh",
  phone: "0901 234 567",
  address: "28 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
};

export const MOCK_SHIPPING_METHOD: ShippingMethod = {
  id: "standard",
  name: "Giao hàng tiêu chuẩn",
  price: 30000,
  estimatedDelivery: "14–15/10/2026",
};

export const MOCK_CHECKOUT_ITEMS: CheckoutOrderItem[] = [
  {
    id: "item-1",
    name: "Royal Canin Mini Adult",
    description: "Thức ăn cho chó trưởng thành · 2 kg",
    sku: "RC-D02",
    price: 420000,
    quantity: 1,
    image: "/images/products/royal-canin-mini-adult.png",
  },
  {
    id: "item-2",
    name: "Royal Canin Indoor 27",
    description: "Thức ăn cho mèo trong nhà · 2 kg",
    sku: "RC-C02",
    price: 480000,
    quantity: 1,
    image: "/images/products/royal-canin-indoor.png",
  },
  {
    id: "item-3",
    name: "Bóng cao su KONG",
    description: "Đồ chơi cho chó · Cỡ nhỏ",
    sku: "KP-B01",
    price: 85000,
    quantity: 2,
    image: "/images/products/kong-ball.png",
  },
];
