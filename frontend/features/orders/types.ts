// =============================================================
// features/orders/types.ts
// Định nghĩa kiểu dữ liệu cho tính năng Đơn hàng của tôi
// =============================================================

export type CustomerOrderStatus =
  | "all"
  | "pending"    // Chờ xử lý
  | "shipping"   // Đang giao
  | "completed"  // Hoàn thành
  | "cancelled"; // Đã hủy

export type CustomerOrder = {
  id: string;
  orderCode: string;         // Mã đơn: #PA261012018
  orderDate: string;         // Ngày đặt: 12/10/2026
  productsSummary: string;   // Tên tóm tắt sản phẩm
  itemCount: number;         // Số lượng món đồ
  totalAmount: number;       // Tổng tiền: 1.100.000 đ
  status: "pending" | "shipping" | "completed" | "cancelled";
  statusLabel: string;       // Nhãn hiển thị: "Chờ xử lý", "Đang giao", ...
};

export type OrderDetailProductItem = {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
};

export type OrderTimelineStep = {
  id: string;
  title: string;
  description: string;
  status: "completed" | "active" | "pending";
};

export type OrderDetail = {
  id: string;
  orderCode: string;
  orderDate: string;
  orderTime: string;
  itemCount: number;
  status: "pending" | "shipping" | "completed" | "cancelled";
  statusLabel: string;
  timeline: OrderTimelineStep[];
  items: OrderDetailProductItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionCode: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
};
