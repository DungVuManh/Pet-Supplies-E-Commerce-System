export type CustomerNotificationType =
  | "order_cancelled"
  | "order_confirmed"
  | "order_shipping"
  | "order_completed"
  | "return_approved"
  | "return_received"
  | "return_refunded"
  | "return_rejected"
  | "payment_success"
  | "payment_reminder"
  | "voucher_reward"
  | "system";

export interface CustomerNotificationItem {
  id: string;
  orderId?: string | null;
  type: CustomerNotificationType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export interface CustomerNotificationsResponse {
  items: CustomerNotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

