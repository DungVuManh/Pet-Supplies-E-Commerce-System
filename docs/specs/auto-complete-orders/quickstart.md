# Quickstart & Validation Guide: Tự Động Hoàn Thành Đơn Hàng Sau 3 Ngày Đang Giao

**Feature Directory**: `docs/specs/auto-complete-orders` | **Contract**: [auto-complete-orders.md](./contracts/auto-complete-orders.md) | **Data Model**: [data-model.md](./data-model.md)

---

## 1. Điều kiện tiên quyết

- Node.js 24.x, npm 11+, MongoDB đang chạy (khi kiểm chứng trực tiếp với `server.js`).
- Không cần cấu hình thêm biến môi trường mới hoặc dependency bên ngoài.

---

## 2. Kiểm thử tự động

```powershell
# Kiểm thử unit & lifecycle của auto-complete, trạng thái đơn hàng, quyền staff và models
npm.cmd --prefix backend test tests/auto-complete-orders.test.js tests/order-status.test.js tests/customer-order-receipt.test.js tests/orders.test.js
```

---

## 3. Kịch bản kiểm chứng End-to-End

### Kịch bản A — Đơn hàng COD & ONLINE ở trạng thái Đang giao quá 72 giờ tự động hoàn thành (`US1`, `Q1: A`, `Q2: A`)
1. Tạo 2 đơn hàng trực tuyến (1 đơn `COD` `paymentStatus: "unpaid"`, 1 đơn `ONLINE` `paymentStatus: "paid"` — bao gồm cả trường hợp đơn khách vãng lai không có `customerId`), cả hai đều có `orderStatus: "shipping"` và mục `statusHistory` `{ from: "processing", to: "shipping", at: <cách hiện tại 73 giờ> }`.
2. Tạo thêm 1 đơn `shipping` mới chuyển cách hiện tại **71 giờ** và 1 đơn `confirmed` quá **5 ngày**.
3. Khởi động Backend (`npm run dev:backend`) — hoặc gọi `autoCompleteOverdueShippingOrders()` khi chạy test.
4. Xác minh:
   - Hai đơn `shipping` quá 72 giờ tự động đổi thành `orderStatus: "completed"`, đơn `COD` chuyển thành `paymentStatus: "paid"`, và thêm đúng 1 mục `statusHistory`: `{ from: "shipping", to: "completed", actorType: "system", at: ... }`.
   - Đơn `shipping` 71 giờ và đơn `confirmed` 5 ngày giữ nguyên trạng thái ban đầu.

### Kịch bản B — Hiển thị lịch sử trên Staff và giữ nguyên giao diện Customer (`US3`, `Q3: B`)
1. Đăng nhập tài khoản **Staff** mở `/staff/orders/<id>` của đơn vừa tự động hoàn thành.
2. Tại khối **Lịch sử trạng thái**, xác minh hiển thị dòng chuyển `Đang giao -> Hoàn thành` kèm `Thực hiện bởi: Hệ thống (tự động hoàn thành sau 3 ngày)`.
3. Đăng nhập **Customer** mở `/orders/<id>`: xác nhận đơn hiển thị trạng thái `Hoàn thành` (`Đã thanh toán`), không có nút xác nhận nhận hàng, không có banner đếm ngược dư thừa và không phát sinh bản ghi thông báo mới.

### Kịch bản C — Không ghi trùng lặp khi khách bấm "Đã nhận được hàng" trùng thời điểm (`Edge Case`)
1. Mô phỏng trường hợp khách hàng bấm xác nhận nhận hàng trước hoặc trùng thời điểm hàm quét tự động chạy (`Order.updateOne` lọc `orderStatus: "shipping"`).
2. Xác minh chỉ có **1** bản ghi `shipping -> completed` trong `statusHistory`.

