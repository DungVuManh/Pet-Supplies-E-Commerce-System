# API & UI Contracts: Nhân Viên Hủy Đơn Hàng

**Feature**: `staff-cancel-order-reason`  
**Context**: [spec.md](../spec.md) | [data-model.md](../data-model.md)

---

## 1. Staff Update Order Status API Contract

- **Endpoint**: `PATCH /api/v1/staff/orders/:id/status`
- **Authentication**: Required (`role: "staff"`)
- **Headers**:
  - `Content-Type: application/json`
  - `x-csrf-token`: `<CSRF_TOKEN>`

### Request Body (Khi hủy đơn)

```json
{
  "expectedStatus": "pending",
  "orderStatus": "cancelled",
  "cancellationReason": "Hết hàng / Tồn kho không đủ",
  "cancellationNote": "Kho báo sản phẩm Dr. Clauder's đã hết date mới"
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "673456789abcdef012345678",
      "orderStatus": "cancelled"
    }
  }
}
```

### Error Responses

1. **Thiếu lý do hủy khi chọn cancelled (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Vui lòng chọn hoặc nhập lý do hủy đơn hàng.",
  "error": {
    "code": "VALIDATION_ERROR"
  }
}
```

2. **Xung đột trạng thái đơn hàng (409 Conflict)**:
```json
{
  "success": false,
  "message": "Trạng thái đơn đã thay đổi. Hãy tải lại đơn hàng.",
  "error": {
    "code": "ORDER_STATUS_CONFLICT"
  }
}
```

---

## 2. UI Component Contract: `OrderStatusAction`

### Component: `frontend/features/staff/components/order-status-action.tsx`

- **Khi `nextStatus === "cancelled"`**:
  - Hiển thị dropdown hoặc radio selection với 5 lý do chuẩn:
    1. `"Hết hàng / Tồn kho không đủ"`
    2. `"Không thể giao tới địa chỉ người mua"`
    3. `"Người mua yêu cầu hủy"`
    4. `"Không liên lạc được với người mua"`
    5. `"other"` (*"Khác (tự nhập lý do)"*)
  - Nếu chọn `"other"`: Hiển thị `<textarea>` bắt buộc nhập lý do tự viết (5 - 200 ký tự).
  - Hiển thị trường ghi chú bổ sung (tùy chọn, tối đa 500 ký tự).
  - Nút Submit chuyển sang màu đỏ (hoặc tone cảnh báo) với nhãn: **"Xác nhận hủy đơn hàng"**.

