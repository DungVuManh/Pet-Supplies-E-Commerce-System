# Tasks: Customer Notification System

**Branch**: `feature/customer-notifications`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Task Summary

- **Total Tasks**: 10
- **Phase 1 (Backend Core & Dispatcher)**: 3 tasks
- **Phase 2 (Backend API & Tests)**: 2 tasks
- **Phase 3 (Frontend Service & Hook)**: 2 tasks
- **Phase 4 (Frontend UI Touchpoints)**: 2 tasks
- **Phase 5 (Polish & Verification)**: 1 task

---

## Execution Tasks

### Phase 1: Backend Core & Dispatcher

- [x] T001 [P] Mở rộng schema `Notification` trong `backend/src/models/notification.model.js` để bổ sung các trường: `title: String`, `message: String`, `link: String`, `read: { type: Boolean, default: false }`, `readAt: Date`, và index `{ userId: 1, read: 1 }`.
- [x] T002 Tạo module tiện ích an toàn `backend/src/common/customer-notification.js` với hàm `notifyCustomer({ userId, orderId, type, title, message, link })` không bao giờ throw error để bảo vệ transaction đơn hàng.
- [x] T003 Gắn lệnh gọi `notifyCustomer` vào các điểm chuyển trạng thái đơn hàng:
  - Khi đơn hàng bị hủy: `backend/src/controllers/order.controller.js` (`cancelOrder`) và `backend/src/controllers/order-status.controller.js` (`updateStaffOrderStatus`).
  - Khi đơn hàng được xác nhận hoặc đang giao: `backend/src/controllers/order-status.controller.js`.
  - Khi hoàn tiền thành công hoặc yêu cầu hoàn trả thay đổi: `backend/src/controllers/order-return.controller.js`.

---

### Phase 2: Backend Customer Notification API

- [x] T004 [P] Xây dựng controller `backend/src/controllers/customer-notification.controller.js` hỗ trợ `getNotifications` (phân trang, lọc theo type, đếm `unreadCount`), `markAsRead` (chỉ user sở hữu), và `markAllAsRead`. Đăng ký router `backend/src/routers/customer-notification.router.js` và mount vào `/api/v1/customer/notifications` trong `backend/src/app.js`.
- [x] T005 [P] Viết Unit/Integration Tests `backend/tests/customer-notifications.test.js` kiểm tra bảo mật truy cập, phân trang, tính toán số thông báo chưa đọc, và thao tác đánh dấu đã đọc.

---

### Phase 3: Frontend Service & State Hook

- [x] T006 [P] Tạo định nghĩa kiểu dữ liệu `frontend/features/notifications/types.ts` và API service `frontend/features/notifications/api.ts` gọi các endpoint `/api/v1/customer/notifications`.
- [x] T007 Xây dựng custom hook `frontend/features/notifications/hooks/use-customer-notifications.ts` quản lý state danh sách thông báo, `unreadCount`, polling refetch khi focus màn hình, hàm `markAsRead` và `markAllAsRead`.

---

### Phase 4: Frontend UI Touchpoints

- [x] T008 [P] Cập nhật `frontend/components/storefront/storefront-header.tsx`: Bổ sung icon Chuông thông báo (`Bell`), Badge đỏ hiển thị `unreadCount`, và Popover dropdown hiển thị 5 thông báo mới nhất kèm nút *"Đánh dấu đã đọc tất cả"* và link *"Xem tất cả"*.
- [x] T009 Xây dựng trang quản lý thông báo khách hàng `/app/(customer)/account/notifications/page.tsx` và kích hoạt đường dẫn trong `frontend/features/orders/components/account-sidebar.tsx`, hỗ trợ lọc theo các tab: Tất cả, Đơn hàng, Hoàn tiền, Ưu đãi.

---

### Phase 5: Polish & Comprehensive Verification

- [x] T010 Chạy kiểm thử backend `cmd /c "npm.cmd --prefix backend test -- tests/customer-notifications.test.js"`, kiểm thử frontend `cmd /c "npm.cmd --prefix frontend test"`, và build production `cmd /c "npm.cmd --prefix frontend run build"` để xác minh toàn bộ hệ thống hoạt động ổn định không lỗi thoái lui.

