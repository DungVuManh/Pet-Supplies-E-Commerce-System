# Data Model: Customer Notification Entities & Schemas

**Feature**: `customer-notifications`  
**Context**: [spec.md](./spec.md) | [research.md](./research.md)

---

## 1. MongoDB Notification Schema (`backend/src/models/notification.model.js`)

```javascript
const notificationTypes = [
  "order_cancelled",
  "order_confirmed",
  "order_shipping",
  "order_completed",
  "return_approved",
  "return_received",
  "return_refunded",
  "return_rejected",
  "payment_success",
  "payment_reminder",
  "voucher_reward",
  "system",
];

const notificationSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, required: true, trim: true },
    channel: { type: String, required: true, trim: true, default: "in_app" },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "sent" },
    title: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    error: String,
    sentAt: Date,
  },
  { timestamps: true, bufferCommands: false }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ orderId: 1, createdAt: -1 });
```

---

## 2. Frontend Types (`frontend/features/notifications/types.ts`)

```typescript
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
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

