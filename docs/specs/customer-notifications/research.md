# Technical Research: Customer Notification Architecture & Real-Time Sync

**Feature Branch**: `feature/customer-notifications`  
**Date**: 2026-11-14  
**Context**: [spec.md](./spec.md)

---

## 1. Technical Questions & Decisions

### Q1: Lưu trữ thông báo trong MongoDB
- **Decision**: Tái sử dụng và mở rộng model `Notification` (`backend/src/models/notification.model.js`):
  - Bổ sung các trường:
    - `title`: Chuỗi tiêu đề ngắn gọn (ví dụ: *"Đơn hàng #ORD12345 đã bị hủy"*).
    - `message`: Nội dung chi tiết.
    - `link`: URL điều hướng (ví dụ: `"/orders/673456789..."`).
    - `read`: Boolean (mặc định `false`).
    - `readAt`: Date.
  - Index: `{ userId: 1, createdAt: -1 }` (đã có sẵn trong schema hiện hữu).
- **Rationale**: Tránh tạo thêm collection mới gây phân mảnh dữ liệu. Cấu trúc này nhất quán với chuẩn log thông báo của hệ thống.

### Q2: Non-blocking Notification Dispatcher
- **Decision**: Tạo module tiện ích `backend/src/common/customer-notification.js`:
  ```javascript
  export async function notifyCustomer({ userId, orderId, type, title, message, link }) {
    try {
      if (!userId) return null;
      return await Notification.create({
        userId,
        orderId,
        type,
        channel: "in_app",
        status: "sent",
        sentAt: new Date(),
        title,
        message,
        link,
        read: false,
      });
    } catch (err) {
      console.error("[Notification] Failed to create notification:", err.message);
      // Không bao giờ throw error để tránh làm hỏng transaction chính của đơn hàng
      return null;
    }
  }
  ```
- **Rationale**: Đáp ứng chuẩn nghiệp vụ SRS CR-13 & EI-09: Sự cố phát sinh từ thông báo không được phép làm rollback giao dịch đơn hàng.

### Q3: Cơ chế đồng bộ số lượng thông báo chưa đọc trên Header (Frontend)
- **Decision**: 
  - Tạo context/hook `useCustomerNotifications`:
    - Fetch API `GET /api/v1/customer/notifications?limit=5` khi user đã đăng nhập.
    - Định kỳ refetch hoặc refetch khi focus trang (tương tự `useAuth`).
    - Cung cấp hàm `markAsRead(id)` và `markAllAsRead()`.
- **Rationale**: Đơn giản, nhẹ nhàng, không cần triển khai WebSocket phức tạp gây quá tải server, nhưng vẫn đảm bảo khách nhận được thông báo ngay khi chuyển trang hoặc thao tác.

### Q4: Điểm gắn thông báo trong mã nguồn Backend
- **Đơn hàng bị hủy**:
  - `cancelOrder` trong `order.controller.js` (Khách tự hủy hoặc Staff hủy).
  - `updateStaffOrderStatus` trong `order-status.controller.js` khi chuyển sang `cancelled`.
- **Đơn hàng được xác nhận / đang giao**:
  - `updateStaffOrderStatus` khi chuyển sang `confirmed` hoặc `shipping`.
- **Giao hàng thành công**:
  - `confirmCustomerOrderReceipt` trong `order-status.controller.js`.
  - `autoCompleteOverdueShippingOrders` trong `backend/src/common/order-auto-complete.js`.
- **Hoàn trả & Hoàn tiền**:
  - `order-return.controller.js` tại các action: `approve_request`, `reject_request`, `received`, `complete_refund`.

