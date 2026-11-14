# API Contracts: Customer Notification System

**Feature**: `customer-notifications`  
**Context**: [spec.md](../spec.md) | [data-model.md](../data-model.md)

---

## 1. GET `/api/v1/customer/notifications`

- **Mô tả**: Lấy danh sách thông báo của khách hàng đang đăng nhập kèm số lượng chưa đọc.
- **Quyền hạn**: Đăng nhập (`requireAuth`).
- **Query params**:
  - `page`: Số trang (mặc định 1).
  - `limit`: Số bản ghi mỗi trang (mặc định 10 hoặc 20).
  - `filter`: Nhóm thông báo (`"all"`, `"orders"`, `"returns"`, `"promotions"`).
  - `unreadOnly`: Boolean (`true` / `false`).

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "6735a1b2c3d4e5f678901234",
        "orderId": "673456789abcdef012345678",
        "type": "order_cancelled",
        "title": "Đơn hàng ORD1794582029 đã bị hủy",
        "message": "Đơn hàng của bạn đã bị hủy do hết hàng trong kho. Nếu đã thanh toán, nhân viên sẽ liên hệ để hoàn tiền.",
        "link": "/orders/673456789abcdef012345678",
        "read": false,
        "createdAt": "2026-11-14T09:30:00.000Z"
      }
    ],
    "unreadCount": 3,
    "total": 12,
    "page": 1,
    "pageSize": 10,
    "totalPages": 2
  }
}
```

---

## 2. PATCH `/api/v1/customer/notifications/:id/read`

- **Mô tả**: Đánh dấu 1 thông báo cụ thể là đã đọc.
- **Quyền hạn**: Đăng nhập (`requireAuth`), chỉ được đánh dấu thông báo của chính mình (`userId === req.user._id`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "6735a1b2c3d4e5f678901234",
    "read": true
  }
}
```

---

## 3. POST `/api/v1/customer/notifications/read-all`

- **Mô tả**: Đánh dấu tất cả thông báo của khách hàng là đã đọc.
- **Quyền hạn**: Đăng nhập (`requireAuth`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "modifiedCount": 3
  }
}
```

