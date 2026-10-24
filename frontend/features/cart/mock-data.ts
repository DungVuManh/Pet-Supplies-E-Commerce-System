// =============================================================
// features/cart/mock-data.ts
// Dữ liệu mẫu ban đầu cho giỏ hàng (khớp đúng 100% theo ảnh thiết kế)
// =============================================================

import type { CartItem } from "./types";

export const INITIAL_MOCK_CART_ITEMS: CartItem[] = [
  {
    id: "cart-item-1",
    product: {
      id: "1",
      name: "Royal Canin Mini Adult",
      description: "Thức ăn cho chó trưởng thành · 2 kg",
      sku: "RC-D02",
      price: 420000,
      image: "/images/products/royal-canin-mini-adult.png",
    },
    quantity: 1,
  },
  {
    id: "cart-item-2",
    product: {
      id: "2",
      name: "Royal Canin Indoor 27",
      description: "Thức ăn cho mèo trong nhà · 2 kg",
      sku: "RC-C02",
      price: 480000,
      image: "/images/products/royal-canin-indoor.png",
    },
    quantity: 1,
  },
  {
    id: "cart-item-3",
    product: {
      id: "3",
      name: "Bóng cao su KONG",
      description: "Đồ chơi cho chó · Cỡ nhỏ",
      sku: "KP-B01",
      price: 85000,
      image: "/images/products/kong-ball.png",
    },
    quantity: 2,
  },
];
