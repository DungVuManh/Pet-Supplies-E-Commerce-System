# Data Model: Tiếp Tục Thanh Toán Đơn Hàng Trực Tuyến (Resume Online Payment)

**Feature Directory**: `docs/specs/resume-online-payment` | **Date**: 2026-11-12

Tính năng sử dụng trực tiếp các schema MongoDB sẵn có (`Order`, `Setting`) mà **không cần tạo collection mới** hay thay đổi cấu trúc trường bắt buộc của MongoDB; đồng thời chuẩn hóa các DTO trả về cho màn hình Chi tiết đơn hàng và Màn hình tiếp tục thanh toán VietQR.

---

## 1. Ánh xạ thực thể `Order` & `Setting` (Read / Atomic Update)

| Trường trên `Order` | Kiểu & Giá trị | Vai trò trong luồng tiếp tục thanh toán |
|---|---|---|
| `_id` | `ObjectId` | Khóa định danh trong URL `/orders/[id]` và `/orders/[id]/pay` |
| `orderCode` | `String` (VD: `ORD173000123`) | Tạo nội dung chuyển khoản bắt buộc `PETJOY <orderCode>` và hiển thị trên thẻ thanh toán |
| `customerId` | `ObjectId` (ref `User`) | Kiểm tra quyền sở hữu bắt buộc: `String(order.customerId) === String(request.user._id)` |
| `creationState` | `"pending" \| "complete"` | Ẩn đơn chưa hoàn tất ghi (`"pending"`) như `404 ORDER_NOT_FOUND` |
| `channel` | `"online" \| "offline"` | Chỉ cho phép tiếp tục thanh toán trực tuyến khi `channel !== "offline"` |
| `paymentMethod` | `"ONLINE" \| "COD" \| "CASH"` | Chỉ hiển thị nút & cho phép mở QR khi `paymentMethod === "ONLINE"` |
| `paymentStatus` | `"unpaid" \| "pending" \| "paid" \| "failed"` | Được xem là đã trả đủ khi `"paid"`; chưa hoàn tất khi `"unpaid"`, `"pending"`, hoặc `"failed"` |
| `orderStatus` | `"pending" \| "confirmed" \| "processing" \| "shipping" \| "completed" \| "cancelled"` | Chặn tiếp tục thanh toán khi là `"cancelled"` |
| `total` | `Number` (VND nguyên dương) | Tổng giá trị đơn hàng cần thanh toán |
| `paidAmount` | `Number` (>= 0) | Số tiền đã ghi nhận chuyển khoản thực tế (hỗ trợ thanh toán từng phần) |
| `needsReview` | `Boolean` | Cờ cảnh báo cần đối soát (giữ nguyên hoặc bật nếu có chênh lệch) |
| `paymentExpiredAt` | `Date \| undefined` | Mốc hết hạn phiên QR 15 phút; fallback `createdAt + 15 * 60 * 1000` nếu chưa có |

---

## 2. Quy tắc điều kiện & Máy trạng thái (State Transitions)

### 2.1. Quy tắc hợp lệ hiển thị nút "Thanh toán ngay / Tiếp tục thanh toán" (`canResumeOnlinePayment`)
Đơn hàng cho phép tiếp tục thanh toán trực tuyến khi và chỉ khi thỏa đồng thời:
1. `creationState !== "pending"`
2. `channel !== "offline"` (mặc định đơn web là `"online"`)
3. `paymentMethod === "ONLINE"`
4. `paymentStatus !== "paid"`
5. `orderStatus !== "cancelled"`

### 2.2. Các trạng thái kết quả khi mở `/orders/[id]/pay`

```text
           [Khách mở /orders/:id/pay]
                      │
                      ▼
       GET /api/v1/orders/:id/payment
                      │
     ┌────────────────┼──────────────────────┬─────────────────────┐
     ▼                ▼                      ▼                     ▼
orderStatus       paymentStatus          paymentMethod         Đủ điều kiện
=== cancelled     === "paid"             !== "ONLINE"          (`ONLINE`, chưa paid,
     │                │                  (VD: "COD")            chưa cancelled)
     ▼                ▼                      ▼                     │
status:           status:                status:                   ▼
"cancelled"       "already_paid"         "not_online"         "eligible"
(Khóa QR,         (Báo đã hoàn tất,      (Báo đơn COD,             │
 link về đơn)      link về chi tiết)      link về đơn)    ┌────────┴────────┐
                                                          ▼                 ▼
                                                   secondsLeft > 0    secondsLeft === 0
                                                   (Còn hạn 15p)      (Hết hạn 15p - Q3:A)
                                                          │                 │
                                                   Hiện mã VietQR     Hiện "Tạo lại mã" (+15p)
                                                   + Polling 3s       hoặc "Đổi sang COD"
```

### 2.3. Quy tắc chuyển trạng thái nguyên tử (Atomic Mutations)

1. **Gia hạn phiên QR (`POST /api/v1/orders/:id/payment/renew`)**:
   - Điều kiện lọc MongoDB:
     `{ _id: id, customerId, channel: "online", paymentMethod: "ONLINE", paymentStatus: { $ne: "paid" }, orderStatus: { $ne: "cancelled" }, creationState: { $ne: "pending" } }`
   - Cập nhật: `$set: { paymentExpiredAt: new Date(Date.now() + 15 * 60 * 1000) }`.
   - Nếu `modifiedCount === 0`: truy vấn lại để trả đúng mã lỗi `404 ORDER_NOT_FOUND` hoặc `409` (`ORDER_CANCELLED` / `ORDER_ALREADY_PAID` / `PAYMENT_METHOD_NOT_ONLINE`).

2. **Chuyển sang COD (`POST /api/v1/orders/:id/payment/convert-to-cod`)**:
   - Điều kiện lọc MongoDB:
     `{ _id: id, customerId, channel: "online", paymentMethod: "ONLINE", paymentStatus: { $ne: "paid" }, orderStatus: { $ne: "cancelled" }, creationState: { $ne: "pending" } }`
   - Cập nhật: `$set: { paymentMethod: "COD", paymentStatus: "unpaid", ...(paidAmount > 0 ? { needsReview: true } : {}) }`. *(Nếu đã nhận một phần tiền trước khi đổi COD, bật `needsReview: true` để nhân viên đối soát an toàn.)*
   - Nếu `modifiedCount === 0`: trả đúng mã lỗi `404` hoặc `409`.

---

## 3. DTO Hợp đồng dữ liệu (Backend <-> Frontend)

### 3.1. Bổ sung trường trên `GET /api/v1/orders/:id` (`OrderDetail`)
Giữ nguyên mọi trường cũ để không làm gãy code hiện có, đồng thời bổ sung/chuẩn hóa:
- `orderStatus`: `"pending" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled"`
- `channel`: `"online" | "offline"`
- `paymentMethod`: `"ONLINE" | "COD" | "CASH"`
- `paymentMethodLabel`: `"Chuyển khoản trực tuyến (VietQR)"` | `"Thanh toán khi nhận hàng (COD)"` | `"Tiền mặt tại quầy"`
- `paymentStatusCode`: `"unpaid" | "pending" | "paid" | "failed"`
- `paymentStatus`: `"Đã thanh toán"` | `"Thanh toán một phần"` | `"Chờ thanh toán"` | `"Chưa thanh toán"` | `"Thanh toán thất bại"`
- `paidAmount`: `number`
- `remainingAmount`: `number` (`paymentStatus === "paid" ? 0 : Math.max(0, total - paidAmount)`)
- `paymentExpiredAt`: `string | null`
- `canResumeOnlinePayment`: `boolean`

### 3.2. `CustomerOrderPaymentSession` (`GET /api/v1/orders/:id/payment`)
```ts
export type CustomerPaymentEligibilityState =
  | "eligible"
  | "already_paid"
  | "cancelled"
  | "not_online";

export type CustomerOrderPaymentSession = {
  orderId: string;
  orderCode: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: "unpaid" | "pending" | "paid" | "failed";
  total: number;
  paidAmount: number;
  remainingAmount: number;
  needsReview: boolean;
  eligible: boolean;
  state: CustomerPaymentEligibilityState;
  message: string | null;
  paymentInfo: SepayPaymentInfo | null; // null khi state !== "eligible"
};
```

