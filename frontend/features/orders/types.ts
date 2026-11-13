// =============================================================
// features/orders/types.ts
// Định nghĩa kiểu dữ liệu cho tính năng Đơn hàng của tôi & Tiếp tục thanh toán
// =============================================================

export type CustomerOrderStatus =
  | "all"
  | "pending"    // Chờ xử lý
  | "shipping"   // Đang giao
  | "completed"  // Hoàn thành
  | "cancelled"  // Đã hủy
  | "returned";  // Đã hoàn trả

export type CustomerPaymentMethodCode = "ONLINE" | "COD" | "CASH";

export type CustomerPaymentStatusCode = "unpaid" | "pending" | "paid" | "failed";

export type CustomerPaymentEligibilityState =
  | "eligible"
  | "already_paid"
  | "cancelled"
  | "not_online";

export type ReturnBankAccount = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export type ReturnRequestReason =
  | "damaged_or_missing"
  | "damaged_or_defective"
  | "not_received"
  | "missing_items";

export type ReturnRequestStatus = "pending" | "approved" | "rejected";

export type CustomerOrderReturnRequest = {
  reason: ReturnRequestReason;
  reasonLabel: string;
  bankAccount?: ReturnBankAccount | null;
  description: string;
  images: string[];
  status: ReturnRequestStatus;
  statusLabel: string;
  refundRequired: boolean;
  refundStatus: "none" | "pending_refund" | "refunded";
  requestedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

export function isReturnImageRequired(reason: ReturnRequestReason): boolean {
  return reason !== "not_received";
}

export type CustomerOrder = {
  id: string;
  orderCode: string;         // Mã đơn: #PA261012018
  orderDate: string;         // Ngày đặt: 12/10/2026
  productsSummary: string;   // Tên tóm tắt sản phẩm
  itemCount: number;         // Số lượng món đồ
  totalAmount: number;       // Tổng tiền: 1.100.000 đ
  status: "pending" | "shipping" | "completed" | "cancelled" | "returned";
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
  status: "pending" | "shipping" | "completed" | "cancelled" | "returned";
  statusLabel: string;
  orderStatus?: string;
  channel?: "online" | "offline";
  timeline: OrderTimelineStep[];
  items: OrderDetailProductItem[];
  subtotal: number;
  shippingFee?: number;
  discount: number;
  promotionCode?: string | null;
  totalAmount: number;
  paymentMethod: string;
  paymentMethodLabel?: string;
  paymentStatus: string;
  paymentStatusCode?: CustomerPaymentStatusCode;
  paidAmount?: number;
  remainingAmount?: number;
  paymentExpiredAt?: string | null;
  canResumeOnlinePayment?: boolean;
  canRequestReturn?: boolean;
  canConfirmReceipt?: boolean;
  returnRequest?: CustomerOrderReturnRequest | null;
  transactionCode: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
};

export type OrderVietQrInfo = {
  orderCode: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  memo: string;
  qrUrl: string;
  qrPayload?: string;
  paymentExpiredAt: string;
  secondsLeft: number;
  isExpired: boolean;
  isPaid: boolean;
};

export type CustomerOrderPaymentSession = {
  orderId: string;
  orderCode: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: CustomerPaymentStatusCode;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  needsReview: boolean;
  eligible: boolean;
  state: CustomerPaymentEligibilityState;
  message: string | null;
  paymentInfo: OrderVietQrInfo | null;
};

/**
 * Đơn hàng được phép bấm quay lại thanh toán ONLINE khi phương thức là ONLINE,
 * kênh đặt là online, chưa thanh toán đủ và chưa bị hủy.
 */
export function isOrderEligibleForOnlinePayment(
  order?:
    | Partial<
        Pick<
          OrderDetail,
          | "canResumeOnlinePayment"
          | "channel"
          | "paymentMethod"
          | "paymentStatusCode"
          | "paymentStatus"
          | "orderStatus"
          | "status"
        >
      >
    | null
): boolean {
  if (!order) return false;
  if (typeof order.canResumeOnlinePayment === "boolean") {
    return order.canResumeOnlinePayment;
  }
  if (order.channel === "offline") return false;
  if (order.paymentMethod !== "ONLINE") return false;
  if (order.orderStatus === "cancelled" || order.status === "cancelled") return false;
  if (order.paymentStatusCode === "paid") return false;
  if (!order.paymentStatusCode && order.paymentStatus === "Đã thanh toán") return false;
  return true;
}
