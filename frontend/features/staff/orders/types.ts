export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipping"
  | "completed"
  | "cancelled"
  | "returned";

export type PaymentMethod = "COD" | "ONLINE" | "CASH";
export type StaffEditableOrderStatus = "confirmed" | "processing" | "shipping" | "cancelled";
export type StaffOrderStatusUpdate = {
  expectedStatus: OrderStatus;
  orderStatus: StaffEditableOrderStatus;
  shipping?: StaffOrderShippingInfo;
  cancellationReason?: string;
  cancellationNote?: string;
};
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";
export type OrderChannel = "online" | "offline";
export type SortOption = "createdAt_desc" | "createdAt_asc" | "total_desc" | "total_asc";

export interface StaffOrderCustomer {
  name: string;
  phone: string;
  email?: string | null;
}

export interface StaffOrderListItem {
  id: string;
  orderCode: string;
  createdAt: string;
  customer: StaffOrderCustomer;
  itemCount: number;
  total: number;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  channel: OrderChannel;
  paidAmount?: number;
  needsReview?: boolean;
}

export interface StaffOrdersPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StaffOrdersSummary {
  all: number;
  statusCounts: Record<OrderStatus, number>;
}

export interface StaffOrdersListResponse {
  items: StaffOrderListItem[];
  pagination: StaffOrdersPagination;
  summary: StaffOrdersSummary;
}

export interface StaffOrderDetailCurrentProduct {
  image: string | null;
  variantLabel: string | null;
  stock: number;
  reservedStock: number;
  availableStock: number;
}

export interface StaffOrderDetailItem {
  productId?: string;
  variantSku: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  currentProduct: StaffOrderDetailCurrentProduct | null;
}

export interface StaffOrderStatusHistoryItem {
  from: OrderStatus | null;
  to: OrderStatus;
  at: string;
  actorName: string | null;
}

export interface StaffOrderShippingAddress {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
}

export interface StaffOrderShippingInfo {
  carrier: string;
  trackingNumber: string;
}

export interface StaffOrderDetail {
  id: string;
  orderCode: string;
  createdAt: string;
  customer: StaffOrderCustomer;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  promotionCode: string | null;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  channel: OrderChannel;
  shippingAddress: StaffOrderShippingAddress;
  shipping: StaffOrderShippingInfo | null;
  createdByStaff: string | null;
  items: StaffOrderDetailItem[];
  statusHistory: StaffOrderStatusHistoryItem[];
  allowedNextStatuses: StaffEditableOrderStatus[];
  cancellationReason?: string | null;
  cancellationNote?: string | null;
  paidAmount?: number;
  needsReview?: boolean;
}

export interface StaffOrdersFilterState {
  query: string;
  status: OrderStatus | "all";
  dateFrom: string;
  dateTo: string;
  sort: SortOption;
  page: number;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  processing: "Đang chuẩn bị",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Đã hoàn trả",
};

import type { BadgeTone } from "../components/staff-ui";

export const orderStatusTones: Record<OrderStatus, BadgeTone> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipping: "info",
  completed: "success",
  cancelled: "neutral",
  returned: "danger",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
};

export const paymentStatusTones: Record<PaymentStatus, BadgeTone> = {
  unpaid: "warning",
  pending: "warning",
  paid: "success",
  failed: "danger",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt tại quầy",
  COD: "COD",
  ONLINE: "Thanh toán trực tuyến",
};

export const sortOptions: { value: SortOption; label: string }[] = [
  { value: "createdAt_desc", label: "Mới nhất trước" },
  { value: "createdAt_asc", label: "Cũ nhất trước" },
  { value: "total_desc", label: "Tổng tiền cao nhất" },
  { value: "total_asc", label: "Tổng tiền thấp nhất" },
];

export const INVOICE_ELIGIBLE_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "processing",
  "shipping",
  "completed",
];

export function isInvoiceEligibleOrder(status?: string | null): boolean {
  if (!status) return false;
  return (INVOICE_ELIGIBLE_STATUSES as readonly string[]).includes(status);
}

export interface StaffOrderInvoiceStore {
  name: string;
  address: string;
  hotline: string;
  email: string;
}

export interface StaffOrderInvoiceItem {
  variantSku: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface StaffOrderInvoiceOrder {
  id: string;
  orderCode: string;
  createdAt: string;
  channel: OrderChannel;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customer: StaffOrderCustomer;
  shippingAddress: StaffOrderShippingAddress | null;
  items: StaffOrderInvoiceItem[];
  subtotal: number;
  discount: number;
  promotionCode: string | null;
  shippingFee: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  needsReview: boolean;
  createdByStaff: string | null;
}

export interface StaffOrderInvoiceMeta {
  generatedAt: string;
  generatedBy: string;
  exportCount: number;
}

export interface StaffOrderInvoice {
  store: StaffOrderInvoiceStore;
  order: StaffOrderInvoiceOrder;
  invoiceMeta: StaffOrderInvoiceMeta;
}

export interface StaffOrderInvoiceExportRecord {
  orderId: string;
  orderCode: string;
  exportedAt: string;
  exportedBy: string;
}
