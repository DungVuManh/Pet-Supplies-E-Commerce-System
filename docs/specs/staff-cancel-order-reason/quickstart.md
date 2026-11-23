# Quickstart Guide: Kiểm Thử Luồng Nhân Viên Hủy Đơn Kèm Lý Do

**Feature**: `staff-cancel-order-reason`  
**Context**: [spec.md](./spec.md)

---

## 1. Kiểm thử tự động (Unit / Integration Tests)

### Backend Tests
Chạy bộ kiểm thử backend cho cập nhật trạng thái đơn hàng:
```powershell
cmd /c "npm.cmd --prefix backend test -- tests/staff-orders.test.js"
```

Kịch bản kiểm thử mới cần thêm:
1. Gửi request `PATCH /api/v1/staff/orders/:id/status` với `orderStatus: "cancelled"` nhưng **không có** `cancellationReason` -> Kỳ vọng trả về `400 VALIDATION_ERROR`.
2. Gửi request kèm `cancellationReason: "Hết hàng / Tồn kho không đủ"` và `cancellationNote: "Ghi chú kiểm thử"` -> Kỳ vọng trả về `200 OK`, bản ghi trong DB có `cancellationReason` và `cancellationNote`.

### Frontend Tests & Typecheck
Chạy lint và build kiểm tra frontend:
```powershell
cmd /c "npm.cmd --prefix frontend test"
cmd /c "npm.cmd --prefix frontend run build"
```

---

## 2. Kiểm thử thủ công trên trình duyệt (Manual Verification)

1. **Khởi động hệ thống**:
   ```powershell
   npm run dev
   ```
2. **Đăng nhập quyền Staff**:
   - Truy cập `/login`, đăng nhập tài khoản nhân viên.
   - Chuyển đến `/staff/orders`, chọn một đơn hàng đang ở trạng thái **Chờ xử lý** (`pending`) hoặc **Đã xác nhận** (`confirmed`).
3. **Thao tác hủy đơn với lý do định sẵn**:
   - Tại phần *Cập nhật trạng thái*, chọn trạng thái tiếp theo là **Đã hủy**.
   - Quan sát giao diện: Form lý do hủy xuất hiện.
   - Chọn một lý do (ví dụ: *"Hết hàng / Tồn kho không đủ"*).
   - Bấm *Cập nhật trạng thái* -> *Xác nhận hủy đơn hàng*.
   - Kiểm tra thông báo thành công và đơn hàng chuyển sang trạng thái *Đã hủy*, hiển thị lý do hủy.
4. **Thao tác hủy đơn với lý do tự nhập ("Khác")**:
   - Mở một đơn khác, chọn chuyển sang **Đã hủy**.
   - Chọn lý do *"Khác (tự nhập lý do)"*.
   - Để trống ô nhập -> xác minh hệ thống báo lỗi không cho gửi.
   - Nhập nội dung: *"Hàng bị lỗi móp méo trong kho"* -> bấm xác nhận.
   - Kiểm tra đơn được hủy thành công với lý do tự nhập.
5. **Kiểm tra từ góc nhìn khách hàng**:
   - Đăng nhập tài khoản khách hàng sở hữu đơn đó, truy cập `/orders/[id]`.
   - Xác minh trên màn hình chi tiết đơn hàng của khách hàng hiển thị đúng lý do hủy mà nhân viên vừa chọn/nhập.

