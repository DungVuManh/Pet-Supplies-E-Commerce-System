# Implementation Plan: Hệ Thống Thông Báo Dành Cho Khách Hàng (Customer Notification System)

**Branch**: `feature/customer-notifications` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

---

## 1. Summary & Architecture

Xây dựng hệ thống thông báo khách hàng end-to-end hoàn chỉnh:
1. **Backend Model & Service**:
   - Mở rộng model `Notification` (`title`, `message`, `link`, `read`, `readAt`).
   - Tạo helper không chặn `notifyCustomer(...)` an toàn.
   - Gắn sự kiện bắn thông báo tại các khâu: Đơn hàng bị hủy, duyệt đơn, đang giao, hoàn thành, duyệt hoàn trả, hoàn tiền thành công.
2. **Backend API Endpoints**:
   - `GET /api/v1/customer/notifications`: Danh sách thông báo & `unreadCount`.
   - `PATCH /api/v1/customer/notifications/:id/read`: Đánh dấu đã đọc 1 thông báo.
   - `POST /api/v1/customer/notifications/read-all`: Đánh dấu đọc tất cả.
3. **Frontend Components**:
   - Cập nhật `StorefrontHeader`: Thêm icon Chuông (`Bell`) + Badge đỏ số lượng chưa đọc + Popover xem nhanh 5 thông báo mới nhất.
   - Tạo trang Trung tâm thông báo: `/account/notifications` (tích hợp trong `AccountSidebar`).
   - Cung cấp Hook `useCustomerNotifications` để quản lý polling và state.

---

## 2. Technical Context

- **Backend**: Express 5, Mongoose 9, Zod, Vitest.
- **Frontend**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `lucide-react`.
- **Database**: Collection `notifications` (đã có index trên `userId` và `createdAt`).
- **Security & RBAC**: Xác thực session cookie qua `requireAuth`, chỉ truy cập và sửa đổi thông báo của chính mình (`userId === req.user._id`).

---

## 3. Phased Implementation Roadmap

### Phase 1: Backend Core & Helper Service
- [ ] **Step 1.1**: Cập nhật `backend/src/models/notification.model.js` (bổ sung `title`, `message`, `link`, `read`, `readAt`).
- [ ] **Step 1.2**: Tạo file helper `backend/src/common/customer-notification.js` với hàm `notifyCustomer({ userId, orderId, type, title, message, link })`.
- [ ] **Step 1.3**: Tích hợp kích hoạt thông báo vào các controllers:
  - Khi hủy đơn hàng: `backend/src/controllers/order.controller.js` & `backend/src/controllers/order-status.controller.js`.
  - Khi duyệt/giao đơn: `backend/src/controllers/order-status.controller.js`.
  - Khi nhận hàng/hoàn tiền: `backend/src/controllers/order-return.controller.js`.

### Phase 2: Backend Customer Notification API
- [ ] **Step 2.1**: Tạo controller `backend/src/controllers/customer-notification.controller.js` (`getNotifications`, `markAsRead`, `markAllAsRead`).
- [ ] **Step 2.2**: Đăng ký router `backend/src/routers/customer-notification.router.js` và mount vào `/api/v1/customer/notifications` trong `backend/src/app.js`.
- [ ] **Step 2.3**: Viết Unit/Integration Tests `backend/tests/customer-notifications.test.js`.

### Phase 3: Frontend Client Service & Hook
- [ ] **Step 3.1**: Tạo types và API service tại `frontend/features/notifications/` (`types.ts`, `api.ts`).
- [ ] **Step 3.2**: Tạo custom hook `useCustomerNotifications` để quản lý fetch danh sách, đếm số chưa đọc và đánh dấu đã đọc.

### Phase 4: Frontend UI Touchpoints
- [ ] **Step 4.1**: Cập nhật `frontend/components/storefront/storefront-header.tsx`:
  - Thêm icon Chuông thông báo (`Bell`) cạnh giỏ hàng.
  - Hiển thị badge đỏ số lượng thông báo chưa đọc.
  - Tích hợp Popover dropdown hiển thị 5 thông báo mới nhất.
- [ ] **Step 4.2**: Kích hoạt link **"Thông báo"** trong `frontend/features/orders/components/account-sidebar.tsx` trỏ tới `/account/notifications`.
- [ ] **Step 4.3**: Tạo trang danh sách thông báo `/app/(customer)/account/notifications/page.tsx` với giao diện chuyên nghiệp, phân loại theo tab.

### Phase 5: Verification & Quality Assurance
- [ ] **Step 5.1**: Chạy backend test: `npm --prefix backend test -- tests/customer-notifications.test.js`.
- [ ] **Step 5.2**: Chạy frontend unit test và build: `npm --prefix frontend test` & `npm --prefix frontend run build`.
- [ ] **Step 5.3**: Kiểm thử E2E: Hủy đơn từ Staff và kiểm tra thông báo xuất hiện tức thì bên tài khoản Khách hàng.

