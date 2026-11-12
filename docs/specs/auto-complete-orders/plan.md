# Implementation Plan: Tự Động Hoàn Thành Đơn Hàng Sau 3 Ngày Đang Giao

**Branch**: `feature/auto-complete-orders` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/auto-complete-orders/spec.md`

---

## Summary

Triển khai cơ chế **tự động chuyển đơn hàng trực tuyến từ `shipping` (Đang giao) sang `completed` (Hoàn thành) sau 3 ngày (72 giờ)** nếu khách hàng chưa bấm **"Đã nhận được hàng"**, theo đúng 3 quyết định đã chốt (`Q1: A`, `Q2: A`, `Q3: B`):

1. **Tầng Model (`backend/src/models/order.model.js`)**:
   - Bổ sung trường tùy chọn `actorType: { type: String, enum: ["user", "system"] }` trên `statusHistorySchema` để phân biệt lịch sử do hệ thống tự động thực hiện mà vẫn tương thích ngược 100% với dữ liệu hiện tại.
2. **Tầng Domain & Scheduler (`backend/src/common/order-auto-complete.js` + `backend/src/server.js`)**:
   - Xây dựng hàm xử lý theo lô [`autoCompleteOverdueShippingOrders`](../../../backend/src/common/order-auto-complete.js) duyệt theo con trỏ `_id` trên tập ứng viên `channel: "online"`, `orderStatus: "shipping"`, `creationState !== "pending"`, `createdAt <= cutoff` (`72 giờ`), tính đúng mốc vào `shipping` từ `statusHistory` (fallback `updatedAt || createdAt`).
   - Thực thi `Order.updateOne` nguyên tử có điều kiện (`orderStatus: "shipping"`, `paymentStatus: order.paymentStatus`): đổi `orderStatus: "completed"`, với đơn `COD` tự động đổi `paymentStatus: "paid"` (`Q1: A`), và đẩy `{ from: "shipping", to: "completed", actorType: "system", at: now }` vào `statusHistory`.
   - Áp dụng cho mọi đơn online kể cả đơn khách vãng lai (`Q2: A`); giữ nguyên giao diện Customer & không tạo `Notification` (`Q3: B`).
   - Tích hợp [`startOrderAutoCompleteScheduler`](../../../backend/src/common/order-auto-complete.js) vào vòng đời khởi động & `shutdown()` của [`server.js`](../../../backend/src/server.js) để vừa chạy quét bù ngay khi bật lại server vừa chạy định kỳ mỗi 15 phút, hoàn toàn tách biệt khỏi `createApp(config)`.
3. **Hiển thị Lịch sử Staff (`backend/src/controllers/order.controller.js`)**:
   - Cập nhật `getStaffOrderDetail` để trả về `actorName: "Hệ thống (tự động hoàn thành sau 3 ngày)"` khi `h.actorType === "system"`, giúp màn hình Staff hiển thị tự nhiên mà không cần sửa giao diện frontend.

---

## Technical Context

- **Backend**: Node.js 24.x (ESM với phần mở rộng `.js`), Express 5.3.0, Mongoose 9.11.2, Vitest 5.0.5.
- **Storage**: Sử dụng collection `orders` hiện có trên MongoDB standalone; tận dụng compound index `{ orderStatus: 1, createdAt: -1 }` kết hợp phân trang con trỏ `_id`; dùng cập nhật nguyên tử đơn document (`Order.updateOne`) thay cho multi-document transaction.
- **Background Execution**: Dùng Node native `setInterval(...).unref()` + promise lock chống chạy chồng chéo trong `server.js` (không thêm package ngoài), dừng sạch timer & chờ batch đang dở hoàn tất khi `SIGINT`/`SIGTERM`.
- **Frontend**: Không sửa giao diện Customer/Staff theo `Q3: B` (Staff order detail tự đọc `actorName` từ `GET /api/v1/staff/orders/:id`).

---

## Constitution & Governance Check

*Kiểm tra tuân thủ các nguyên tắc kiến trúc của dự án (`CLAUDE.md`) — Đạt cả trước và sau Phase 1 design:*

- [x] **Isolated `createApp(config)`**: Bộ lập lịch nền chỉ khởi chạy trong `backend/src/server.js`, tuyệt đối không đặt side-effect timer trong `app.js` hay controller.
- [x] **Standalone MongoDB Atomicity**: Dùng `Order.updateOne` có điều kiện trạng thái hiện tại, gắn trạng thái mới + `paymentStatus` + `statusHistory` trong cùng một ghi nguyên tử (giống `order-status.controller.js`), chống trùng lặp lịch sử khi khách bấm song song.
- [x] **Staff KPI & Review Compatibility**: Mục `statusHistory` của hệ thống không gắn `by`, nên `staff-analytics.helpers.js` không cộng nhầm KPI cho Staff, trong khi `review.controller.js` (`h.to === "completed"`) vẫn tính đúng mốc hoàn thành cho khách đánh giá sản phẩm.
- [x] **Zero Unneeded Dependencies**: Không cài thêm thư viện ngoài; tận dụng timer chuẩn Node.js 24.
- [x] **Backward Compatibility**: Không làm thay đổi chữ ký API công khai hoặc gãy bộ test `models.test.js`, `order-status.test.js`, `customer-order-receipt.test.js`, `orders.test.js`.

---

## Project Structure

### Documentation (this feature)

```text
docs/specs/auto-complete-orders/
├── spec.md                                     # Đặc tả yêu cầu nghiệp vụ (Ready, 16/16 PASS)
├── plan.md                                     # Kế hoạch thiết kế kỹ thuật (tệp tin này)
├── research.md                                 # Khảo sát hiện trạng & 4 quyết định kỹ thuật
├── data-model.md                               # Mở rộng statusHistory & quy tắc chuyển trạng thái
├── quickstart.md                               # Hướng dẫn kiểm thử tự động và E2E
├── contracts/
│   └── auto-complete-orders.md                 # Hợp đồng domain service, scheduler & Staff history DTO
└── checklists/
    └── requirements.md                         # Checklist chất lượng đặc tả (16/16 PASS)
```

### Source Code Layout

```text
backend/
├── src/
│   ├── models/
│   │   └── order.model.js                      # [MODIFY] Bổ sung trường tùy chọn actorType: ["user", "system"] trên statusHistorySchema
│   ├── common/
│   │   └── order-auto-complete.js              # [NEW] resolveShippingStartedAt, isShippingOrderOverdue, autoCompleteOverdueShippingOrders, startOrderAutoCompleteScheduler
│   ├── controllers/
│   │   └── order.controller.js                 # [MODIFY] getStaffOrderDetail map actorType === "system" -> "Hệ thống (tự động hoàn thành sau 3 ngày)"
│   └── server.js                               # [MODIFY] Khởi động scheduler sau createModelIndexes() và stop() trong shutdown()
└── tests/
    └── auto-complete-orders.test.js            # [NEW] Unit & integration tests (72h boundary, COD paid, guest order, concurrency conflict, startup sweep & shutdown lifecycle)
```

---

## Phased Delivery Strategy

1. **Phase 1 — Schema & Pure Domain Logic**:
   - Mở rộng `statusHistorySchema` (`actorType`) trong `order.model.js` và viết `backend/src/common/order-auto-complete.js` (xác định `shippedAt`, điều kiện >= 72h, batch cursor sweep, atomic `updateOne`).
2. **Phase 2 — Server Lifecycle & Staff History Formatting**:
   - Gắn `startOrderAutoCompleteScheduler` vào `backend/src/server.js` (chạy bù lúc boot + định kỳ 15p + dừng sạch ở `shutdown()`) và cập nhật hiển thị `actorName` trong `getStaffOrderDetail` (`order.controller.js`).
3. **Phase 3 — Verification**:
   - Viết bộ test toàn diện trong `backend/tests/auto-complete-orders.test.js` và chạy hồi quy `order-status.test.js`, `customer-order-receipt.test.js`, `orders.test.js`, `staff-analytics.test.js` (cùng `models.test.js` kiểm tra riêng schema `Order`).

