// =============================================================
// features/orders/mock-data.ts
// Dữ liệu mẫu ban đầu cho Đơn hàng của tôi (khớp 100% ảnh thiết kế)
// =============================================================

import type { CustomerOrder } from "./types";

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
