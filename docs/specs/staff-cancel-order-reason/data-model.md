# Data Model: Nhân Viên Hủy Đơn Hàng & Ghi Nhận Lý Do

**Feature**: `staff-cancel-order-reason`  
**Context**: [spec.md](./spec.md) | [research.md](./research.md)

---

## 1. Entities & Fields

### Order Entity (`Order` Mongoose Model)
Các trường liên quan đến hủy đơn đã có trong collection `orders`:

| Field | Type | Required | Description |
|---|---|---|---|
| `orderStatus` | `String` | Yes | Trạng thái đơn, chuyển sang `"cancelled"`. |
| `cancellationReason` | `String` | Conditionally Yes (khi `orderStatus === "cancelled"`) | Lý do hủy đơn (lý do định sẵn hoặc nội dung tự viết). |
| `cancellationNote` | `String` | No | Ghi chú bổ sung do nhân viên nhập. |
| `statusHistory` | `Array` | Yes | Ghi nhận chuyển dịch từ trạng thái cũ sang `"cancelled"`, kèm `by: staffUserId` và `at: timestamp`. |

---

## 2. Validation Rules (Backend Zod Schema)

### `staffOrderStatusSchema` (`backend/src/validators/order.validator.js`)

```typescript
const staffOrderStatusSchema = z
  .object({
    expectedStatus: z.enum(orderStatuses),
    orderStatus: z.enum(["confirmed", "processing", "shipping", "cancelled"]),
    shipping: z
      .object({
        carrier: z.string().trim().max(100).default(""),
        trackingNumber: z.string().trim().max(100).default(""),
      })
      .strict()
      .optional(),
    cancellationReason: z.string().trim().max(200).optional(),
    cancellationNote: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (value) => !value.shipping || value.orderStatus === "shipping",
    { message: "Thông tin vận chuyển chỉ áp dụng khi chuyển sang trạng thái đang giao" }
  )
  .refine(
    (value) => {
      if (value.orderStatus === "cancelled") {
        return typeof value.cancellationReason === "string" && value.cancellationReason.length > 0;
      }
      return true;
    },
    {
      message: "Vui lòng chọn hoặc nhập lý do hủy đơn hàng.",
      path: ["cancellationReason"],
    }
  );
```

---

## 3. Frontend Model & Types (`frontend/features/staff/orders/types.ts`)

```typescript
export interface StaffOrderStatusUpdate {
  expectedStatus: OrderStatus;
  orderStatus: StaffEditableOrderStatus;
  shipping?: {
    carrier: string;
    trackingNumber: string;
  };
  cancellationReason?: string;
  cancellationNote?: string;
}
```

