# Data Model: Yêu Cầu Hoàn Trả Đơn Hàng & Duyệt Hoàn Đơn (Order Returns)

**Feature Directory**: `docs/specs/order-returns` | **Date**: 2026-11-12

---

## 1. Mở rộng Enum & Schema trên `Order`

### 1.1. `orderStatuses` (`backend/src/models/shared.schema.js`)
Bổ sung trạng thái `"returned"` (terminal state):
```text
["pending", "confirmed", "processing", "shipping", "completed", "cancelled", "returned"]
```

### 1.2. Subdocument `returnRequestSchema` trên `Order` (`backend/src/models/order.model.js`)

| Trường | Kiểu & Ràng buộc | Mô tả |
|---|---|---|
| `reason` | `String`, enum `["damaged_or_defective", "not_received", "missing_items", "damaged_or_missing"]`, required | Lý do hoàn trả. Giao diện người dùng cung cấp 2 lựa chọn: **Hàng có vấn đề hoặc thiếu hàng** (`damaged_or_missing`) và **Chưa nhận được hàng** (`not_received`). Backend duy trì tương thích với các giá trị cũ. |
| `bankAccount` | `Object`, required | Thông tin tài khoản ngân hàng của khách để nhân viên/kế toán chuyển khoản hoàn tiền |
| `bankAccount.bankName` | `String`, required, trim, minlength `2`, maxlength `100` | Tên ngân hàng nhận tiền (vd: Vietcombank, Techcombank, MB Bank, ACB...) |
| `bankAccount.accountNumber` | `String`, required, trim, minlength `6`, maxlength `30` | Số tài khoản ngân hàng |
| `bankAccount.accountHolder` | `String`, required, trim, minlength `2`, maxlength `100` | Tên chủ tài khoản ngân hàng |
| `description` | `String`, required, trim, minlength `10`, maxlength `1000` | Mô tả chi tiết vấn đề của khách hàng |
| `images` | `[String]`, maxlength `5` items, validate URL `https://res.cloudinary.com/...` | Danh sách URL ảnh minh chứng trên Cloudinary (tối đa 5 ảnh; bắt buộc >= 1 ảnh khi `reason !== "not_received"`; cho phép rỗng `0..5` khi `reason === "not_received"`) |
| `status` | `String`, enum `["pending", "approved", "rejected"]`, required | Trạng thái yêu cầu hoàn trả |
| `refundRequired` | `Boolean`, default `false` | Đánh dấu `"Cần hoàn tiền"` khi Staff chấp nhận hoàn trả đơn đã thanh toán `ONLINE` hoặc đơn hoàn trả cần chuyển khoản lại cho khách |
| `refundStatus` | `String`, enum `["none", "pending_refund", "refunded"]`, default `"none"` | Theo dõi tình trạng đối soát hoàn tiền (`"pending_refund"` khi `refundRequired === true`) |
| `requestedBy` | `ObjectId` (`ref: "User"`), required | Tài khoản khách hàng gửi yêu cầu |
| `requestedAt` | `Date`, required | Thời điểm khách hàng gửi yêu cầu |
| `reviewedBy` | `ObjectId` (`ref: "User"`) | Nhân viên Staff xử lý (duyệt hoặc từ chối) |
| `reviewedAt` | `Date` | Thời điểm Staff xử lý |
| `rejectionReason` | `String`, trim, maxlength `500` | Lý do từ chối (bắt buộc 5–500 ký tự khi `status === "rejected"`) |

- **Index bổ sung**: `orderSchema.index({ "returnRequest.status": 1, "returnRequest.requestedAt": -1 });`

---

## 2. Máy trạng thái & Chuyển đổi nguyên tử (Atomic Transitions)

```text
[Order: channel="online", orderStatus="shipping", returnRequest=null]
   │
   ├─ Khách bấm "Đã nhận được hàng" ──> orderStatus: "completed", paymentStatus: "paid"
   │
   └─ Khách gửi "Hoàn trả hàng" (POST /orders/:id/return)
         │  Filter: { _id, customerId, channel:"online", orderStatus:"shipping",
         │            creationState:{ $ne:"pending" }, "returnRequest.status":{ $exists:false } }
         ▼
[Order: orderStatus="shipping", returnRequest.status="pending"]
   │  (Khóa nút "Đã nhận được hàng"; tạm dừng auto-complete 3 ngày)
   │
   ├── Staff bấm "Chấp nhận hoàn trả" (POST /staff/returns/:id/decision, approve)
   │     Filter: { _id, channel:"online", orderStatus:"shipping", "returnRequest.status":"pending" }
   │     Update:
   │       - orderStatus: "returned"
   │       - returnRequest.status: "approved", reviewedBy, reviewedAt
   │       - refundRequired: (paymentMethod === "ONLINE" && paymentStatus === "paid")
   │       - refundStatus: refundRequired ? "pending_refund" : "none"
   │       - $push statusHistory: { from: "shipping", to: "returned", by: staffId, at: now }
   │     Side-effect (chỉ khi modifiedCount === 1):
   │       - Hoàn lại Product.variants.$.stock += item.qty
   │       - Ghi AuditLog (action: "order.return.approve")
   │
   └── Staff bấm "Từ chối hoàn trả" (POST /staff/returns/:id/decision, reject + rejectionReason 5..500)
         Filter: { _id, channel:"online", orderStatus:"shipping", "returnRequest.status":"pending" }
         Update:
           - returnRequest.status: "rejected", rejectionReason, reviewedBy, reviewedAt
           - orderStatus giữ nguyên "shipping"
         Side-effect:
           - Ghi AuditLog (action: "order.return.reject")
           - UI khách hiển thị lý do từ chối, mở lại nút "Đã nhận được hàng", không cho gửi lại yêu cầu (Q3: A)
```

---

## 3. Quy tắc tự động hoàn thành sau khi hoàn trả bị từ chối (`order-auto-complete.js`)
- Nếu `returnRequest.status` là `"pending"` hoặc `"approved"` -> **luôn loại trừ**, không tự động hoàn thành.
- Nếu `returnRequest.status === "rejected"` -> kiểm tra `max(shippedAt + 72h, reviewedAt + 24h) <= now`: bảo đảm sau khi bị Staff từ chối khách luôn có tối thiểu 24 giờ nhìn thấy lý do từ chối hoặc bấm `"Đã nhận được hàng"` trước khi đơn tự động chuyển `completed`.

---

## 4. Mapping DTO Frontend

### 4.1. `CustomerOrderReturnRequest` (trả về trong `GET /api/v1/orders/:id`)
```ts
export type ReturnRequestReason =
  | "damaged_or_missing"
  | "damaged_or_defective"
  | "not_received"
  | "missing_items";

export type ReturnBankAccount = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

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
```
Kèm trên `OrderDetail`:
- `canRequestReturn: boolean` (`channel !== "offline" && orderStatus === "shipping" && !returnRequest`)
- `canConfirmReceipt: boolean` (`channel !== "offline" && orderStatus === "shipping" && returnRequest?.status !== "pending" && returnRequest?.status !== "approved"`)
- `returnRequest: CustomerOrderReturnRequest | null`

### 4.2. Staff Return Management (`StaffReturnListItem` & `StaffReturnDetail`)
- Danh sách trả về `id` (`orderId`), `orderCode`, `customer: { name, phone, email }`, `total`, `paymentMethod`, `paymentStatus`, `orderStatus`, `returnRequest` (kèm `reviewedByName`, `imageCount`).
- Chi tiết trả thêm `items` (tên, SKU, đơn giá, số lượng, thành tiền, ảnh), `bankAccount` (Tên ngân hàng, Số tài khoản, Chủ tài khoản), `shippingAddress`, `shipping` (carrier/trackingNumber), `statusHistory`.

