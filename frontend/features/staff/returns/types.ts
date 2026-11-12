// =============================================================
// features/staff/returns/types.ts
// Định nghĩa kiểu dữ liệu cho giao diện Quản lý hoàn trả của Staff
// =============================================================

export type StaffReturnStatus = "all" | "pending" | "approved" | "rejected";

export type StaffReturnCustomer = {
  name: string;
  phone: string;
  email: string;
};

export type StaffReturnBankAccount = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export type StaffReturnRequestInfo = {
  reason: "damaged_or_defective" | "not_received" | "missing_items" | "damaged_or_missing";
  bankAccount?: StaffReturnBankAccount | null;
  description: string;
  images: string[];
  imageCount?: number;
  status: "pending" | "approved" | "rejected";
  refundRequired: boolean;
  refundStatus: "none" | "pending_refund" | "refunded";
  requestedAt: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  rejectionReason: string | null;
};

export type StaffReturnItem = {
  id: string;
  orderCode: string;
  customer: StaffReturnCustomer;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  returnRequest: StaffReturnRequestInfo;
};

export type StaffReturnOrderItem = {
  productId?: string;
  name: string;
  variantSku: string;
  unitPrice: number;
  qty: number;
  totalPrice: number;
  image: string;
};

export type StaffReturnDetail = {
  id: string;
  orderCode: string;
  channel: string;
  customer: StaffReturnCustomer;
  shippingAddress: {
    fullName?: string;
    recipientName?: string;
    phone: string;
    street?: string;
    ward?: string;
    district?: string;
    province?: string;
  };
  shipping?: {
    carrier?: string;
    trackingNumber?: string;
  };
  items: StaffReturnOrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  statusHistory: Array<{
    from: string;
    to: string;
    by?: string;
    at: string;
  }>;
  returnRequest: StaffReturnRequestInfo;
};

export type StaffReturnsCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type StaffReturnsListResponse = {
  items: StaffReturnItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  counts: StaffReturnsCounts;
};

export const RETURN_REASON_LABELS: Record<string, string> = {
  damaged_or_defective: "Hàng có vấn đề",
  not_received: "Chưa nhận được hàng",
  missing_items: "Thiếu hàng",
  damaged_or_missing: "Hàng có vấn đề hoặc thiếu hàng",
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  approved: "Đã chấp nhận",
  rejected: "Đã từ chối",
};

