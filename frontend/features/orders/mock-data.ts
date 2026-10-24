// =============================================================
// features/orders/mock-data.ts
// Dữ liệu mẫu ban đầu cho Đơn hàng của tôi (khớp 100% ảnh thiết kế)
// =============================================================

import type { CustomerOrder, OrderDetail } from "./types";

export const MOCK_CUSTOMER_PROFILE = {
  fullName: "Nguyễn Minh Anh",
  joinedDate: "Thành viên từ tháng 03/2025",
  phone: "1900 636 789",
};

export const MOCK_CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    id: "ord-1",
    orderCode: "#PA261012018",
    orderDate: "12/10/2026",
    productsSummary: "Royal Canin Mini Adult, Indoor 27...",
    itemCount: 4,
    totalAmount: 1100000,
    status: "pending",
    statusLabel: "Chờ xử lý",
  },
  {
    id: "ord-2",
    orderCode: "#PA261009052",
    orderDate: "09/10/2026",
    productsSummary: "Cát mèo Cat’s Best Original",
    itemCount: 2,
    totalAmount: 420000,
    status: "shipping",
    statusLabel: "Đang giao",
  },
  {
    id: "ord-3",
    orderCode: "#PA261002031",
    orderDate: "02/10/2026",
    productsSummary: "Royal Canin Mini Adult",
    itemCount: 1,
    totalAmount: 450000,
    status: "completed",
    statusLabel: "Hoàn thành",
  },
  {
    id: "ord-4",
    orderCode: "#PA260925014",
    orderDate: "25/09/2026",
    productsSummary: "Dây dắt đệm êm, Bóng KONG",
    itemCount: 2,
    totalAmount: 280000,
    status: "completed",
    statusLabel: "Hoàn thành",
  },
  {
    id: "ord-5",
    orderCode: "#PA260918008",
    orderDate: "18/09/2026",
    productsSummary: "Bát ăn inox chống trượt",
    itemCount: 1,
    totalAmount: 150000,
    status: "cancelled",
    statusLabel: "Đã hủy",
  },
];

export const MOCK_ORDER_DETAIL: OrderDetail = {
  id: "ord-1",
  orderCode: "#PA261012018",
  orderDate: "12/10/2026",
  orderTime: "10:42",
  itemCount: 4,
  status: "pending",
  statusLabel: "Chờ xử lý",
  timeline: [
    {
      id: "step-1",
      title: "Đã đặt hàng",
      description: "12/10 · 10:42",
      status: "completed",
    },
    {
      id: "step-2",
      title: "Đang chuẩn bị",
      description: "Chờ xác nhận",
      status: "active",
    },
    {
      id: "step-3",
      title: "Đang giao",
      description: "Dự kiến 13/10",
      status: "pending",
    },
    {
      id: "step-4",
      title: "Hoàn thành",
      description: "Dự kiến 14-15/10",
      status: "pending",
    },
  ],
  items: [
    {
      id: "item-1",
      name: "Royal Canin Mini Adult",
      description: "Thức ăn cho chó trưởng thành · 2 kg",
      sku: "RC-002",
      price: 420000,
      quantity: 1,
      image: "/images/products/royal-canin-mini-adult.png",
    },
    {
      id: "item-2",
      name: "Royal Canin Indoor 27",
      description: "Thức ăn cho mèo trong nhà · 2 kg",
      sku: "RC-003",
      price: 480000,
      quantity: 1,
      image: "/images/products/royal-canin-indoor.png",
    },
    {
      id: "item-3",
      name: "Bóng cao su KONG",
      description: "Đồ chơi cho chó · Cỡ nhỏ",
      sku: "KP-801",
      price: 85000,
      quantity: 2,
      image: "/images/products/kong-ball.png",
    },
  ],
  subtotal: 1070000,
  shippingFee: 30000,
  discount: 0,
  totalAmount: 1100000,
  paymentMethod: "VNPay",
  paymentStatus: "Đã thanh toán · 1.100.000 đ",
  transactionCode: "VNP261012103642",
  shippingAddress: {
    fullName: "Nguyễn Minh Anh",
    phone: "0901 234 567",
    address: "28 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
  },
};
