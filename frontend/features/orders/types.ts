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
