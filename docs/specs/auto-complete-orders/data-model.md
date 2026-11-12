# Data Model: Tự Động Hoàn Thành Đơn Hàng Sau 3 Ngày Đang Giao

**Feature Directory**: `docs/specs/auto-complete-orders` | **Date**: 2026-11-12

---

## 1. Mở rộng Schema `Order.statusHistory`

Trong `backend/src/models/order.model.js`, `statusHistorySchema` giữ nguyên các trường hiện có và bổ sung trường tùy chọn `actorType`:

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `from` | `String` (enum `orderStatuses`) | Không | Trạng thái trước khi chuyển (`"shipping"`) |
| `to` | `String` (enum `orderStatuses`) | Có | Trạng thái mới (`"completed"`) |
| `by` | `ObjectId` (ref `User`) | Không | ID tài khoản thực hiện (để trống nếu là hệ thống tự động) |
| `actorType` | `String` (enum `["user", "system"]`) | Không | Phân biệt bản ghi do hệ thống tự động (`"system"`) với thao tác người dùng |
| `at` | `Date` | Có (mặc định `Date.now`) | Thời điểm chuyển trạng thái theo đồng hồ máy chủ |

> **Tính tương thích ngược**: Tất cả các bản ghi `statusHistory` cũ không có `actorType` vẫn hợp lệ hoàn toàn.

---

## 2. Quy tắc xác định đơn hàng đủ điều kiện (`AUTO_COMPLETE_DELAY_MS = 72 * 60 * 60 * 1000`)

Một đơn hàng tự động chuyển từ `shipping` sang `completed` khi thỏa đồng thời:

1. `channel === "online"` (áp dụng cho cả đơn có `customerId` lẫn đơn khách vãng lai không đăng nhập — `Q2: A`; đơn `"offline"` đã ở trạng thái `completed` sẵn).
2. `creationState !== "pending"`.
3. `orderStatus === "shipping"`.
4. `resolveShippingStartedAt(order)`:
   - Tìm phần tử mới nhất trong `order.statusHistory` có `to === "shipping"` và `at` hợp lệ (`Date` hợp lệ).
   - Fallback nếu dữ liệu cũ thiếu bản ghi `"shipping"`: `order.updatedAt || order.createdAt`.
   - Điều kiện quá hạn: `now.getTime() - shippedAt.getTime() >= 72 * 60 * 60 * 1000`.

---

## 3. Biến đổi trạng thái nguyên tử (Atomic Transition)

```text
[Order: channel="online", orderStatus="shipping", creationState!="pending"]
   │
   ├─ now - shippedAt < 72h ──> Không thay đổi (giữ nguyên "shipping")
   │
   └─ now - shippedAt >= 72h
         │
         ▼ Order.updateOne có điều kiện (orderStatus: "shipping", paymentStatus: hiện tại)
     ┌───┴─────────────────────────────────────────┐
     │ COD (paymentMethod === "COD")               │ ONLINE / khác (Q1: A)
     ▼                                             ▼
orderStatus: "completed"                    orderStatus: "completed"
paymentStatus: "paid"                       (giữ nguyên paymentStatus đã thanh toán)
$push statusHistory:                        $push statusHistory:
{ from: "shipping", to: "completed",        { from: "shipping", to: "completed",
  actorType: "system", at: now }              actorType: "system", at: now }
```

---

## 4. Ánh xạ hiển thị trong `getStaffOrderDetail`

Trong `backend/src/controllers/order.controller.js`:
- Khi ánh xạ từng mục `h` trong `statusHistory`:
  - Nếu `h.by` có giá trị: tra tên từ `userMap` như hiện tại.
  - Nếu `h.by` trống và `h.actorType === "system"`: `actorName = "Hệ thống (tự động hoàn thành sau 3 ngày)"`.
  - Trường hợp còn lại: `actorName = null`.

